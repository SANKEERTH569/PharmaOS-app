import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

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

// All routes below require MAIN_WHOLESALER auth
router.use(authenticate, requireRole('MAIN_WHOLESALER'));

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
        wholesaler: { select: { id: true, name: true, phone: true, address: true } },
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

export default router;
