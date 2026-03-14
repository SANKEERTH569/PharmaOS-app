import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/retailers — List all retailers for this wholesaler
// Includes both directly-added retailers (wholesaler_id set) AND
// agency-approved self-registered retailers (linked via RetailerAgency with status ACTIVE)
router.get('/', async (req, res) => {
  try {
    const wid = req.user!.wholesaler_id!;

    // 1. Directly added retailers
    const direct = await prisma.retailer.findMany({
      where: { wholesaler_id: wid },
      orderBy: { shop_name: 'asc' },
    });

    // 2. Agency-approved self-registered retailers
    const agencyLinks = await prisma.retailerAgency.findMany({
      where: { wholesaler_id: wid, status: 'ACTIVE' },
      include: { retailer: true },
    });
    const agencyRetailers = agencyLinks.map((a) => a.retailer);

    // Merge and deduplicate (a retailer could appear in both if directly added + also has an agency link)
    const seen = new Set(direct.map((r) => r.id));
    const merged = [...direct, ...agencyRetailers.filter((r) => !seen.has(r.id))];
    merged.sort((a, b) => a.shop_name.localeCompare(b.shop_name));

    res.json(merged);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/retailers/:id — Single retailer
router.get('/:id', async (req, res) => {
  try {
    const retailer = await prisma.retailer.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id },
    });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });
    res.json(retailer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/retailers — Add new retailer (wholesaler only)
router.post('/', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { name, shop_name, phone, credit_limit, address, gstin, dl_number } = req.body;
    const retailer = await prisma.retailer.create({
      data: {
        wholesaler_id: req.user!.wholesaler_id,
        name,
        shop_name,
        phone,
        credit_limit: credit_limit || 50000,
        address,
        gstin,
        dl_number,
        current_balance: 0,
      },
    });
    res.status(201).json(retailer);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Retailer with this phone already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/retailers/:id — Update retailer
router.patch('/:id', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const existing = await prisma.retailer.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id },
    });
    if (!existing) return res.status(404).json({ error: 'Retailer not found' });

    const updated = await prisma.retailer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/retailers/:id/toggle — Toggle active status
router.patch('/:id/toggle', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const retailer = await prisma.retailer.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id },
    });
    if (!retailer) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.retailer.update({
      where: { id: req.params.id },
      data: { is_active: !retailer.is_active },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/retailers/:id/profile — Retailer views their own profile
router.get('/:id/profile', async (req, res) => {
  try {
    const retailer = await prisma.retailer.findUnique({ where: { id: req.params.id } });
    if (!retailer) return res.status(404).json({ error: 'Not found' });
    res.json(retailer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/retailers/:id/profile — Retailer profile updates disabled; contact admin to update via admin console
router.patch('/:id/profile', requireRole('RETAILER'), async (_req, res) => {
  return res.status(403).json({ error: 'Profile cannot be edited from the app. Please contact your admin to update your profile; they can do so from the admin console.' });
});

export default router;
