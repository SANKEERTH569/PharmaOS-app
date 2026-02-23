import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/notifications — Get notifications for this wholesaler or retailer
router.get('/', async (req, res) => {
  try {
    const where: any = req.user!.role === 'RETAILER'
      ? { retailer_id: req.user!.retailer_id }
      : { wholesaler_id: req.user!.wholesaler_id! };

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
    const where: any = req.user!.role === 'RETAILER'
      ? { retailer_id: req.user!.retailer_id, is_read: false }
      : { wholesaler_id: req.user!.wholesaler_id!, is_read: false };

    await prisma.notification.updateMany({ where, data: { is_read: true } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
