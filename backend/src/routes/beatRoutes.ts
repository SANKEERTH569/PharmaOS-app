import { Router } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = Router();

function getWholesalerId(req: any, res: any): string | null {
  const header = req.headers.authorization;
  if (!header) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== 'WHOLESALER') { res.status(403).json({ error: 'Forbidden' }); return null; }
    return payload.wholesaler_id;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

function getSalesmanOrWholesalerId(req: any): { wholesaler_id: string | null; salesman_id: string | null } {
  const header = req.headers.authorization;
  if (!header) return { wholesaler_id: null, salesman_id: null };
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role === 'WHOLESALER') return { wholesaler_id: payload.wholesaler_id, salesman_id: null };
    if (payload.role === 'SALESMAN') return { wholesaler_id: payload.wholesaler_id, salesman_id: payload.salesman_id };
    return { wholesaler_id: null, salesman_id: null };
  } catch {
    return { wholesaler_id: null, salesman_id: null };
  }
}

/**
 * POST /api/beat-routes
 * Create a new beat route
 */
router.post('/', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const { name, description, salesman_id }: { name: string; description?: string; salesman_id?: string } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Validate salesman belongs to this wholesaler
    if (salesman_id) {
      const s = await prisma.salesman.findFirst({ where: { id: salesman_id, wholesaler_id } });
      if (!s) return res.status(400).json({ error: 'Salesman not found' });
    }

    const beat = await prisma.beatRoute.create({
      data: { wholesaler_id, name, description, salesman_id: salesman_id || null },
      include: { salesman: { select: { id: true, name: true } }, retailers: { include: { retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true } } } } },
    });
    res.status(201).json(beat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/beat-routes
 * List all beat routes for this wholesaler
 * Also accessible by salesman (only their assigned beats)
 */
router.get('/', async (req, res) => {
  const { wholesaler_id, salesman_id } = getSalesmanOrWholesalerId(req);
  if (!wholesaler_id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let where: any;

    if (salesman_id) {
      // For a salesman: fetch beat routes assigned to them from ALL wholesalers they are linked to
      const approvedLinks = await prisma.salesmanWholesalerLink.findMany({
        where: { salesman_id, status: 'APPROVED' },
        select: { wholesaler_id: true },
      });
      const linkedWholesalerIds = approvedLinks.map((l: any) => l.wholesaler_id);
      // Also include their primary wholesaler_id in case it's not in links
      if (wholesaler_id && !linkedWholesalerIds.includes(wholesaler_id)) {
        linkedWholesalerIds.push(wholesaler_id);
      }
      where = {
        salesman_id,
        wholesaler_id: { in: linkedWholesalerIds },
      };
    } else {
      where = { wholesaler_id };
    }

    const beats = await prisma.beatRoute.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        salesman: { select: { id: true, name: true, phone: true } },
        retailers: { include: { retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true } } } },
      },
    });
    res.json(beats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/beat-routes/:id
 * Get single beat route with full retailer list
 */
router.get('/:id', async (req, res) => {
  const { wholesaler_id } = getSalesmanOrWholesalerId(req);
  if (!wholesaler_id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const beat = await prisma.beatRoute.findFirst({
      where: { id: req.params.id, wholesaler_id },
      include: {
        salesman: { select: { id: true, name: true, phone: true } },
        retailers: { include: { retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true } } } },
      },
    });
    if (!beat) return res.status(404).json({ error: 'Beat route not found' });
    res.json(beat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/beat-routes/:id
 * Update beat route name/description/salesman
 */
router.patch('/:id', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const existing = await prisma.beatRoute.findFirst({ where: { id: req.params.id, wholesaler_id } });
    if (!existing) return res.status(404).json({ error: 'Beat route not found' });

    const { name, description, salesman_id } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (salesman_id !== undefined) {
      if (salesman_id) {
        const s = await prisma.salesman.findFirst({ where: { id: salesman_id, wholesaler_id } });
        if (!s) return res.status(400).json({ error: 'Salesman not found' });
      }
      updateData.salesman_id = salesman_id || null;
    }

    const updated = await prisma.beatRoute.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        salesman: { select: { id: true, name: true } },
        retailers: { include: { retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true } } } },
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/beat-routes/:id
 * Delete a beat route
 */
router.delete('/:id', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const existing = await prisma.beatRoute.findFirst({ where: { id: req.params.id, wholesaler_id } });
    if (!existing) return res.status(404).json({ error: 'Beat route not found' });

    await prisma.beatRoute.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/beat-routes/:id/retailers
 * Bulk set retailer assignments for this beat (replaces existing)
 * Body: { retailer_ids: string[] }
 */
router.post('/:id/retailers', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const beat = await prisma.beatRoute.findFirst({ where: { id: req.params.id, wholesaler_id } });
    if (!beat) return res.status(404).json({ error: 'Beat route not found' });

    const { retailer_ids }: { retailer_ids: string[] } = req.body;
    if (!Array.isArray(retailer_ids)) return res.status(400).json({ error: 'retailer_ids must be an array' });

    // Replace all assignments
    await prisma.beatRetailer.deleteMany({ where: { beat_id: req.params.id } });
    if (retailer_ids.length > 0) {
      await prisma.beatRetailer.createMany({
        data: retailer_ids.map((retailer_id) => ({ beat_id: req.params.id, retailer_id })),
        skipDuplicates: true,
      });
    }

    const updated = await prisma.beatRoute.findFirst({
      where: { id: req.params.id },
      include: {
        salesman: { select: { id: true, name: true } },
        retailers: { include: { retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true } } } },
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/beat-routes/:id/retailers/:retailerId
 * Remove one retailer from beat
 */
router.delete('/:id/retailers/:retailerId', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const beat = await prisma.beatRoute.findFirst({ where: { id: req.params.id, wholesaler_id } });
    if (!beat) return res.status(404).json({ error: 'Beat route not found' });

    await prisma.beatRetailer.deleteMany({
      where: { beat_id: req.params.id, retailer_id: req.params.retailerId },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
