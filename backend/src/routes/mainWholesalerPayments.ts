import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { creditWholesaler } from '../services/mainWholesalerLedgerService';

const router = Router();
router.use(authenticate, requireRole('MAIN_WHOLESALER'));

router.get('/', async (req, res) => {
    try {
        const mwId = req.user!.main_wholesaler_id!;
        const payments = await prisma.mainWholesalerPayment.findMany({
            where: { main_wholesaler_id: mwId },
            include: {
                wholesaler: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { created_at: 'desc' },
        });
        return res.json(payments);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const mwId = req.user!.main_wholesaler_id!;
        const { wholesaler_id, amount, method, notes, razorpay_id, status } = req.body;

        const wholesaler = await prisma.wholesaler.findUnique({
            where: { id: wholesaler_id },
            select: { name: true },
        });

        if (!wholesaler) {
            return res.status(404).json({ error: 'Wholesaler not found' });
        }

        const P = await prisma.$transaction(async (tx) => {
            const payment = await tx.mainWholesalerPayment.create({
                data: {
                    main_wholesaler_id: mwId,
                    wholesaler_id,
                    wholesaler_name: wholesaler.name,
                    amount: parseFloat(amount),
                    method,
                    status: status || 'COMPLETED',
                    notes,
                    razorpay_id,
                },
            });

            if (payment.status === 'COMPLETED') {
                await creditWholesaler(
                    mwId,
                    wholesaler_id,
                    payment.amount,
                    payment.id,
                    `Payment received via ${method}${notes ? ` - ${notes}` : ''}`
                );
            }

            return payment;
        });

        return res.status(201).json(P);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
