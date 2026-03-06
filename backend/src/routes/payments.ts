import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { creditRetailer } from '../services/ledgerService';
import { io } from '../index';

const router = Router();
router.use(authenticate);

// Helper: resolve wholesaler_id from token (direct or via AuthPayload.id for WHOLESALER role)
function getWholesalerId(req: any): string | null {
  // For WHOLESALER role: wholesaler_id may be null in token but id IS the wholesaler id
  return req.user?.wholesaler_id || (req.user?.role === 'WHOLESALER' ? req.user?.id : null);
}

// Helper: verify a retailer belongs to this wholesaler (direct link OR active agency)
async function resolveRetailer(retailer_id: string, wholesaler_id: string) {
  const retailer = await prisma.retailer.findUnique({ where: { id: retailer_id } });
  if (!retailer) return null;
  // Direct ownership
  if (retailer.wholesaler_id === wholesaler_id) return retailer;
  // Via RetailerAgency
  const agency = await prisma.retailerAgency.findFirst({
    where: { retailer_id, wholesaler_id, status: 'ACTIVE' },
  });
  return agency ? retailer : null;
}

// GET /api/payments/history/:retailer_id
router.get('/history/:retailer_id', async (req, res) => {
  try {
    const wholesaler_id = getWholesalerId(req);
    const where: any = {
      wholesaler_id,
      retailer_id: req.params.retailer_id,
    };
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/my — Payments for the logged-in retailer
router.get('/my', requireRole('RETAILER'), async (req, res) => {
  try {
    const retailer_id = req.user!.retailer_id;
    const payments = await prisma.payment.findMany({
      where: { retailer_id },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments — All payments for wholesaler
router.get('/', async (req, res) => {
  try {
    const wholesaler_id = getWholesalerId(req);
    const { retailer_id } = req.query as Record<string, string>;
    const where: any = { wholesaler_id };
    if (retailer_id) where.retailer_id = retailer_id;

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 500,
    });
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/cash — Record manual cash payment (wholesaler)
router.post('/cash', requireRole('WHOLESALER'), async (req, res) => {
  try {
    const { retailer_id, amount, method = 'CASH', notes } = req.body;
    if (!retailer_id || !amount) return res.status(400).json({ error: 'retailer_id and amount required' });

    const wholesaler_id = getWholesalerId(req)!;
    const retailer = await resolveRetailer(retailer_id, wholesaler_id);
    if (!retailer) return res.status(404).json({ error: 'Retailer not found or not linked to your account' });

    const payment = await prisma.payment.create({
      data: {
        wholesaler_id,
        retailer_id,
        retailer_name: retailer.shop_name,
        amount,
        method,
        status: 'COMPLETED',
        notes,
      },
    });

    const { entry: ledgerEntry, newBalance } = await creditRetailer(
      wholesaler_id,
      retailer_id,
      amount,
      payment.id,
      `Payment Received (${method})`
    );

    // Notification
    const notification = await prisma.notification.create({
      data: {
        wholesaler_id,
        retailer_id,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        body: `₹${amount} received via ${method} from ${retailer.shop_name}. Balance: ₹${newBalance.toFixed(0)}`,
      },
    });

    io.to(`wholesaler_${wholesaler_id}`).emit('payment_received', { payment, newBalance });
    io.to(`retailer_${retailer_id}`).emit('payment_received', { payment, newBalance });
    io.to(`wholesaler_${wholesaler_id}`).emit('notification', notification);

    res.status(201).json({ payment, ledgerEntry, newBalance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
