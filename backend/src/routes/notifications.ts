import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/notifications — Get notifications for this wholesaler or retailer
router.get('/', async (req, res) => {
  try {
    let where: any;
    if (req.user!.role === 'RETAILER') {
      if (!req.user!.retailer_id) {
        return res.status(401).json({ error: 'Retailer context missing in token' });
      }
      where = { retailer_id: req.user!.retailer_id };
    } else if (req.user!.role === 'WHOLESALER' || req.user!.role === 'SALESMAN') {
      if (!req.user!.wholesaler_id) {
        return res.status(403).json({ error: 'No wholesaler linked to this account yet' });
      }
      where = { wholesaler_id: req.user!.wholesaler_id };
    } else {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read — Mark one as read
router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { is_read: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all — Mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    let where: any;
    if (req.user!.role === 'RETAILER') {
      if (!req.user!.retailer_id) {
        return res.status(401).json({ error: 'Retailer context missing in token' });
      }
      where = { retailer_id: req.user!.retailer_id, is_read: false };
    } else if (req.user!.role === 'WHOLESALER' || req.user!.role === 'SALESMAN') {
      if (!req.user!.wholesaler_id) {
        return res.status(403).json({ error: 'No wholesaler linked to this account yet' });
      }
      where = { wholesaler_id: req.user!.wholesaler_id, is_read: false };
    } else {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }

    await prisma.notification.updateMany({ where, data: { is_read: true } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
