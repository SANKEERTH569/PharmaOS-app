import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { debitRetailer, creditRetailer } from '../services/ledgerService';
import { syncMedicineTotals } from './medicines';
import { io } from '../index';

async function deductStockFifo(medicine_id: string, qty: number, wholesaler_id: string) {
  const batches = await prisma.medicineBatch.findMany({
    where: { medicine_id, stock_qty: { gt: 0 } },
    orderBy: { expiry_date: 'asc' },
  });

  let remaining = qty;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.stock_qty, remaining);
    await prisma.medicineBatch.update({
      where: { id: batch.id },
      data: { stock_qty: { decrement: deduct } },
    });
    remaining -= deduct;
  }
  await syncMedicineTotals(medicine_id, wholesaler_id);
}

async function restoreStock(medicine_id: string, qty: number, wholesaler_id: string) {
  const lastBatch = await prisma.medicineBatch.findFirst({
    where: { medicine_id },
    orderBy: { expiry_date: 'desc' },
  });

  if (lastBatch) {
    await prisma.medicineBatch.update({
      where: { id: lastBatch.id },
      data: { stock_qty: { increment: qty } },
    });
  } else {
    await prisma.medicineBatch.create({
      data: {
        medicine_id,
        batch_no: `RESTORE-${Date.now().toString().slice(-6)}`,
        expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
        stock_qty: qty,
      }
    });
  }
  await syncMedicineTotals(medicine_id, wholesaler_id);
}

const router = Router();
router.use(authenticate);

// GET /api/orders — List orders
router.get('/', async (req, res) => {
  try {
    const { status, retailer_id } = req.query as Record<string, string>;
    let where: any = {};

    if (req.user!.role === 'RETAILER') {
      if (!req.user!.retailer_id) {
        return res.status(401).json({ error: 'Retailer context missing in token' });
      }
      where.retailer_id = req.user!.retailer_id;
    } else if (req.user!.role === 'WHOLESALER' || req.user!.role === 'SALESMAN') {
      if (!req.user!.wholesaler_id) {
        return res.status(403).json({ error: 'No wholesaler linked to this account yet' });
      }
      where.wholesaler_id = req.user!.wholesaler_id;
      if (retailer_id) where.retailer_id = retailer_id;
    } else {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }

    if (status && status !== 'ALL') where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { medicine: { select: { expiry_date: true } } } },
        wholesaler: { select: { id: true, name: true, phone: true } },
        retailer: { select: { id: true, name: true, shop_name: true } },
        salesman: { select: { id: true, name: true } },
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

    if (req.user!.role === 'RETAILER') {
      if (order.retailer_id !== req.user!.retailer_id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (req.user!.role === 'WHOLESALER' || req.user!.role === 'SALESMAN') {
      if (!req.user!.wholesaler_id || order.wholesaler_id !== req.user!.wholesaler_id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }

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
      const discountAmt = i.discount_percent ? (i.unit_price * i.qty * i.discount_percent / 100) : (i.discount_amount || 0);
      const taxable = i.unit_price * i.qty - discountAmt;
      const gstRate = parseFloat(i.gst_rate) || 12;
      const tax = taxable * (gstRate / 100);
      subTotal += taxable;
      return {
        medicine_id: i.medicine_id,
        medicine_name: i.medicine_name,
        qty: i.qty,
        mrp: i.mrp,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent || 0,
        discount_amount: discountAmt,
        total_price: taxable + tax,
        hsn_code: i.hsn_code || '3004',
        gst_rate: gstRate,
        taxable_value: taxable,
        tax_amount: tax,
      };
    });
    const taxTotal = orderItems.reduce((s: number, i: any) => s + i.tax_amount, 0);

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
    const notification = await prisma.notification.create({
      data: {
        wholesaler_id: order.wholesaler_id,
        retailer_id: retailer.id,
        type: 'NEW_ORDER',
        title: 'New Order Received',
        body: `${retailer.shop_name} placed an order for ₹${order.total_amount.toFixed(0)}`,
      },
    });

    // Emit real-time events to wholesaler room
    io.to(`wholesaler_${order.wholesaler_id}`).emit('new_order', order);
    io.to(`wholesaler_${order.wholesaler_id}`).emit('notification', notification);

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
      // Sequential invoice number per wholesaler per year
      const year = new Date().getFullYear();
      const count = await prisma.order.count({
        where: {
          wholesaler_id: req.user!.wholesaler_id!,
          invoice_no: { startsWith: `INV/${year}/` },
        },
      });
      invoice_no = `INV/${year}/${String(count + 1).padStart(4, '0')}`;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status, invoice_no, updated_at: new Date() },
      include: {
        items: { include: { medicine: { select: { expiry_date: true } } } },
        wholesaler: { select: { id: true, name: true, phone: true } },
        retailer: { select: { id: true, name: true, shop_name: true } },
      },
    });

    // Flatten expiry_date into items like GET endpoint
    const result: any = {
      ...updated,
      items: updated.items.map((item: any) => ({
        ...item,
        expiry_date: item.medicine?.expiry_date ?? null,
        medicine: undefined,
      })),
    };

    // ── Stock management ────────────────────────────────────────────────
    // ACCEPTED (from PENDING): deduct stock for each ordered item using FIFO
    if (status === 'ACCEPTED' && order.status === 'PENDING') {
      for (const item of order.items) {
        await deductStockFifo(item.medicine_id, item.qty, req.user!.wholesaler_id!);
      }
    }

    // REJECTED (from ACCEPTED): restore stock
    if (status === 'REJECTED' && order.status === 'ACCEPTED') {
      for (const item of order.items) {
        await restoreStock(item.medicine_id, item.qty, req.user!.wholesaler_id!);
      }
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
        body: `Your order #${result.invoice_no || order.id} is now ${status.toLowerCase()}`,
      },
    });

    // Real-time events
    io.to(`wholesaler_${order.wholesaler_id}`).emit('order_updated', result);
    io.to(`retailer_${order.retailer_id}`).emit('order_updated', result);

    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/mr-order — MR (SALESMAN) places order on behalf of a retailer
router.post('/mr-order', async (req, res) => {
  if (req.user!.role !== 'SALESMAN') return res.status(403).json({ error: 'Only salesmen can place MR orders' });
  try {
    const { retailer_id, items, notes, lat, lng, wholesaler_id: requested_wholesaler_id } = req.body;
    if (!retailer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'retailer_id and items[] are required' });
    }

    const salesman_id = req.user!.salesman_id!;
    // Default to the user's current wholesaler_id, but allow them to swap to another they are linked to
    let wholesaler_id = requested_wholesaler_id || req.user!.wholesaler_id!;
    
    // Safety check if they requested a specific wholesaler
    if (requested_wholesaler_id && requested_wholesaler_id !== req.user!.wholesaler_id!) {
      const link = await prisma.salesmanWholesalerLink.findUnique({
        where: { salesman_id_wholesaler_id: { salesman_id, wholesaler_id: requested_wholesaler_id } }
      });
      if (!link || link.status !== 'APPROVED') {
        return res.status(403).json({ error: 'You are not an approved salesman for this wholesaler' });
      }
    }

    const retailer = await prisma.retailer.findUnique({ where: { id: retailer_id } });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });

    // Calculate order totals
    let subTotal = 0;
    const orderItems = items.map((i: any) => {
      const discountAmt = i.discount_percent ? (i.unit_price * i.qty * i.discount_percent / 100) : (i.discount_amount || 0);
      const taxable = i.unit_price * i.qty - discountAmt;
      const gstRate = parseFloat(i.gst_rate) || 12;
      const tax = taxable * (gstRate / 100);
      subTotal += taxable;
      return {
        medicine_id: i.medicine_id,
        medicine_name: i.medicine_name,
        qty: i.qty,
        mrp: i.mrp,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent || 0,
        discount_amount: discountAmt,
        total_price: taxable + tax,
        hsn_code: i.hsn_code || '3004',
        gst_rate: gstRate,
        taxable_value: taxable,
        tax_amount: tax,
      };
    });
    const taxTotal = orderItems.reduce((s: number, i: any) => s + i.tax_amount, 0);
    const totalAmount = subTotal + taxTotal;

    // Create the order tagged with salesman_id
    const order = await prisma.order.create({
      data: {
        wholesaler_id,
        retailer_id: retailer.id,
        retailer_name: retailer.shop_name,
        salesman_id,
        sub_total: subTotal,
        tax_total: taxTotal,
        total_amount: totalAmount,
        payment_terms: 'NET 15',
        status: 'PENDING_RETAILER', // Awaiting retailer confirmation
        notes: notes ? `[MR Order] ${notes}` : '[MR Order] Placed by company field rep',
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Auto-log a DailyCallReport for this visit
    await prisma.dailyCallReport.create({
      data: {
        wholesaler_id,
        salesman_id,
        retailer_id: retailer.id,
        visit_date: new Date(),
        outcome: 'ORDER_TAKEN',
        order_id: order.id,
        lat: lat || null,
        lng: lng || null,
        notes: notes || null,
      },
    });

    const salesman = await prisma.salesman.findUnique({ where: { id: salesman_id }, select: { name: true } });

    const notification = await prisma.notification.create({
      data: {
        wholesaler_id,
        retailer_id: retailer.id,
        type: 'NEW_ORDER',
        title: 'New MR Order Pending',
        body: `${salesman?.name || 'Field Rep'} placed an order worth ₹${totalAmount.toFixed(0)}`,
      },
    });

    io.to(`wholesaler_${wholesaler_id}`).emit('new_order', order);
    io.to(`wholesaler_${wholesaler_id}`).emit('notification', notification);

    // Notify retailer that an MR placed an order
    const retNotif = await prisma.notification.create({
      data: {
        wholesaler_id,
        retailer_id: retailer.id,
        title: 'New MR Order Pending',
        body: `${salesman?.name || 'A field rep'} placed an order worth ₹${totalAmount.toLocaleString()}. Please review and confirm it.`,
        type: 'NEW_ORDER',
      },
    });
    io.to(`retailer_${retailer.id}`).emit('notification', retNotif);

    res.status(201).json(order);
  } catch (error: any) {
    console.error('MR Quick Order API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to place MR order' });
  }
});

// PATCH /api/orders/:id/retailer-confirm — Retailer confirms an MR order
router.patch('/:id/retailer-confirm', async (req, res) => {
  if (req.user!.role !== 'RETAILER') return res.status(403).json({ error: 'Forbidden' });
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, retailer_id: req.user!.retailer_id!, status: 'PENDING_RETAILER' },
      include: { salesman: true, wholesaler: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found or not in pending confirmation state' });

    // Update to PENDING (now moves to Sub-wholesaler's main queue)
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PENDING' },
    });

    // Notify sub-wholesaler
    const sysNotif = await prisma.notification.create({
      data: {
        wholesaler_id: order.wholesaler_id,
        title: 'MR Order Confirmed',
        body: `${order.retailer_name} confirmed the order placed by ${order.salesman?.name || 'MR'} - ₹${order.total_amount.toLocaleString()}`,
        type: 'ORDER_STATUS_CHANGED',
      },
    });
    io.to(`wholesaler_${order.wholesaler_id}`).emit('notification', sysNotif);

    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/orders/:id/retailer-reject — Retailer rejects an MR order
router.patch('/:id/retailer-reject', async (req, res) => {
  if (req.user!.role !== 'RETAILER') return res.status(403).json({ error: 'Forbidden' });
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, retailer_id: req.user!.retailer_id!, status: 'PENDING_RETAILER' },
      include: { salesman: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found or not in pending confirmation state' });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'REJECTED' },
    });

    // Notify sub-wholesaler that MR order was rejected
    const sysNotif = await prisma.notification.create({
      data: {
        wholesaler_id: order.wholesaler_id,
        title: 'MR Order Rejected',
        body: `${order.retailer_name} rejected the order placed by ${order.salesman?.name || 'MR'}.`,
        type: 'ORDER_STATUS_CHANGED',
      },
    });
    io.to(`wholesaler_${order.wholesaler_id}`).emit('notification', sysNotif);

    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders/quick-sale — Wholesaler creates a sale (auto-accepted with invoice)
router.post('/quick-sale', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { retailer_id, items, notes } = req.body;
    const wholesaler_id = req.user!.wholesaler_id!;

    if (!retailer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'retailer_id and items[] are required' });
    }

    const retailer = await prisma.retailer.findUnique({ where: { id: retailer_id } });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });

    // Calculate totals
    let subTotal = 0;
    const orderItems = items.map((i: any) => {
      const discountAmt = i.discount_percent ? (i.unit_price * i.qty * i.discount_percent / 100) : (i.discount_amount || 0);
      const taxable = i.unit_price * i.qty - discountAmt;
      const gstRate = parseFloat(i.gst_rate) || 12;
      const tax = taxable * (gstRate / 100);
      subTotal += taxable;
      return {
        medicine_id: i.medicine_id,
        medicine_name: i.medicine_name,
        qty: i.qty,
        mrp: i.mrp,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent || 0,
        discount_amount: discountAmt,
        total_price: taxable + tax,
        hsn_code: i.hsn_code || '3004',
        gst_rate: gstRate,
        taxable_value: taxable,
        tax_amount: tax,
      };
    });
    const taxTotal = orderItems.reduce((s: number, i: any) => s + i.tax_amount, 0);
    const totalAmount = subTotal + taxTotal;

    // Credit limit check
    if (retailer.credit_limit > 0 && retailer.current_balance + totalAmount > retailer.credit_limit) {
      return res.status(422).json({
        error: 'Credit limit exceeded',
        available: Math.max(0, retailer.credit_limit - retailer.current_balance),
      });
    }

    // Stock check
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: items.map((i: any) => i.medicine_id) }, wholesaler_id },
      select: { id: true, name: true, stock_qty: true },
    });
    const stockMap = new Map(medicines.map(m => [m.id, m]));
    const outOfStock = items.filter((i: any) => {
      const med = stockMap.get(i.medicine_id);
      return !med || med.stock_qty < i.qty;
    });
    if (outOfStock.length > 0) {
      const names = outOfStock.map((i: any) => {
        const med = stockMap.get(i.medicine_id);
        return `${med?.name || i.medicine_name} (need ${i.qty}, have ${med?.stock_qty ?? 0})`;
      });
      return res.status(422).json({ error: `Insufficient stock: ${names.join('; ')}` });
    }

    // Generate sequential invoice number
    const year = new Date().getFullYear();
    const invoiceCount = await prisma.order.count({
      where: {
        wholesaler_id,
        invoice_no: { startsWith: `INV/${year}/` },
      },
    });
    const invoice_no = `INV/${year}/${String(invoiceCount + 1).padStart(4, '0')}`;

    // Create order as ACCEPTED
    const order = await prisma.order.create({
      data: {
        wholesaler_id,
        retailer_id,
        retailer_name: retailer.shop_name,
        status: 'ACCEPTED',
        invoice_no,
        sub_total: subTotal,
        tax_total: taxTotal,
        total_amount: totalAmount,
        payment_terms: req.body.payment_terms || 'NET 15',
        notes: notes || 'Quick Sale by Wholesaler',
        items: { create: orderItems },
      },
      include: { items: true, retailer: { select: { id: true, name: true, shop_name: true } } },
    });

    // Deduct stock via FIFO
    for (const item of items) {
      await deductStockFifo(item.medicine_id, item.qty, wholesaler_id);
    }

    // Notify retailer
    const notification = await prisma.notification.create({
      data: {
        wholesaler_id,
        retailer_id,
        type: 'NEW_ORDER',
        title: 'New Sale Created',
        body: `Your wholesaler created a sale of ₹${totalAmount.toFixed(0)} (Invoice: ${invoice_no})`,
      },
    });

    io.to(`wholesaler_${wholesaler_id}`).emit('new_order', order);
    io.to(`retailer_${retailer_id}`).emit('new_order', order);
    io.to(`retailer_${retailer_id}`).emit('notification', notification);

    res.status(201).json(order);
  } catch (err: any) {
    console.error('quick-sale error:', err);
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

// POST /api/orders/:id/remove-item — Wholesaler removes an item from an order
router.post('/:id/remove-item', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id is required' });

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
      include: { items: true, retailer: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PENDING' && order.status !== 'ACCEPTED') {
      return res.status(422).json({ error: 'Can only remove items from PENDING or ACCEPTED orders' });
    }

    const itemToRemove = order.items.find(i => i.id === item_id);
    if (!itemToRemove) return res.status(404).json({ error: 'Item not found in this order' });

    // If order was ACCEPTED, we need to restore stock for this item
    if (order.status === 'ACCEPTED') {
      await restoreStock(itemToRemove.medicine_id, itemToRemove.qty, req.user!.wholesaler_id!);
    }

    // Delete the OrderItem
    await prisma.orderItem.delete({
      where: { id: item_id },
    });

    // Check if it was the last item
    if (order.items.length === 1) {
      // It was the last item, cancel the entire order
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          updated_at: new Date(),
          sub_total: 0,
          tax_total: 0,
          total_amount: 0,
          notes: order.notes ? `${order.notes}\n[System: Auto-cancelled as last item was removed]` : '[System: Auto-cancelled as last item was removed]'
        },
        include: {
          items: { include: { medicine: { select: { expiry_date: true } } } },
          wholesaler: { select: { id: true, name: true, phone: true } },
          retailer: { select: { id: true, name: true, shop_name: true } },
        },
      });

      // Flatten expiry_date
      const result: any = {
        ...updatedOrder,
        items: updatedOrder.items.map((item: any) => ({
          ...item,
          expiry_date: item.medicine?.expiry_date ?? null,
          medicine: undefined,
        })),
      };

      await prisma.notification.create({
        data: {
          wholesaler_id: order.wholesaler_id,
          retailer_id: order.retailer_id,
          type: 'ORDER_STATUS_CHANGED',
          title: 'Order Cancelled',
          body: `Your order #${result.invoice_no || order.id} has been cancelled because all items were removed.`,
        },
      });

      io.to(`wholesaler_${order.wholesaler_id}`).emit('order_updated', result);
      io.to(`retailer_${order.retailer_id}`).emit('order_updated', result);

      return res.json(result);
    }

    // Calculate new totals from remaining items
    const remainingItems = order.items.filter(i => i.id !== item_id);
    let newSubTotal = 0;
    let newTaxTotal = 0;

    remainingItems.forEach(i => {
      newSubTotal += i.taxable_value;
      newTaxTotal += i.tax_amount;
    });

    const newTotalAmount = newSubTotal + newTaxTotal;

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        sub_total: newSubTotal,
        tax_total: newTaxTotal,
        total_amount: newTotalAmount,
        updated_at: new Date(),
      },
      include: {
        items: { include: { medicine: { select: { expiry_date: true } } } },
        wholesaler: { select: { id: true, name: true, phone: true } },
        retailer: { select: { id: true, name: true, shop_name: true } },
      },
    });

    // Flatten expiry_date
    const result: any = {
      ...updatedOrder,
      items: updatedOrder.items.map((item: any) => ({
        ...item,
        expiry_date: item.medicine?.expiry_date ?? null,
        medicine: undefined,
      })),
    };

    // Notify retailer about item removal
    await prisma.notification.create({
      data: {
        wholesaler_id: order.wholesaler_id,
        retailer_id: order.retailer_id,
        type: 'ORDER_STATUS_CHANGED',
        title: 'Order Updated',
        body: `An item (${itemToRemove.medicine_name}) was removed from your order #${result.invoice_no || order.id}. New total: ₹${newTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      },
    });

    io.to(`wholesaler_${order.wholesaler_id}`).emit('order_updated', result);
    io.to(`retailer_${order.retailer_id}`).emit('order_updated', result);

    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
