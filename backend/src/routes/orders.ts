import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { debitRetailer, creditRetailer } from '../services/ledgerService';
import { io } from '../index';

const router = Router();
router.use(authenticate);

// GET /api/orders — List orders
router.get('/', async (req, res) => {
  try {
    const { status, retailer_id } = req.query as Record<string, string>;
    let where: any = {};

    // Retailer can only see their own orders
    if (req.user!.role === 'RETAILER') {
      where.retailer_id = req.user!.retailer_id;
    } else {
      // Wholesaler sees orders for their wholesaler_id
      where.wholesaler_id = req.user!.wholesaler_id;
      if (retailer_id) where.retailer_id = retailer_id;
    }

    if (status && status !== 'ALL') where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { medicine: { select: { expiry_date: true } } } },
        wholesaler: { select: { id: true, name: true, phone: true } },
        retailer:  { select: { id: true, name: true, shop_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    // Flatten medicine.expiry_date into each item
    const result = orders.map((o: any) => ({
      ...o,
      items: o.items.map((item: any) => ({
        ...item,
        expiry_date: item.medicine?.expiry_date ?? null,
        medicine: undefined,
      })),
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — Single order with items
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, retailer: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.wholesaler_id !== req.user!.wholesaler_id) return res.status(403).json({ error: 'Forbidden' });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — Place new order (retailer)
router.post('/', requireRole('RETAILER'), async (req, res) => {
  try {
    const { wholesaler_id, items } = req.body;
    const retailer = await prisma.retailer.findUnique({ where: { id: req.user!.retailer_id! } });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });
    if (!retailer.is_active) return res.status(403).json({ error: 'Account is inactive' });

    // Calculate totals
    let subTotal = 0;
    const orderItems = items.map((i: any) => {
      const taxable = i.unit_price * i.qty;
      const tax = taxable * (i.gst_rate / 100);
      subTotal += taxable;
      return {
        medicine_id: i.medicine_id,
        medicine_name: i.medicine_name,
        qty: i.qty,
        mrp: i.mrp,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent || 0,
        discount_amount: i.discount_amount || 0,
        total_price: taxable + tax,
        hsn_code: i.hsn_code,
        gst_rate: i.gst_rate,
        taxable_value: taxable,
        tax_amount: tax,
      };
    });
    const taxTotal = subTotal * 0.12;

    // Credit limit check (skip for self-registered retailers with no credit limit)
    if (retailer.credit_limit > 0 && retailer.current_balance + subTotal + taxTotal > retailer.credit_limit) {
      return res.status(422).json({
        error: 'Credit limit exceeded',
        available: Math.max(0, retailer.credit_limit - retailer.current_balance),
      });
    }

    const order = await prisma.order.create({
      data: {
        wholesaler_id: wholesaler_id || retailer.wholesaler_id,
        retailer_id: retailer.id,
        retailer_name: retailer.shop_name,
        sub_total: subTotal,
        tax_total: taxTotal,
        total_amount: subTotal + taxTotal,
        payment_terms: 'NET 15',
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        wholesaler_id: order.wholesaler_id,
        retailer_id: retailer.id,
        type: 'NEW_ORDER',
        title: 'New Order Received',
        body: `${retailer.shop_name} placed an order for ₹${order.total_amount.toFixed(0)}`,
      },
    });

    // Emit real-time event to wholesaler room
    io.to(`wholesaler_${order.wholesaler_id}`).emit('new_order', order);

    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status — Update order status (wholesaler)
router.patch('/:id/status', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { status, payment_amount, payment_method } = req.body;
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // ── Stock availability check before ACCEPTING ───────────────────────
    if (status === 'ACCEPTED' && order.status === 'PENDING') {
      const medicines = await prisma.medicine.findMany({
        where: {
          id: { in: order.items.map((i) => i.medicine_id) },
          wholesaler_id: req.user!.wholesaler_id!,
        },
        select: { id: true, name: true, stock_qty: true },
      });

      const stockMap = new Map(medicines.map((m) => [m.id, m]));
      const outOfStock = order.items.filter((item) => {
        const med = stockMap.get(item.medicine_id);
        return !med || med.stock_qty < item.qty;
      });

      if (outOfStock.length > 0) {
        const names = outOfStock.map((i) => {
          const med = stockMap.get(i.medicine_id);
          return `${med?.name || i.medicine_name} (need ${i.qty}, have ${med?.stock_qty ?? 0})`;
        });
        return res.status(422).json({
          error: `Insufficient stock for: ${names.join('; ')}`,
          out_of_stock: outOfStock.map((i) => i.medicine_id),
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────

    let invoice_no = order.invoice_no;
    if (status === 'ACCEPTED' && !invoice_no) {
      invoice_no = `INV/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status, invoice_no, updated_at: new Date() },
      include: { items: true },
    });

    // ── Stock management ────────────────────────────────────────────────
    // ACCEPTED (from PENDING): deduct stock for each ordered item
    if (status === 'ACCEPTED' && order.status === 'PENDING') {
      await Promise.all(
        order.items.map((item) =>
          prisma.medicine.updateMany({
            where: {
              id: item.medicine_id,
              wholesaler_id: req.user!.wholesaler_id!,
              stock_qty: { gte: 0 }, // allow going to 0 but not below enforced here
            },
            data: { stock_qty: { decrement: item.qty } },
          })
        )
      );
    }

    // REJECTED (from ACCEPTED): restore stock
    if (status === 'REJECTED' && order.status === 'ACCEPTED') {
      await Promise.all(
        order.items.map((item) =>
          prisma.medicine.updateMany({
            where: { id: item.medicine_id, wholesaler_id: req.user!.wholesaler_id! },
            data: { stock_qty: { increment: item.qty } },
          })
        )
      );
    }
    // ────────────────────────────────────────────────────────────────────

    // On DELIVERED — debit retailer
    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      const { newBalance } = await debitRetailer(
        order.wholesaler_id,
        order.retailer_id,
        order.total_amount,
        order.id,
        `Invoice #${invoice_no || order.id}`
      );

      // Credit limit notification
      const retailer = await prisma.retailer.findUnique({ where: { id: order.retailer_id } });
      if (retailer && retailer.credit_limit > 0 && newBalance / retailer.credit_limit > 0.8) {
        const notification = await prisma.notification.create({
          data: {
            wholesaler_id: order.wholesaler_id,
            retailer_id: order.retailer_id,
            type: 'CREDIT_LIMIT_ALERT',
            title: 'Credit Limit Alert',
            body: `${retailer.shop_name} has used ${Math.round((newBalance / retailer.credit_limit) * 100)}% of their credit limit.`,
          },
        });
        io.to(`wholesaler_${order.wholesaler_id}`).emit('notification', notification);
      }

      // If paid immediately at delivery
      if (payment_amount && payment_method) {
        const payment = await prisma.payment.create({
          data: {
            wholesaler_id: order.wholesaler_id,
            retailer_id: order.retailer_id,
            retailer_name: order.retailer_name,
            amount: payment_amount,
            method: payment_method,
            status: 'COMPLETED',
            notes: `Immediate payment for Order #${order.id}`,
          },
        });
        await creditRetailer(
          order.wholesaler_id,
          order.retailer_id,
          payment_amount,
          payment.id,
          `Payment Received (${payment_method})`
        );
        // Notify
        await prisma.notification.create({
          data: {
            wholesaler_id: order.wholesaler_id,
            retailer_id: order.retailer_id,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received',
            body: `₹${payment_amount} received via ${payment_method} from ${order.retailer_name}`,
          },
        });
      }
    }

    // Notification for retailer
    await prisma.notification.create({
      data: {
        wholesaler_id: order.wholesaler_id,
        retailer_id: order.retailer_id,
        type: 'ORDER_STATUS_CHANGED',
        title: `Order ${status.charAt(0) + status.toLowerCase().slice(1)}`,
        body: `Your order #${updated.invoice_no || order.id} is now ${status.toLowerCase()}`,
      },
    });

    // Real-time events
    io.to(`wholesaler_${order.wholesaler_id}`).emit('order_updated', updated);
    io.to(`retailer_${order.retailer_id}`).emit('order_updated', updated);

    res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/cancel — Retailer cancels a pending order
router.post('/:id/cancel', requireRole('RETAILER'), async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, retailer_id: req.user!.retailer_id! },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PENDING') return res.status(422).json({ error: 'Only pending orders can be cancelled' });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', updated_at: new Date() },
      include: { items: true },
    });

    // PENDING orders have no stock deducted yet, so no restore needed.
    // (Stock is only deducted on ACCEPTED.)

    io.to(`wholesaler_${order.wholesaler_id}`).emit('order_updated', updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
