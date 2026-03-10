import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, requireAnyRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Helper to keep Medicine model's aggregated stock and expiry in sync with its Batches
export const syncMedicineTotals = async (medicine_id: string, wholesaler_id: string) => {
  // Aggregate stock
  const batches = await prisma.medicineBatch.findMany({
    where: { medicine_id, stock_qty: { gt: 0 } },
    orderBy: { expiry_date: 'asc' },
  });

  const totalStock = batches.reduce((sum: number, b: any) => sum + b.stock_qty, 0);
  const earliestExpiry = batches.length > 0 ? batches[0].expiry_date : null;

  await prisma.medicine.update({
    where: { id: medicine_id },
    data: { stock_qty: totalStock, expiry_date: earliestExpiry },
  });
};

// GET /api/medicines/alerts/expiry — Get batches expiring soon (wholesaler only)
router.get('/alerts/expiry', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const today = new Date();
    const in90Days = new Date();
    in90Days.setDate(today.getDate() + 90);

    const batches = await prisma.medicineBatch.findMany({
      where: {
        stock_qty: { gt: 0 },
        expiry_date: { lte: in90Days },
        medicine: { wholesaler_id: req.user!.wholesaler_id! }
      },
      include: {
        medicine: { select: { name: true, brand: true, mrp: true, pack_size: true } }
      },
      orderBy: { expiry_date: 'asc' },
      take: 50
    });

    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines/catalog — Search the full 256K catalog (all wholesalers)
// Used by wholesalers to browse & import medicines into their own inventory
router.get('/catalog', requireAnyRole(['WHOLESALER', 'MAIN_WHOLESALER']), async (req, res) => {
  try {
    const {
      search = '',
      page = '1',
      limit = '20',
      therapeutic_class = '',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause — catalog entries have wholesaler_id = null
    const where: any = { wholesaler_id: null };
    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { salt: { contains: search.trim(), mode: 'insensitive' } },
        { brand: { contains: search.trim(), mode: 'insensitive' } },
        { therapeutic_class: { contains: search.trim(), mode: 'insensitive' } },
        { composition2: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (therapeutic_class.trim()) {
      where.therapeutic_class = { contains: therapeutic_class.trim(), mode: 'insensitive' };
    }

    const [total, items] = await prisma.$transaction([
      prisma.medicine.count({ where }),
      prisma.medicine.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          salt: true,
          composition2: true,
          brand: true,
          unit: true,
          pack_size: true,
          mrp: true,
          therapeutic_class: true,
          side_effects: true,
          uses: true,
          is_discontinued: true,
        },
      }),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines/catalog/classes — Distinct therapeutic classes for filter dropdown
router.get('/catalog/classes', requireRole('WHOLESALER'), async (_req, res) => {
  try {
    const rows = await prisma.medicine.findMany({
      where: { wholesaler_id: null, therapeutic_class: { not: null } },
      select: { therapeutic_class: true },
      distinct: ['therapeutic_class'],
      orderBy: { therapeutic_class: 'asc' },
    });
    const classes = rows
      .map((r) => r.therapeutic_class)
      .filter(Boolean) as string[];
    res.json(classes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/medicines/import — Import a catalog medicine into this wholesaler's inventory
router.post('/import', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const {
      catalog_id,   // id of the source medicine row in DB
      mrp,
      price,
      stock_qty,
      gst_rate,
      hsn_code,
      rack_location,
      expiry_date,
    } = req.body as {
      catalog_id: string;
      mrp: number;
      price: number;
      stock_qty: number;
      gst_rate: number;
      hsn_code: string;
      rack_location?: string;
      expiry_date?: string;
    };

    if (!catalog_id) return res.status(400).json({ error: 'catalog_id is required' });

    const source = await prisma.medicine.findUnique({ where: { id: catalog_id } });
    if (!source) return res.status(404).json({ error: 'Catalog medicine not found' });

    // Prevent duplicate import
    const existing = await prisma.medicine.findFirst({
      where: {
        wholesaler_id: req.user!.wholesaler_id!,
        name: source.name,
      },
    });
    if (existing) return res.status(409).json({ error: `"${source.name}" is already in your inventory` });

    const med = await prisma.medicine.create({
      data: {
        wholesaler_id: req.user!.wholesaler_id!,
        name: source.name,
        salt: source.salt,
        composition2: source.composition2,
        brand: source.brand,
        unit: source.unit,
        pack_size: source.pack_size,
        therapeutic_class: source.therapeutic_class,
        side_effects: source.side_effects,
        uses: source.uses,
        is_discontinued: source.is_discontinued,
        mrp: mrp ?? source.mrp,
        price: price ?? parseFloat((source.mrp * 0.75).toFixed(2)),
        stock_qty: stock_qty ?? 0,
        gst_rate: gst_rate ?? 12,
        hsn_code: hsn_code ?? '3004',
        rack_location: rack_location || null,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        is_active: !source.is_discontinued,
      },
    });

    // If stock_qty or expiry_date is provided during import, create the first batch automatically
    if (med.stock_qty > 0 || med.expiry_date) {
      await prisma.medicineBatch.create({
        data: {
          medicine_id: med.id,
          batch_no: `IMP-${Date.now().toString().slice(-6)}`,
          stock_qty: med.stock_qty,
          expiry_date: med.expiry_date || new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
        }
      });
      // the initial values on Medicine are already set correctly by the import, but we can re-sync to be safe
      await syncMedicineTotals(med.id, req.user!.wholesaler_id!);
    }

    res.status(201).json(med);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines — List medicines
router.get('/', async (req, res) => {
  try {
    const { search, wholesaler_id } = req.query as Record<string, string>;
    // Retailers can see medicines from any wholesaler (marketplace)
    // Wholesalers see only their own
    const where: any = req.user!.role === 'WHOLESALER'
      ? { wholesaler_id: req.user!.wholesaler_id }
      : wholesaler_id
        ? { wholesaler_id, is_active: true }
        : { wholesaler_id: { not: null }, is_active: true }; // exclude catalog-only entries

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { salt: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    const medicines = await prisma.medicine.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 500,
    });
    res.json(medicines);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines/wholesalers — All wholesalers (for marketplace supplier filter)
router.get('/wholesalers', async (_req, res) => {
  try {
    const wholesalers = await prisma.wholesaler.findMany({
      where: { is_active: true },
      select: { id: true, name: true, plan: true },
      orderBy: { name: 'asc' },
    });
    res.json(wholesalers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/medicines — Add medicine (wholesaler only)
router.post('/', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { stock_qty, expiry_date, ...restData } = req.body;
    const med = await prisma.medicine.create({
      data: { ...restData, wholesaler_id: req.user!.wholesaler_id, stock_qty: 0 },
    });

    // Create initial batch if stock provided
    if (stock_qty > 0 || expiry_date) {
      await prisma.medicineBatch.create({
        data: {
          medicine_id: med.id,
          batch_no: `INIT-${Date.now().toString().slice(-6)}`,
          stock_qty: stock_qty > 0 ? stock_qty : 0,
          expiry_date: expiry_date ? new Date(expiry_date) : new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
        }
      });
      await syncMedicineTotals(med.id, req.user!.wholesaler_id!);
    }

    // Fetch the updated med
    const finalMed = await prisma.medicine.findUnique({ where: { id: med.id } });
    res.status(201).json(finalMed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/medicines/:id — Update medicine
router.patch('/:id', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const existing = await prisma.medicine.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });
    if (!existing) return res.status(404).json({ error: 'Medicine not found' });
    const updated = await prisma.medicine.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/medicines/:id/toggle — Toggle active status
router.patch('/:id/toggle', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const med = await prisma.medicine.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });
    if (!med) return res.status(404).json({ error: 'Medicine not found' });
    const updated = await prisma.medicine.update({
      where: { id: req.params.id },
      data: { is_active: !med.is_active },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/medicines/:id — Delete a medicine (only if no active orders linked)
router.delete('/:id', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const med = await prisma.medicine.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });

    if (!med) return res.status(404).json({ error: 'Medicine not found' });

    await prisma.medicine.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (err: any) {
    // If there's a foreign key constraint violation (e.g., used in orders or batches), 
    // it will throw a P2003 code. Give a friendly message.
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'Cannot delete this medicine because it is linked to existing batches or orders. Please mark it as "Inactive" instead.'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ======   BATCH MANAGEMENT ROUTES    ======
// ==========================================

// GET /api/medicines/:id/batches — Get all batches for a medicine
router.get('/:id/batches', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const med = await prisma.medicine.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });
    if (!med) return res.status(404).json({ error: 'Medicine not found' });

    const batches = await prisma.medicineBatch.findMany({
      where: { medicine_id: req.params.id },
      orderBy: { expiry_date: 'asc' },
    });
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/medicines/:id/batches — Add a new batch
router.post('/:id/batches', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { batch_no, expiry_date, stock_qty } = req.body;

    if (!batch_no || !expiry_date || stock_qty === undefined) {
      return res.status(400).json({ error: 'batch_no, expiry_date, and stock_qty are required' });
    }

    const med = await prisma.medicine.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });
    if (!med) return res.status(404).json({ error: 'Medicine not found' });

    // Check if batch already exists
    const existing = await prisma.medicineBatch.findUnique({
      where: { medicine_id_batch_no: { medicine_id: req.params.id, batch_no } }
    });

    if (existing) {
      return res.status(409).json({ error: 'Batch number already exists for this medicine' });
    }

    const batch = await prisma.medicineBatch.create({
      data: {
        medicine_id: req.params.id,
        batch_no,
        expiry_date: new Date(expiry_date),
        stock_qty: parseInt(stock_qty, 10),
      }
    });

    await syncMedicineTotals(req.params.id, req.user!.wholesaler_id!);
    res.status(201).json(batch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/medicines/:id/batches/:batchId — Update an existing batch (e.g. adjust stock)
router.patch('/:id/batches/:batchId', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { stock_qty, expiry_date } = req.body;

    const med = await prisma.medicine.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });
    if (!med) return res.status(404).json({ error: 'Medicine not found' });

    const dataToUpdate: any = {};
    if (stock_qty !== undefined) dataToUpdate.stock_qty = parseInt(stock_qty, 10);
    if (expiry_date) dataToUpdate.expiry_date = new Date(expiry_date);

    const updated = await prisma.medicineBatch.update({
      where: { id: req.params.batchId },
      data: dataToUpdate,
    });

    await syncMedicineTotals(req.params.id, req.user!.wholesaler_id!);
    res.json(updated);
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Batch not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
