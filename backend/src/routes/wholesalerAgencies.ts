import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { io } from '../index';

const router = Router();
router.use(authenticate);
router.use(requireRole('WHOLESALER'));

/**
 * GET /api/wholesaler/agencies/pending
 * Returns all PENDING retailer join requests for this wholesaler.
 */
router.get('/pending', async (req, res) => {
  try {
    const requests = await prisma.retailerAgency.findMany({
      where: {
        wholesaler_id: req.user!.wholesaler_id!,
        status: 'PENDING',
      },
      include: {
        retailer: {
          select: {
            id: true,
            name: true,
            shop_name: true,
            phone: true,
            address: true,
            gstin: true,
            current_balance: true,
            credit_limit: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/wholesaler/agencies/:retailer_id/respond
 * Accept or reject a pending retailer join request.
 * Body: { action: 'ACCEPT' | 'REJECT' }
 */
router.patch('/:retailer_id/respond', async (req, res) => {
  try {
    const { action } = req.body as { action: 'ACCEPT' | 'REJECT' };
    if (!action || !['ACCEPT', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'action must be ACCEPT or REJECT' });
    }

    const agency = await prisma.retailerAgency.findUnique({
      where: {
        retailer_id_wholesaler_id: {
          retailer_id: req.params.retailer_id,
          wholesaler_id: req.user!.wholesaler_id!,
        },
      },
      include: { retailer: { select: { id: true, shop_name: true } } },
    });

    if (!agency) return res.status(404).json({ error: 'Request not found' });
    if (agency.status !== 'PENDING') {
      return res.status(409).json({ error: 'Request already processed' });
    }

    if (action === 'REJECT') {
      await prisma.retailerAgency.delete({
        where: {
          retailer_id_wholesaler_id: {
            retailer_id: req.params.retailer_id,
            wholesaler_id: req.user!.wholesaler_id!,
          },
        },
      });

      // Notify the retailer
      const notification = await prisma.notification.create({
        data: {
          wholesaler_id: req.user!.wholesaler_id!,
          retailer_id: req.params.retailer_id,
          type: 'AGENCY_REJECTED',
          title: 'Agency Request Rejected',
          body: 'Your request to join this wholesaler agency was rejected.',
        },
      });
      io.to(`retailer_${req.params.retailer_id}`).emit('agency_response', { action: 'REJECTED' });
      io.to(`retailer_${req.params.retailer_id}`).emit('notification', notification);

      return res.json({ success: true, action: 'REJECTED' });
    }

    // ACCEPT
    const updated = await prisma.retailerAgency.update({
      where: {
        retailer_id_wholesaler_id: {
          retailer_id: req.params.retailer_id,
          wholesaler_id: req.user!.wholesaler_id!,
        },
      },
      data: { status: 'ACTIVE' },
      include: {
        retailer: {
          select: {
            id: true,
            name: true,
            shop_name: true,
            phone: true,
          },
        },
      },
    });

    // Notify the retailer
    const notification = await prisma.notification.create({
      data: {
        wholesaler_id: req.user!.wholesaler_id!,
        retailer_id: req.params.retailer_id,
        type: 'AGENCY_ACCEPTED',
        title: 'Agency Request Accepted',
        body: 'Your request to join the wholesaler agency has been accepted. You can now place orders.',
      },
    });
    io.to(`retailer_${req.params.retailer_id}`).emit('agency_response', { action: 'ACCEPTED', agency: updated });
    io.to(`retailer_${req.params.retailer_id}`).emit('notification', notification);

    res.json({ success: true, action: 'ACCEPTED', agency: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wholesaler/agencies/all
 * All active retailers linked to this wholesaler via agency.
 */
router.get('/all', async (req, res) => {
  try {
    const links = await prisma.retailerAgency.findMany({
      where: {
        wholesaler_id: req.user!.wholesaler_id!,
        status: 'ACTIVE',
      },
      include: {
        retailer: {
          select: {
            id: true,
            name: true,
            shop_name: true,
            phone: true,
            address: true,
            current_balance: true,
            credit_limit: true,
            is_active: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
