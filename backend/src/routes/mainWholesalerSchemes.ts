import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAnyRole } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(requireAnyRole(['MAIN_WHOLESALER', 'WHOLESALER'])); // Wholealer needs access to view them, MainWholesaler to manage them

// GET /api/main-wholesalers/schemes — List active schemes for the main wholesaler
// Accessible by the main wholesaler themselves
router.get('/', requireAnyRole(['MAIN_WHOLESALER']), async (req, res) => {
    try {
        const schemes = await prisma.mainWholesalerScheme.findMany({
            where: { main_wholesaler_id: req.user!.main_wholesaler_id!, is_active: true },
            include: { medicine: { select: { medicine_name: true, brand: true, mrp: true, price: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(schemes);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/main-wholesalers/schemes/:mainWholesalerId — List active schemes for a SPECIFIC main wholesaler
// Accessible by sub-wholesalers to see what schemes their specific supplier has
router.get('/:mainWholesalerId', requireAnyRole(['WHOLESALER', 'MAIN_WHOLESALER']), async (req, res) => {
    try {
        const schemes = await prisma.mainWholesalerScheme.findMany({
            where: { main_wholesaler_id: req.params.mainWholesalerId, is_active: true },
            include: { medicine: { select: { medicine_name: true, brand: true, mrp: true, price: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(schemes);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


// POST /api/main-wholesalers/schemes — Create a new scheme
router.post('/', requireAnyRole(['MAIN_WHOLESALER']), async (req, res) => {
    try {
        const { name, type, min_qty, free_qty, discount_pct, medicine_id } = req.body;

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

        const scheme = await prisma.mainWholesalerScheme.create({
            data: {
                main_wholesaler_id: req.user!.main_wholesaler_id!,
                name,
                type,
                min_qty: min_qty || null,
                free_qty: free_qty || null,
                discount_pct: discount_pct || null,
                medicine_id: medicine_id || null,
            },
            include: { medicine: { select: { medicine_name: true, brand: true, mrp: true, price: true } } }
        });
        res.status(201).json(scheme);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/main-wholesalers/schemes/:id — Make a scheme inactive
router.delete('/:id', requireAnyRole(['MAIN_WHOLESALER']), async (req, res) => {
    try {
        const scheme = await prisma.mainWholesalerScheme.findFirst({
            where: { id: req.params.id, main_wholesaler_id: req.user!.main_wholesaler_id! }
        });
        if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

        await prisma.mainWholesalerScheme.update({
            where: { id: scheme.id },
            data: { is_active: false }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
