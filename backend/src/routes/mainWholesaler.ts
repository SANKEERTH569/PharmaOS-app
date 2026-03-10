import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { debitWholesaler, creditWholesaler } from '../services/mainWholesalerLedgerService';

const router = Router();

/**
 * GET /api/main-wholesalers/list
 * Public – list all active main wholesalers (for sub-wholesalers to discover and link POs)
 */
router.get('/list', async (req, res) => {
  try {
    const { q } = req.query as { q?: string };

    const mws = await prisma.mainWholesaler.findMany({
      where: {
        is_active: true,
        ...(q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        } : {}),
      },
      select: { id: true, name: true, phone: true, address: true, gstin: true },
      orderBy: { name: 'asc' },
      take: 20,
    });

    return res.json(mws);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/main-wholesalers/:id/medicines
 * Public - get catalog for a specific main wholesaler
 */
router.get('/:id/medicines', async (req, res) => {
  try {
    const { id } = req.params;
    const { q } = req.query as { q?: string };

    const medicines = await prisma.mainWholesalerMedicine.findMany({
      where: {
        main_wholesaler_id: id,
        is_active: true,
        ...(q ? { medicine_name: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: {
        schemes: {
          where: { is_active: true }
        }
      },
      orderBy: { medicine_name: 'asc' },
    });

    return res.json(medicines);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// All routes below require MAIN_WHOLESALER auth
router.use(authenticate, requireRole('MAIN_WHOLESALER'));

/**
 * GET /api/main-wholesalers/sub-wholesalers
 * List all sub-wholesalers that have ordered from this main wholesaler
 */
router.get('/sub-wholesalers', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const wholesalers = await prisma.wholesaler.findMany({
      where: {
        supply_orders: {
          some: { main_wholesaler_id: mwId }
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        gstin: true,
        dl_number: true,
        email: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { name: 'asc' }
    });

    // Default credit_limit/balance to conform to the UI shape for now
    const mapped = wholesalers.map(w => ({
      ...w,
      shop_name: w.name, // Usually wholesalers just have 'name'
      credit_limit: 0,
      current_balance: 0,
    }));

    return res.json(mapped);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/main-wholesalers/supply-orders
 * List incoming supply orders (optionally filter by status)
 */
router.get('/supply-orders', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const { status } = req.query as { status?: string };

    const orders = await prisma.supplyOrder.findMany({
      where: {
        main_wholesaler_id: mwId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        items: true,
        wholesaler: { select: { id: true, name: true, phone: true, address: true, gstin: true } },
        purchase_order: { select: { id: true, po_number: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json(orders);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/main-wholesalers/supply-orders/:id
 * Get single supply order detail
 */
router.get('/supply-orders/:id', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const order = await prisma.supplyOrder.findFirst({
      where: { id: req.params.id, main_wholesaler_id: mwId },
      include: {
        items: true,
        wholesaler: { select: { id: true, name: true, phone: true, address: true, gstin: true } },
        purchase_order: { select: { id: true, po_number: true } },
      },
    });

    if (!order) return res.status(404).json({ error: 'Supply order not found' });
    return res.json(order);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/main-wholesalers/supply-orders/:id
 * Update supply order status
 * Valid transitions: PENDING→ACCEPTED, ACCEPTED→DISPATCHED, DISPATCHED→DELIVERED, PENDING|ACCEPTED→CANCELLED
 */
router.patch('/supply-orders/:id', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const { status, notes } = req.body as { status: string; notes?: string };

    // Fetch with items so we can use them for auto-receive on delivery
    const order = await prisma.supplyOrder.findFirst({
      where: { id: req.params.id, main_wholesaler_id: mwId },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ error: 'Supply order not found' });

    const transitions: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['DELIVERED'],
    };

    if (!transitions[order.status]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from ${order.status} to ${status}`,
      });
    }

    const updateData: any = { status };
    if (notes !== undefined) updateData.notes = notes;
    if (status === 'DISPATCHED') updateData.dispatch_date = new Date();
    if (status === 'DELIVERED') updateData.delivered_date = new Date();

    const updated = await prisma.supplyOrder.update({
      where: { id: req.params.id },
      data: updateData,
      include: { items: true, wholesaler: { select: { id: true, name: true, phone: true } } },
    });

    if (status === 'DELIVERED') {
      try {
        await debitWholesaler(
          mwId,
          order.wholesaler_id,
          order.total_amount,
          order.id,
          `Supply order #${order.so_number} delivered`
        );
      } catch (debitErr) {
        console.error('Failed to debit wholesaler:', debitErr);
      }
    }

    // ── Close the loop: auto-mark linked PO as Received when goods are delivered ──
    if (status === 'DELIVERED' && order.purchase_order_id) {
      try {
        const po = await prisma.purchaseOrder.findUnique({
          where: { id: order.purchase_order_id },
          include: { items: true },
        });
        if (po && !['RECEIVED', 'CANCELLED'].includes(po.status)) {
          await prisma.$transaction(async (tx) => {
            for (const soItem of order.items) {
              const poItem = po.items.find(
                (pi) => pi.medicine_name.toLowerCase() === soItem.medicine_name.toLowerCase()
              );
              if (poItem) {
                await tx.pOItem.update({
                  where: { id: poItem.id },
                  data: { qty_received: { increment: soItem.qty_ordered } },
                });
              }
            }
            const refreshed = await tx.pOItem.findMany({ where: { po_id: po.id } });
            const allFulfilled = refreshed.every((i) => i.qty_received >= i.qty_ordered);
            await tx.purchaseOrder.update({
              where: { id: po.id },
              data: { status: allFulfilled ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
            });
          });
        }
      } catch (autoReceiveErr) {
        // Non-fatal — SO update still succeeds even if PO auto-receive fails
        console.error('Auto-receive PO failed:', autoReceiveErr);
      }
    }

    return res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/main-wholesalers/profile
 * Get main wholesaler profile
 */
router.get('/profile', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const mw = await prisma.mainWholesaler.findUnique({
      where: { id: mwId },
      select: { id: true, username: true, name: true, phone: true, address: true, gstin: true, is_active: true, created_at: true },
    });

    if (!mw) return res.status(404).json({ error: 'Not found' });
    return res.json(mw);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/main-wholesalers/profile
 * Update main wholesaler profile fields
 */
router.patch('/profile', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const { name, phone, address, gstin, dl_number } = req.body;
    const data: Record<string, string> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof phone === 'string' && phone.trim()) data.phone = phone.trim();
    if (typeof address === 'string') data.address = address.trim();
    if (typeof gstin === 'string') data.gstin = gstin.trim();
    if (typeof dl_number === 'string') data.dl_number = dl_number.trim();

    const updated = await prisma.mainWholesaler.update({
      where: { id: mwId },
      data,
      select: { id: true, username: true, name: true, phone: true, address: true, gstin: true, dl_number: true, is_active: true, created_at: true },
    });
    return res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/main-wholesalers/medicines
 * Manage (List) own catalog
 */
router.get('/medicines', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const meds = await prisma.mainWholesalerMedicine.findMany({
      where: { main_wholesaler_id: mwId },
      orderBy: { created_at: 'desc' },
    });
    return res.json(meds);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/main-wholesalers/analytics
 * Dashboard analytics: supply order stats, revenue, catalog health, top products
 */
router.get('/analytics', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [soStats, catalogTotal, activeCount, thisMonthRevenue, lastMonthRevenue, topProducts] = await Promise.all([
      prisma.supplyOrder.groupBy({
        by: ['status'],
        where: { main_wholesaler_id: mwId },
        _count: { id: true },
        _sum: { total_amount: true },
      }),
      prisma.mainWholesalerMedicine.count({ where: { main_wholesaler_id: mwId } }),
      prisma.mainWholesalerMedicine.count({ where: { main_wholesaler_id: mwId, is_active: true } }),
      prisma.supplyOrder.aggregate({
        where: { main_wholesaler_id: mwId, status: 'DELIVERED', delivered_date: { gte: thisMonthStart } },
        _sum: { total_amount: true },
      }),
      prisma.supplyOrder.aggregate({
        where: { main_wholesaler_id: mwId, status: 'DELIVERED', delivered_date: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { total_amount: true },
      }),
      prisma.supplyOrderItem.groupBy({
        by: ['medicine_name'],
        where: { supply_order: { main_wholesaler_id: mwId, status: 'DELIVERED' } },
        _sum: { qty_ordered: true, total_price: true },
        orderBy: { _sum: { qty_ordered: 'desc' } },
        take: 10,
      }),
    ]);

    const lowStockCount = await prisma.mainWholesalerMedicine.count({
      where: {
        main_wholesaler_id: mwId,
        is_active: true,
        AND: [{ stock_qty: { not: null } }, { stock_qty: { lt: 10 } }],
      },
    });
    const nearExpiryCount = await prisma.mainWholesalerMedicine.count({
      where: {
        main_wholesaler_id: mwId,
        is_active: true,
        AND: [{ expiry_date: { not: null } }, { expiry_date: { lte: thirtyDaysFromNow } }, { expiry_date: { gte: now } }],
      },
    });

    const statusMap: Record<string, { count: number; revenue: number }> = {};
    for (const s of soStats) {
      statusMap[s.status] = { count: s._count.id, revenue: s._sum.total_amount ?? 0 };
    }
    const totalRevenue = statusMap['DELIVERED']?.revenue ?? 0;

    return res.json({
      supply_orders: {
        total: soStats.reduce((s, x) => s + x._count.id, 0),
        pending: statusMap['PENDING']?.count ?? 0,
        accepted: statusMap['ACCEPTED']?.count ?? 0,
        dispatched: statusMap['DISPATCHED']?.count ?? 0,
        delivered: statusMap['DELIVERED']?.count ?? 0,
        cancelled: statusMap['CANCELLED']?.count ?? 0,
      },
      revenue: {
        total: totalRevenue,
        this_month: thisMonthRevenue._sum.total_amount ?? 0,
        last_month: lastMonthRevenue._sum.total_amount ?? 0,
      },
      catalog: { total: catalogTotal, active: activeCount, low_stock: lowStockCount, near_expiry: nearExpiryCount },
      top_products: topProducts.map(p => ({
        medicine_name: p.medicine_name,
        total_qty: p._sum.qty_ordered ?? 0,
        total_revenue: p._sum.total_price ?? 0,
      })),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/main-wholesalers/medicines
 * Add new medicine to own catalog
 */
router.post('/medicines', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const { medicine_name, brand, mrp, price, stock_qty, expiry_date, is_active, gst_rate, hsn_code, unit_type } = req.body;

    if (!medicine_name || !price) {
      return res.status(400).json({ error: 'Medicine name and price are required' });
    }

    const med = await prisma.mainWholesalerMedicine.create({
      data: {
        main_wholesaler_id: mwId,
        medicine_name: medicine_name.trim(),
        brand: brand?.trim() || null,
        mrp: mrp ? parseFloat(mrp) : null,
        price: parseFloat(price),
        stock_qty: stock_qty != null && stock_qty !== '' ? parseInt(stock_qty) : null,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        gst_rate: gst_rate != null ? parseFloat(gst_rate) : 12,
        hsn_code: hsn_code?.trim() || '3004',
        unit_type: unit_type?.trim() || 'strip',
        is_active: is_active ?? true,
      },
    });

    return res.status(201).json(med);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Medicine already exists in catalog' });
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/main-wholesalers/medicines/:id
 * Update medicine in own catalog
 */
router.patch('/medicines/:id', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const { medicine_name, brand, mrp, price, stock_qty, expiry_date, is_active, gst_rate, hsn_code, unit_type } = req.body;

    const existing = await prisma.mainWholesalerMedicine.findFirst({
      where: { id: req.params.id, main_wholesaler_id: mwId },
    });
    if (!existing) return res.status(404).json({ error: 'Medicine not found' });

    const med = await prisma.mainWholesalerMedicine.update({
      where: { id: req.params.id },
      data: {
        ...(medicine_name && { medicine_name: medicine_name.trim() }),
        ...(brand !== undefined && { brand: brand?.trim() || null }),
        ...(mrp !== undefined && { mrp: mrp ? parseFloat(mrp) : null }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stock_qty !== undefined && { stock_qty: stock_qty != null && stock_qty !== '' ? parseInt(stock_qty) : null }),
        ...(expiry_date !== undefined && { expiry_date: expiry_date ? new Date(expiry_date) : null }),
        ...(gst_rate !== undefined && { gst_rate: parseFloat(gst_rate) }),
        ...(hsn_code !== undefined && { hsn_code: hsn_code?.trim() || '3004' }),
        ...(unit_type !== undefined && { unit_type: unit_type?.trim() || 'strip' }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    return res.json(med);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Medicine already exists in catalog' });
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/main-wholesalers/medicines/:id
 * Remove medicine from own catalog
 */
router.delete('/medicines/:id', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    await prisma.mainWholesalerMedicine.deleteMany({
      where: { id: req.params.id, main_wholesaler_id: mwId },
    });
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// LEDGER
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /api/main-wholesalers/ledger
 * List all ledger entries for this main wholesaler
 */
router.get('/ledger', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const entries = await prisma.mainWholesalerLedgerEntry.findMany({
      where: { main_wholesaler_id: mwId },
      include: {
        wholesaler: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return res.json(entries);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /api/main-wholesalers/payments
 * List all payments recorded by this main wholesaler
 */
router.get('/payments', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const payments = await prisma.mainWholesalerPayment.findMany({
      where: { main_wholesaler_id: mwId },
      orderBy: { created_at: 'desc' },
    });
    return res.json(payments);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/main-wholesalers/payments
 * Record a payment from a sub-wholesaler. Also credits the ledger.
 */
router.post('/payments', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const { wholesaler_id, amount, method, notes } = req.body;

    if (!wholesaler_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'wholesaler_id and a positive amount are required' });
    }

    const validMethods = ['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Verify the sub-wholesaler exists
    const wholesaler = await prisma.wholesaler.findUnique({ where: { id: wholesaler_id }, select: { id: true, name: true } });
    if (!wholesaler) return res.status(404).json({ error: 'Sub-wholesaler not found' });

    // Create payment record
    const payment = await prisma.mainWholesalerPayment.create({
      data: {
        main_wholesaler_id: mwId,
        wholesaler_id,
        wholesaler_name: wholesaler.name,
        amount: parseFloat(String(amount)),
        method,
        status: 'COMPLETED',
        notes: notes || null,
      },
    });

    // Credit the ledger (reduces outstanding balance)
    await creditWholesaler(mwId, wholesaler_id, parseFloat(String(amount)), payment.id, `Payment received — ${method}${notes ? ': ' + notes : ''}`);

    return res.status(201).json(payment);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// SCHEMES
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /api/main-wholesalers/schemes
 * List all schemes for this main wholesaler
 */
router.get('/schemes', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const schemes = await prisma.mainWholesalerScheme.findMany({
      where: { main_wholesaler_id: mwId },
      include: { medicine: { select: { id: true, medicine_name: true } } },
      orderBy: { created_at: 'desc' },
    });
    return res.json(schemes);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/main-wholesalers/schemes
 * Create a new scheme
 */
router.post('/schemes', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const { name, type, min_qty, free_qty, discount_pct, medicine_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Scheme name and type are required' });
    }

    const validTypes = ['BOGO', 'HALF_SCHEME', 'CASH_DISCOUNT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid scheme type' });
    }

    // If medicine_id given, verify it belongs to this MW
    if (medicine_id) {
      const med = await prisma.mainWholesalerMedicine.findFirst({ where: { id: medicine_id, main_wholesaler_id: mwId } });
      if (!med) return res.status(400).json({ error: 'Medicine not found in your catalog' });
    }

    const scheme = await prisma.mainWholesalerScheme.create({
      data: {
        main_wholesaler_id: mwId,
        name: name.trim(),
        type,
        min_qty: min_qty != null ? parseInt(String(min_qty)) : null,
        free_qty: free_qty != null ? parseFloat(String(free_qty)) : null,
        discount_pct: discount_pct != null ? parseFloat(String(discount_pct)) : null,
        medicine_id: medicine_id || null,
      },
      include: { medicine: { select: { id: true, medicine_name: true } } },
    });

    return res.status(201).json(scheme);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/main-wholesalers/schemes/:id
 * Delete a scheme
 */
router.delete('/schemes/:id', async (req, res) => {
  try {
    const mwId = req.user!.main_wholesaler_id!;
    const deleted = await prisma.mainWholesalerScheme.deleteMany({
      where: { id: req.params.id, main_wholesaler_id: mwId },
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'Scheme not found' });
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
