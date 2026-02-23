import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('RETAILER'));

/**
 * GET /api/retailer/agencies
 * Returns all wholesalers this retailer is linked to.
 */
router.get('/', async (req, res) => {
  try {
    const agencies = await prisma.retailerAgency.findMany({
      where: { retailer_id: req.user!.retailer_id },
      include: {
        wholesaler: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            email: true,
            gstin: true,
            dl_number: true,
            plan: true,
          },
        },
      },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    });
    res.json(agencies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/retailer/agencies/search?q=<name or phone>
 * Search wholesalers to add as agencies.
 */
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Already linked wholesaler IDs (exclude from results)
    const linked = await prisma.retailerAgency.findMany({
      where: { retailer_id: req.user!.retailer_id },
      select: { wholesaler_id: true },
    });
    const linkedIds = linked.map((a) => a.wholesaler_id);

    const wholesalers = await prisma.wholesaler.findMany({
      where: {
        is_active: true,
        id: { notIn: linkedIds },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        plan: true,
      },
      take: 10,
    });

    res.json(wholesalers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/retailer/agencies
 * Link this retailer to a wholesaler agency.
 * Body: { wholesaler_id, is_primary? }
 */
router.post('/', async (req, res) => {
  try {
    const { wholesaler_id, is_primary = false } = req.body as {
      wholesaler_id: string;
      is_primary?: boolean;
    };

    if (!wholesaler_id) {
      return res.status(400).json({ error: 'wholesaler_id is required' });
    }

    const wholesaler = await prisma.wholesaler.findUnique({ where: { id: wholesaler_id } });
    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    // If setting as primary, unset others first
    if (is_primary) {
      await prisma.retailerAgency.updateMany({
        where: { retailer_id: req.user!.retailer_id },
        data: { is_primary: false },
      });
    }

    const agency = await prisma.retailerAgency.create({
      data: {
        retailer_id: req.user!.retailer_id!,
        wholesaler_id,
        is_primary,
        status: 'PENDING',
      },
      include: {
        wholesaler: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            email: true,
            plan: true,
          },
        },
      },
    });

    res.status(201).json(agency);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'This agency is already linked to your account.' });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/retailer/agencies/:wholesaler_id/primary
 * Set an agency as primary supplier.
 */
router.patch('/:wholesaler_id/primary', async (req, res) => {
  try {
    await prisma.retailerAgency.updateMany({
      where: { retailer_id: req.user!.retailer_id },
      data: { is_primary: false },
    });
    const updated = await prisma.retailerAgency.update({
      where: {
        retailer_id_wholesaler_id: {
          retailer_id: req.user!.retailer_id!,
          wholesaler_id: req.params.wholesaler_id,
        },
      },
      data: { is_primary: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/retailer/agencies/:wholesaler_id
 * Unlink this retailer from a wholesaler agency.
 */
router.delete('/:wholesaler_id', async (req, res) => {
  try {
    await prisma.retailerAgency.delete({
      where: {
        retailer_id_wholesaler_id: {
          retailer_id: req.user!.retailer_id!,
          wholesaler_id: req.params.wholesaler_id,
        },
      },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
