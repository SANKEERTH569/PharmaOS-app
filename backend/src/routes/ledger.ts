import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/ledger/balance/:retailer_id
router.get('/balance/:retailer_id', async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        wholesaler_id: req.user!.wholesaler_id!,
        retailer_id: req.params.retailer_id,
      },
    });
    const balance = entries.reduce(
      (acc, e) => (e.type === 'DEBIT' ? acc + e.amount : acc - e.amount),
      0
    );
    res.json({ balance: Math.max(0, balance), retailer_id: req.params.retailer_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ledger/history/:retailer_id — Paginated ledger
router.get('/history/:retailer_id', async (req, res) => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: {
          wholesaler_id: req.user!.wholesaler_id!,
          retailer_id: req.params.retailer_id,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.ledgerEntry.count({
        where: {
          wholesaler_id: req.user!.wholesaler_id!,
          retailer_id: req.params.retailer_id,
        },
      }),
    ]);

    res.json({ entries, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ledger — All ledger entries for wholesaler (with optional retailer filter)
router.get('/', async (req, res) => {
  try {
    const { retailer_id } = req.query as Record<string, string>;
    const where: any = { wholesaler_id: req.user!.wholesaler_id };
    if (retailer_id) where.retailer_id = retailer_id;

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: { retailer: { select: { shop_name: true, name: true } } },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ledger/summary — All retailers with current balances
router.get('/summary', async (req, res) => {
  try {
    const retailers = await prisma.retailer.findMany({
      where: { wholesaler_id: req.user!.wholesaler_id, is_active: true },
      select: { id: true, shop_name: true, name: true, credit_limit: true, current_balance: true, last_payment_date: true },
      orderBy: { current_balance: 'desc' },
    });
    res.json(retailers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ledger/overdue — Retailers unpaid for 30+ days
router.get('/overdue', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const retailers = await prisma.retailer.findMany({
      where: {
        wholesaler_id: req.user!.wholesaler_id,
        is_active: true,
        current_balance: { gt: 0 },
        OR: [
          { last_payment_date: null },
          { last_payment_date: { lt: thirtyDaysAgo } },
        ],
      },
      orderBy: { current_balance: 'desc' },
    });
    res.json(retailers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// POST /api/ledger/opening-balance
router.post('/opening-balance', async (req, res) => {
  try {
    const { retailer_id, amount, notes } = req.body as {
      retailer_id: string;
      amount: number;
      notes?: string;
    };

    if (!retailer_id || amount <= 0) {
      return res.status(400).json({ error: 'Valid retailer_id and positive amount are required' });
    }

    const wholesaler_id = req.user!.wholesaler_id!;

    // Using transaction to ensure atomic update of retailer balance and ledger entry
    const result = await prisma.$transaction(async (tx) => {
      const retailer = await tx.retailer.findFirst({
        where: { id: retailer_id, wholesaler_id },
      });

      if (!retailer) {
        throw new Error('Retailer not found');
      }

      const newBalance = retailer.current_balance + amount;

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          wholesaler_id,
          retailer_id,
          type: 'DEBIT',
          amount,
          balance_after: newBalance,
          description: notes || 'Opening Balance / Old Debt recorded',
        },
      });

      const updatedRetailer = await tx.retailer.update({
        where: { id: retailer_id },
        data: { current_balance: newBalance },
      });

      return { ledgerEntry, retailer: updatedRetailer };
    });

    res.status(201).json({ ledgerEntry: result.ledgerEntry, retailer: result.retailer });
  } catch (err: any) {
    if (err.message === 'Retailer not found') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
