import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { creditRetailer } from '../services/ledgerService';
import { io } from '../index';

const router = Router();
router.use(authenticate);

// ─── GET /api/returns — List returns ──────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        let where: any = {};

        if (req.user!.role === 'RETAILER') {
            where.retailer_id = req.user!.retailer_id;
        } else if (req.user!.role === 'WHOLESALER') {
            where.wholesaler_id = req.user!.wholesaler_id;
        }

        const { status } = req.query as Record<string, string>;
        if (status && status !== 'ALL') {
            where.status = status;
        }

        const returns = await prisma.returnRequest.findMany({
            where,
            include: {
                items: true,
                retailer: { select: { id: true, name: true, shop_name: true, phone: true } },
                wholesaler: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        res.json(returns);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/returns — Submit a return request (retailer) ───────────────
router.post('/', requireRole('RETAILER'), async (req, res) => {
    try {
        const { wholesaler_id, reason, notes, items } = req.body;

        if (!wholesaler_id || !reason || !items || items.length === 0) {
            return res.status(400).json({ error: 'wholesaler_id, reason, and items are required' });
        }

        // Validate reason
        if (!['EXPIRED', 'DAMAGED'].includes(reason)) {
            return res.status(400).json({ error: 'reason must be EXPIRED or DAMAGED' });
        }

        const retailerId = req.user!.retailer_id!;

        // Calculate total
        const totalAmount = items.reduce((sum: number, item: any) => sum + (item.qty * item.unit_price), 0);

        const returnRequest = await prisma.returnRequest.create({
            data: {
                wholesaler_id,
                retailer_id: retailerId,
                reason,
                notes: notes || null,
                total_amount: totalAmount,
                items: {
                    create: items.map((item: any) => ({
                        medicine_name: item.medicine_name,
                        batch_no: item.batch_no || null,
                        expiry_date: item.expiry_date || null,
                        qty: item.qty,
                        unit_price: item.unit_price,
                        total_price: item.qty * item.unit_price,
                        reason_detail: item.reason_detail || null,
                    })),
                },
            },
            include: { items: true, retailer: true },
        });

        // Notify wholesaler
        const notification = await prisma.notification.create({
            data: {
                wholesaler_id,
                retailer_id: retailerId,
                type: 'NEW_ORDER', // reuse type for now
                title: 'New Return Request',
                body: `${returnRequest.retailer.shop_name} submitted a ${reason.toLowerCase()} return for ₹${totalAmount.toFixed(2)}`,
            },
        });

        io.to(`wholesaler_${wholesaler_id}`).emit('notification', notification);
        io.to(`wholesaler_${wholesaler_id}`).emit('new_return', returnRequest);

        res.status(201).json(returnRequest);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PATCH /api/returns/:id/status — Approve/Reject (wholesaler) ──────────
router.patch('/:id/status', requireRole('WHOLESALER'), async (req, res) => {
    try {
        const { status, rejection_note } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
        }

        const returnReq = await prisma.returnRequest.findFirst({
            where: {
                id: req.params.id,
                wholesaler_id: req.user!.wholesaler_id!,
            },
            include: { items: true, retailer: true },
        });

        if (!returnReq) {
            return res.status(404).json({ error: 'Return request not found' });
        }

        if (returnReq.status !== 'PENDING') {
            return res.status(400).json({ error: 'Return has already been processed' });
        }

        // Update status
        const updated = await prisma.returnRequest.update({
            where: { id: returnReq.id },
            data: {
                status,
                rejection_note: status === 'REJECTED' ? (rejection_note || null) : null,
            },
            include: { items: true, retailer: true, wholesaler: true },
        });

        // If approved, credit the retailer's ledger
        if (status === 'APPROVED') {
            await creditRetailer(
                returnReq.wholesaler_id,
                returnReq.retailer_id,
                returnReq.total_amount,
                returnReq.id,
                `Return approved: ${returnReq.reason.toLowerCase()} items — ₹${returnReq.total_amount.toFixed(2)}`
            );
        }

        // Notify retailer
        const notification = await prisma.notification.create({
            data: {
                wholesaler_id: returnReq.wholesaler_id,
                retailer_id: returnReq.retailer_id,
                type: 'ORDER_STATUS_CHANGED',
                title: status === 'APPROVED' ? 'Return Approved ✅' : 'Return Rejected ❌',
                body: status === 'APPROVED'
                    ? `Your ${returnReq.reason.toLowerCase()} return for ₹${returnReq.total_amount.toFixed(2)} has been approved and credited to your account.`
                    : `Your return was rejected. ${rejection_note || ''}`,
            },
        });

        io.to(`retailer_${returnReq.retailer_id}`).emit('notification', notification);
        io.to(`retailer_${returnReq.retailer_id}`).emit('return_updated', updated);
        io.to(`wholesaler_${returnReq.wholesaler_id}`).emit('return_updated', updated);

        res.json(updated);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
