import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { syncMedicineTotals } from './medicines';

const router = Router();
router.use(authenticate);
router.use(requireRole('WHOLESALER'));

// ── Helpers ────────────────────────────────────────────────────────────────

function nextPONumber(existing: string[]): string {
  const nums = existing
    .map((n) => parseInt(n.replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `PO-${String(next).padStart(4, '0')}`;
}

function nextGRNNumber(existing: string[]): string {
  const nums = existing
    .map((n) => parseInt(n.replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `GRN-${String(next).padStart(4, '0')}`;
}

// ── Purchase Order Routes ──────────────────────────────────────────────────

// GET /api/purchase-orders
router.get('/', async (req, res) => {
  try {
    const wholesaler_id = req.user!.wholesaler_id!;
    const { status } = req.query as Record<string, string>;
    const where: any = { wholesaler_id };
    if (status && status !== 'ALL') where.status = status;

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: { items: true, grns: { select: { id: true, grn_number: true, created_at: true } }, supply_order: { select: { id: true, so_number: true, status: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(pos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', async (req, res) => {
  try {
    const wholesaler_id = req.user!.wholesaler_id!;
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, wholesaler_id },
      include: {
        items: true,
        grns: { include: { items: true } },
      },
    });
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(po);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purchase-orders
router.post('/', async (req, res) => {
  try {
    const wholesaler_id = req.user!.wholesaler_id!;
    const { supplier_name, supplier_phone, supplier_gstin, notes, items } = req.body;

    if (!supplier_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'supplier_name and items are required' });
    }

    // Generate unique PO number
    const existing = await prisma.purchaseOrder.findMany({
      where: { wholesaler_id },
      select: { po_number: true },
    });
    const po_number = nextPONumber(existing.map((p) => p.po_number));

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number,
        wholesaler_id,
        supplier_name: supplier_name.trim(),
        supplier_phone: supplier_phone?.trim() || null,
        supplier_gstin: supplier_gstin?.trim() || null,
        notes: notes?.trim() || null,
        items: {
          create: items.map((item: any) => ({
            medicine_id: item.medicine_id || null,
            medicine_name: String(item.medicine_name).trim(),
            qty_ordered: Number(item.qty_ordered),
            unit_cost: Number(item.unit_cost),
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(po);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/purchase-orders/:id — Update status or details (only DRAFT editable)
router.patch('/:id', async (req, res) => {
  try {
    const wholesaler_id = req.user!.wholesaler_id!;
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, wholesaler_id },
      include: { items: true },
    });
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });

    const { status, supplier_name, supplier_phone, supplier_gstin, notes, main_wholesaler_id } = req.body;

    // Only allow status transitions that make sense
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
      RECEIVED: [],
      CANCELLED: [],
    };
    if (status && !validTransitions[po.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${po.status} to ${status}` });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(supplier_name && { supplier_name: supplier_name.trim() }),
        ...(supplier_phone !== undefined && { supplier_phone: supplier_phone?.trim() || null }),
        ...(supplier_gstin !== undefined && { supplier_gstin: supplier_gstin?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(main_wholesaler_id !== undefined && { main_wholesaler_id: main_wholesaler_id || null }),
      },
      include: { items: true },
    });

    // When PO is marked SENT and linked to a MainWholesaler, auto-create a SupplyOrder
    const effectiveMWId = main_wholesaler_id ?? po.main_wholesaler_id;
    if (status === 'SENT' && effectiveMWId) {
      const existingSO = await prisma.supplyOrder.findFirst({
        where: { purchase_order_id: po.id },
      });

      if (!existingSO) {
        const existingSOs = await prisma.supplyOrder.findMany({
          where: { main_wholesaler_id: effectiveMWId },
          select: { so_number: true },
        });
        const nums = existingSOs
          .map((s) => parseInt(s.so_number.replace(/\D/g, ''), 10))
          .filter((n) => !isNaN(n));
        const next = nums.length ? Math.max(...nums) + 1 : 1;
        const so_number = `SO-${String(next).padStart(4, '0')}`;

        const totalAmount = po.items.reduce(
          (sum, item) => sum + item.qty_ordered * item.unit_cost,
          0
        );

        await prisma.supplyOrder.create({
          data: {
            so_number,
            wholesaler_id,
            main_wholesaler_id: effectiveMWId,
            purchase_order_id: po.id,
            total_amount: totalAmount,
            notes: po.notes,
            status: 'PENDING',
            items: {
              create: po.items.map((item) => ({
                medicine_name: item.medicine_name,
                qty_ordered: item.qty_ordered,
                unit_cost: item.unit_cost,
                total_price: item.qty_ordered * item.unit_cost,
              })),
            },
          },
        });
      }
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/purchase-orders/:id — Only DRAFT/CANCELLED POs can be deleted
router.delete('/:id', async (req, res) => {
  try {
    const wholesaler_id = req.user!.wholesaler_id!;
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, wholesaler_id },
    });
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (!['DRAFT', 'CANCELLED'].includes(po.status)) {
      return res.status(400).json({ error: 'Only DRAFT or CANCELLED purchase orders can be deleted' });
    }
    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GRN Routes ─────────────────────────────────────────────────────────────

// GET /api/purchase-orders/grns/list
router.get('/grns/list', async (req, res) => {
  try {
    const wholesaler_id = req.user!.wholesaler_id!;
    const grns = await prisma.goodsReceiptNote.findMany({
      where: { wholesaler_id },
      include: {
        items: true,
        po: { select: { id: true, po_number: true, supplier_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(grns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purchase-orders/grns — Create a GRN (with or without a linked PO)
// This is the key action: receives goods and adds stock to inventory as new batches
router.post('/grns', async (req, res) => {
  try {
    const wholesaler_id = req.user!.wholesaler_id!;
    const { po_id, supplier_name, notes, items } = req.body;

    if (!supplier_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'supplier_name and items are required' });
    }

    // Validate that all medicines belong to this wholesaler
    const medicineIds: string[] = items.map((i: any) => String(i.medicine_id));
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, wholesaler_id },
      select: { id: true },
    });
    const validIds = new Set(medicines.map((m) => m.id));
    const invalid = medicineIds.find((id) => !validIds.has(id));
    if (invalid) {
      return res.status(400).json({ error: `Medicine ${invalid} not found in your inventory` });
    }

    // Validate linked PO if provided
    if (po_id) {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: po_id, wholesaler_id },
      });
      if (!po) return res.status(404).json({ error: 'Linked purchase order not found' });
      if (po.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Cannot receive against a cancelled purchase order' });
      }
    }

    // Generate unique GRN number
    const existingGrns = await prisma.goodsReceiptNote.findMany({
      where: { wholesaler_id },
      select: { grn_number: true },
    });
    const grn_number = nextGRNNumber(existingGrns.map((g) => g.grn_number));

    // Create GRN + add stock batches in a transaction
    const grn = await prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceiptNote.create({
        data: {
          grn_number,
          wholesaler_id,
          po_id: po_id || null,
          supplier_name: supplier_name.trim(),
          notes: notes?.trim() || null,
          items: {
            create: items.map((item: any) => ({
              medicine_id: String(item.medicine_id),
              medicine_name: String(item.medicine_name).trim(),
              batch_no: String(item.batch_no).trim(),
              expiry_date: new Date(item.expiry_date),
              qty_received: Number(item.qty_received),
              unit_cost: Number(item.unit_cost),
            })),
          },
        },
        include: { items: true },
      });

      // Add stock: upsert batch for each line item
      for (const item of items) {
        const existing = await tx.medicineBatch.findUnique({
          where: {
            medicine_id_batch_no: {
              medicine_id: String(item.medicine_id),
              batch_no: String(item.batch_no).trim(),
            },
          },
        });

        if (existing) {
          await tx.medicineBatch.update({
            where: { id: existing.id },
            data: {
              stock_qty: { increment: Number(item.qty_received) },
              expiry_date: new Date(item.expiry_date),
            },
          });
        } else {
          await tx.medicineBatch.create({
            data: {
              medicine_id: String(item.medicine_id),
              batch_no: String(item.batch_no).trim(),
              expiry_date: new Date(item.expiry_date),
              stock_qty: Number(item.qty_received),
            },
          });
        }

        // Update medicine unit_cost (purchase price) to the latest cost
        await tx.medicine.update({
          where: { id: String(item.medicine_id) },
          data: { price: Number(item.unit_cost) },
        });
      }

      // If linked to a PO, update qty_received on PO items and PO status
      if (po_id) {
        const poItems = await tx.pOItem.findMany({ where: { po_id: po_id } });

        for (const grnItem of items) {
          // Match PO item by medicine_id or medicine_name
          const poItem = poItems.find(
            (pi) =>
              (grnItem.medicine_id && pi.medicine_id === String(grnItem.medicine_id)) ||
              pi.medicine_name.toLowerCase() === String(grnItem.medicine_name).toLowerCase().trim()
          );
          if (poItem) {
            await tx.pOItem.update({
              where: { id: poItem.id },
              data: { qty_received: { increment: Number(grnItem.qty_received) } },
            });
          }
        }

        // Refresh PO items to determine new status
        const updatedItems = await tx.pOItem.findMany({ where: { po_id } });
        const allFulfilled = updatedItems.every((i) => i.qty_received >= i.qty_ordered);
        const anyReceived = updatedItems.some((i) => i.qty_received > 0);
        const newStatus = allFulfilled ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : undefined;
        if (newStatus) {
          await tx.purchaseOrder.update({ where: { id: po_id }, data: { status: newStatus } });
        }
      }

      return created;
    });

    // Sync medicine stock totals (outside transaction to avoid nesting issues)
    for (const item of items) {
      await syncMedicineTotals(String(item.medicine_id), wholesaler_id);
    }

    res.status(201).json(grn);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
