import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('WHOLESALER'));

// GET /api/schemes — List active schemes for the wholesaler
router.get('/', async (req, res) => {
    try {
        const schemes = await prisma.scheme.findMany({
            where: { wholesaler_id: req.user!.wholesaler_id!, is_active: true },
            include: { medicine: { select: { name: true, brand: true, mrp: true, price: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(schemes);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/schemes — Create a new scheme
router.post('/', async (req, res) => {
    try {
        const { name, type, min_qty, free_qty, discount_pct, medicine_id } = req.body;

        // Validate inputs based on type
        if (!['BOGO', 'HALF_SCHEME', 'CASH_DISCOUNT'].includes(type)) {
            return res.status(400).json({ error: 'Invalid scheme type' });
        }

        if (type === 'BOGO' || type === 'HALF_SCHEME') {
            if (!min_qty || !free_qty || !medicine_id) {
                return res.status(400).json({ error: 'min_qty, free_qty, and medicine_id are required for item schemes' });
            }
        } else if (type === 'CASH_DISCOUNT') {
            if (!discount_pct) {
                return res.status(400).json({ error: 'discount_pct is required for CASH_DISCOUNT' });
            }
        }

        const scheme = await prisma.scheme.create({
            data: {
                wholesaler_id: req.user!.wholesaler_id!,
                name,
                type,
                min_qty: min_qty || null,
                free_qty: free_qty || null,
                discount_pct: discount_pct || null,
                medicine_id: medicine_id || null,
            },
            include: { medicine: { select: { name: true, brand: true, mrp: true, price: true } } }
        });
        res.status(201).json(scheme);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/schemes/:id — Make a scheme inactive
router.delete('/:id', async (req, res) => {
    try {
        const scheme = await prisma.scheme.findFirst({
            where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! }
        });
        if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

        await prisma.scheme.update({
            where: { id: scheme.id },
            data: { is_active: false }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
