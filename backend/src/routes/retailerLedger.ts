import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('RETAILER'));

// GET /api/retailer/ledger/summary
// Get all agencies this retailer is connected to + balances
router.get('/summary', async (req, res) => {
    try {
        const retailer_id = req.user!.retailer_id!;

        // We get the retailer's balance per wholesaler by looking at agencies or the retailer object itself
        // However, currently, the system tracks credit_limit and current_balance on the Retailer model.
        // If a retailer is linked to multiple agencies, do they have separate retailer records per wholesaler?
        // Let's check schema.prisma
        // Model Retailer has `wholesaler_id?` (for direct link) and `credit_limit`, `current_balance`.
        // It also has `agencies` (RetailerAgency) for multiple.
        // Wait, the ledger entries have `wholesaler_id` and `amount`.
        // Let's calculate the balance per wholesaler dynamically from ledger.

        // Get all agencies the retailer is linked to (via RetailerAgency or direct)
        const retailerUser = await prisma.retailer.findUnique({
            where: { id: retailer_id },
            include: {
                wholesaler: true, // Direct wholesaler
                agencies: {       // Other linked wholesalers
                    include: { wholesaler: true }
                }
            }
        });

        if (!retailerUser) return res.status(404).json({ error: 'Retailer not found' });

        // Build unique list of wholesalers
        const wholesalersMap = new Map();
        if (retailerUser.wholesaler) {
            wholesalersMap.set(retailerUser.wholesaler.id, {
                wholesaler: retailerUser.wholesaler,
                is_primary: true,
                // Actually credit limit is on the retailer record. If they have one retailer record, the limit applies globally?
                // Let's return the credit limit from the Retailer record.
                credit_limit: retailerUser.credit_limit,
                current_balance: 0 // Will compute
            });
        }

        retailerUser.agencies.forEach(agency => {
            wholesalersMap.set(agency.wholesaler_id, {
                wholesaler: agency.wholesaler,
                is_primary: agency.is_primary,
                credit_limit: retailerUser.credit_limit, // Credit is currently shared per retailer user
                current_balance: 0
            });
        });

        // Compute balance from ledger per wholesaler
        const ledgerEntries = await prisma.ledgerEntry.findMany({
            where: { retailer_id }
        });

        ledgerEntries.forEach(entry => {
            if (wholesalersMap.has(entry.wholesaler_id)) {
                const wData = wholesalersMap.get(entry.wholesaler_id);
                if (entry.type === 'DEBIT') {
                    wData.current_balance += entry.amount;
                } else {
                    wData.current_balance -= entry.amount;
                }
            } else {
                // Just in case they have a ledger entry for a wholesaler they are no longer linked to
                wholesalersMap.set(entry.wholesaler_id, {
                    wholesaler: { id: entry.wholesaler_id, name: 'Unknown Supplier (Unlinked)' },
                    is_primary: false,
                    credit_limit: retailerUser.credit_limit,
                    current_balance: entry.type === 'DEBIT' ? entry.amount : -entry.amount
                });
            }
        });

        // We can also compute global balance
        let global_balance = 0;
        const summaries = Array.from(wholesalersMap.values()).map(w => {
            w.current_balance = Math.max(0, w.current_balance);
            global_balance += w.current_balance;
            return {
                wholesaler_id: w.wholesaler.id,
                name: w.wholesaler.name,
                phone: w.wholesaler.phone,
                is_primary: w.is_primary,
                balance: w.current_balance
            };
        });

        res.json({
            global_credit_limit: retailerUser.credit_limit,
            global_current_balance: Math.max(0, global_balance),
            agencies: summaries
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/retailer/ledger/history/:wholesaler_id
router.get('/history/:wholesaler_id', async (req, res) => {
    try {
        const retailer_id = req.user!.retailer_id!;
        const wholesaler_id = req.params.wholesaler_id;

        const entries = await prisma.ledgerEntry.findMany({
            where: {
                retailer_id,
                wholesaler_id
            },
            orderBy: { created_at: 'desc' },
            take: 200, // Recent 200
        });

        res.json(entries);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
