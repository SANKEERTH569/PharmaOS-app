import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { io } from '../index';

const router = Router();
router.use(authenticate);

// ─── GET /api/stock-complaints — List complaints ──────────────────────────
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

        const complaints = await prisma.stockComplaint.findMany({
            where,
            include: {
                items: true,
                retailer: { select: { id: true, name: true, shop_name: true, phone: true } },
                wholesaler: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        res.json(complaints);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/stock-complaints — Submit complaint (retailer) ─────────────
router.post('/', requireRole('RETAILER'), async (req, res) => {
    try {
        const { wholesaler_id, order_id, complaint_type, notes, items } = req.body;

        if (!wholesaler_id || !complaint_type || !items || items.length === 0) {
            return res.status(400).json({ error: 'wholesaler_id, complaint_type, and items are required' });
        }

        const validTypes = ['SHORT_DELIVERY', 'WRONG_ITEM', 'MISSING_ITEM'];
        if (!validTypes.includes(complaint_type)) {
            return res.status(400).json({ error: 'Invalid complaint_type' });
        }

        const retailerId = req.user!.retailer_id!;

        const complaint = await prisma.stockComplaint.create({
            data: {
                wholesaler_id,
                retailer_id: retailerId,
                order_id: order_id || null,
                complaint_type,
                notes: notes || null,
                items: {
                    create: items.map((item: any) => ({
                        medicine_name: item.medicine_name,
                        ordered_qty: item.ordered_qty,
                        received_qty: item.received_qty,
                        unit_price: item.unit_price,
                    })),
                },
            },
            include: { items: true, retailer: true, wholesaler: true },
        });

        // Notify wholesaler
        const notification = await prisma.notification.create({
            data: {
                wholesaler_id,
                retailer_id: retailerId,
                type: 'NEW_ORDER',
                title: 'Stock Complaint Received',
                body: `${complaint.retailer.shop_name} raised a ${complaint_type.toLowerCase().replace('_', ' ')} complaint for ${items.length} item(s)`,
            },
        });

        io.to(`wholesaler_${wholesaler_id}`).emit('notification', notification);
        io.to(`wholesaler_${wholesaler_id}`).emit('new_stock_complaint', complaint);

        res.status(201).json(complaint);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PATCH /api/stock-complaints/:id/status — Update status (wholesaler) ──
router.patch('/:id/status', requireRole('WHOLESALER'), async (req, res) => {
    try {
        const { status, resolution_note } = req.body;

        const validStatuses = ['ACKNOWLEDGED', 'RESOLVED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'status must be ACKNOWLEDGED or RESOLVED' });
        }

        const complaint = await prisma.stockComplaint.findFirst({
            where: {
                id: req.params.id,
                wholesaler_id: req.user!.wholesaler_id!,
            },
            include: { items: true, retailer: true },
        });

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        if (complaint.status === 'RESOLVED') {
            return res.status(400).json({ error: 'Complaint already resolved' });
        }

        const updated = await prisma.stockComplaint.update({
            where: { id: complaint.id },
            data: {
                status,
                resolution_note: resolution_note || null,
            },
            include: { items: true, retailer: true, wholesaler: true },
        });

        // Notify retailer
        const notification = await prisma.notification.create({
            data: {
                wholesaler_id: complaint.wholesaler_id,
                retailer_id: complaint.retailer_id,
                type: 'ORDER_STATUS_CHANGED',
                title: status === 'RESOLVED' ? 'Complaint Resolved ✅' : 'Complaint Acknowledged 👀',
                body: status === 'RESOLVED'
                    ? `Your stock complaint has been resolved. ${resolution_note || ''}`
                    : `Your stock complaint has been acknowledged and is being reviewed.`,
            },
        });

        io.to(`retailer_${complaint.retailer_id}`).emit('notification', notification);
        io.to(`retailer_${complaint.retailer_id}`).emit('complaint_updated', updated);
        io.to(`wholesaler_${complaint.wholesaler_id}`).emit('complaint_updated', updated);

        res.json(updated);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
