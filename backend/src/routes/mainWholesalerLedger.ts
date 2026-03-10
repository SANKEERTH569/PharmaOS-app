import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireRole('MAIN_WHOLESALER'));

// Get all ledger entries for the main wholesaler
router.get('/', async (req, res) => {
    try {
        const mwId = req.user!.main_wholesaler_id!;
        const entries = await prisma.mainWholesalerLedgerEntry.findMany({
            where: { main_wholesaler_id: mwId },
            include: {
                wholesaler: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { created_at: 'desc' },
        });
        return res.json(entries);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get ledger statement for a specific sub-wholesaler
router.get('/:wholesalerId/statement', async (req, res) => {
    try {
        const mwId = req.user!.main_wholesaler_id!;
        const { wholesalerId } = req.params;

        const [wholesaler, entries, connection] = await Promise.all([
            prisma.wholesaler.findUnique({
                where: { id: wholesalerId },
                select: { id: true, name: true, phone: true, address: true, gstin: true },
            }),
            prisma.mainWholesalerLedgerEntry.findMany({
                where: { main_wholesaler_id: mwId, wholesaler_id: wholesalerId },
                orderBy: { created_at: 'asc' }, // usually chronological for statements
            }),
            prisma.mainWholesalerConnection.findUnique({
                where: { main_wholesaler_id_wholesaler_id: { main_wholesaler_id: mwId, wholesaler_id: wholesalerId } },
            })
        ]);

        if (!wholesaler) return res.status(404).json({ error: 'Wholesaler not found' });

        // Calculate dynamic balance array
        let runningBalance = 0;
        const history = entries.map((e) => {
            runningBalance += e.type === 'DEBIT' ? e.amount : -e.amount;
            return { ...e, balance_after: runningBalance };
        });

        return res.json({
            wholesaler,
            balance: connection?.current_balance || 0,
            credit_limit: connection?.credit_limit || 500000,
            history: history.reverse(), // send newest first for UI
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
