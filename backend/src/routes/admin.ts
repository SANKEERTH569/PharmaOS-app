import { Router } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

/* ── Helper: verify admin JWT ──────────────────────────────────────────────── */
const requireAdmin = (req: any, res: any, next: any) => {
    try {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: 'Unauthorized' });
        const token = header.split(' ')[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if (payload.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden – admin only' });
        req.adminId = payload.id;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AUTH                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/admin/register
 * Create an admin account.
 * Body: { username, password, name, email? }
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, email } = req.body as {
            username: string; password: string; name: string; email?: string;
        };

        if (!username || !password || !name) {
            return res.status(400).json({ error: 'username, password and name are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existing = await prisma.admin.findUnique({ where: { username } });
        if (existing) return res.status(409).json({ error: 'Username already taken' });

        const password_hash = await bcrypt.hash(password, 10);
        const admin = await prisma.admin.create({
            data: { username, password_hash, name, email },
        });

        const token = jwt.sign(
            { id: admin.id, role: 'ADMIN' },
            process.env.JWT_SECRET!,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
        );

        const { password_hash: _pw, ...safe } = admin;
        return res.status(201).json({ token, user: safe, role: 'ADMIN' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/admin/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body as { username: string; password: string };
        if (!username || !password) {
            return res.status(400).json({ error: 'username and password are required' });
        }

        const admin = await prisma.admin.findUnique({ where: { username } });
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
        if (!admin.is_active) return res.status(403).json({ error: 'Account deactivated' });

        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: admin.id, role: 'ADMIN' },
            process.env.JWT_SECRET!,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
        );

        const { password_hash: _pw, ...safe } = admin;
        return res.json({ token, user: safe, role: 'ADMIN' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PLATFORM STATS                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/stats
 * Platform-wide statistics
 */
router.get('/stats', requireAdmin, async (_req, res) => {
    try {
        const [
            totalWholesalers, activeWholesalers,
            totalRetailers, activeRetailers,
            totalOrders, deliveredOrders,
            starterCount, growthCount, proCount,
        ] = await Promise.all([
            prisma.wholesaler.count(),
            prisma.wholesaler.count({ where: { is_active: true } }),
            prisma.retailer.count(),
            prisma.retailer.count({ where: { is_active: true } }),
            prisma.order.count(),
            prisma.order.count({ where: { status: 'DELIVERED' } }),
            prisma.wholesaler.count({ where: { plan: 'starter' } }),
            prisma.wholesaler.count({ where: { plan: 'growth' } }),
            prisma.wholesaler.count({ where: { plan: 'pro' } }),
        ]);
        const enterpriseCount = await prisma.wholesaler.count({ where: { plan: 'enterprise' } });

        // Revenue from delivered orders
        const revenueAgg = await prisma.order.aggregate({
            _sum: { total_amount: true },
            where: { status: 'DELIVERED' },
        });

        // Payments collected
        const paymentsAgg = await prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: 'COMPLETED' },
        });

        // Orders this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const ordersThisMonth = await prisma.order.count({
            where: { created_at: { gte: startOfMonth } },
        });

        // New registrations this month
        const newWholesalersThisMonth = await prisma.wholesaler.count({
            where: { created_at: { gte: startOfMonth } },
        });
        const newRetailersThisMonth = await prisma.retailer.count({
            where: { created_at: { gte: startOfMonth } },
        });

        res.json({
            totalWholesalers,
            activeWholesalers,
            totalRetailers,
            activeRetailers,
            totalOrders,
            deliveredOrders,
            totalRevenue: revenueAgg._sum.total_amount || 0,
            totalPayments: paymentsAgg._sum.amount || 0,
            ordersThisMonth,
            newWholesalersThisMonth,
            newRetailersThisMonth,
            planDistribution: {
                starter: starterCount,
                growth: growthCount,
                pro: proCount,
                enterprise: enterpriseCount,
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  WHOLESALER MANAGEMENT                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/wholesalers
 * List all wholesalers with optional search and plan filter
 */
router.get('/wholesalers', requireAdmin, async (req, res) => {
    try {
        const { search, plan, status } = req.query as { search?: string; plan?: string; status?: string };

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { username: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (plan) where.plan = plan;
        if (status === 'active') where.is_active = true;
        if (status === 'inactive') where.is_active = false;

        const wholesalers = await prisma.wholesaler.findMany({
            where,
            orderBy: { created_at: 'desc' },
            select: {
                id: true, username: true, name: true, phone: true, address: true,
                gstin: true, dl_number: true, email: true, plan: true, is_active: true, created_at: true,
                _count: { select: { retailers: true, orders: true, medicines: true } },
            },
        });

        // Get revenue per wholesaler (delivered orders)
        const revenueData = await prisma.order.groupBy({
            by: ['wholesaler_id'],
            _sum: { total_amount: true },
            where: { status: 'DELIVERED' },
        });
        const revenueMap = Object.fromEntries(revenueData.map(r => [r.wholesaler_id, r._sum.total_amount || 0]));

        const result = wholesalers.map(w => ({
            ...w,
            revenue: revenueMap[w.id] || 0,
        }));

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/admin/wholesalers/:id
 * Update wholesaler: toggle is_active, change plan
 */
router.patch('/wholesalers/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, plan } = req.body as { is_active?: boolean; plan?: string };

        const data: any = {};
        if (typeof is_active === 'boolean') data.is_active = is_active;
        if (plan && ['starter', 'growth', 'pro', 'enterprise'].includes(plan)) data.plan = plan;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const updated = await prisma.wholesaler.update({ where: { id }, data });
        const { password_hash: _pw, ...safe } = updated;
        res.json(safe);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RETAILER MANAGEMENT                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/retailers
 * List all retailers with optional search and status filter
 */
router.get('/retailers', requireAdmin, async (req, res) => {
    try {
        const { search, status } = req.query as { search?: string; status?: string };

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { shop_name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }
        if (status === 'active') where.is_active = true;
        if (status === 'inactive') where.is_active = false;

        const retailers = await prisma.retailer.findMany({
            where,
            orderBy: { created_at: 'desc' },
            select: {
                id: true, name: true, shop_name: true, phone: true, address: true,
                gstin: true, dl_number: true, credit_limit: true, current_balance: true,
                is_active: true, is_self_registered: true, created_at: true,
                wholesaler: { select: { id: true, name: true, phone: true } },
                _count: { select: { orders: true } },
            },
        });

        res.json(retailers);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/admin/retailers/:id
 * Toggle retailer is_active
 */
router.patch('/retailers/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body as { is_active?: boolean };

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'is_active (boolean) is required' });
        }

        const updated = await prisma.retailer.update({ where: { id }, data: { is_active } });
        const { password_hash: _pw, ...safe } = updated;
        res.json(safe);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ORDERS                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/orders
 * All orders across the platform with filters
 */
router.get('/orders', requireAdmin, async (req, res) => {
    try {
        const { status, wholesaler_id, limit } = req.query as {
            status?: string; wholesaler_id?: string; limit?: string;
        };

        const where: any = {};
        if (status) where.status = status;
        if (wholesaler_id) where.wholesaler_id = wholesaler_id;

        const orders = await prisma.order.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: parseInt(limit || '100', 10),
            include: {
                items: true,
                wholesaler: { select: { id: true, name: true } },
                retailer: { select: { id: true, name: true, shop_name: true } },
            },
        });

        res.json(orders);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  REVENUE                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/revenue
 * Revenue breakdown by month and by wholesaler
 */
router.get('/revenue', requireAdmin, async (req, res) => {
    try {
        // Revenue by wholesaler
        const byWholesaler = await prisma.order.groupBy({
            by: ['wholesaler_id'],
            _sum: { total_amount: true },
            _count: true,
            where: { status: 'DELIVERED' },
            orderBy: { _sum: { total_amount: 'desc' } },
        });

        // Get wholesaler names
        const wholesalerIds = byWholesaler.map(r => r.wholesaler_id);
        const wholesalers = await prisma.wholesaler.findMany({
            where: { id: { in: wholesalerIds } },
            select: { id: true, name: true, plan: true },
        });
        const wsMap = Object.fromEntries(wholesalers.map(w => [w.id, w]));

        const revenueByWholesaler = byWholesaler.map(r => ({
            wholesaler_id: r.wholesaler_id,
            wholesaler_name: wsMap[r.wholesaler_id]?.name || 'Unknown',
            plan: wsMap[r.wholesaler_id]?.plan || 'starter',
            total_revenue: r._sum.total_amount || 0,
            order_count: r._count,
        }));

        // Monthly revenue (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const recentOrders = await prisma.order.findMany({
            where: { status: 'DELIVERED', created_at: { gte: sixMonthsAgo } },
            select: { total_amount: true, created_at: true },
        });

        const monthlyRevenue: Record<string, number> = {};
        recentOrders.forEach(o => {
            const key = `${o.created_at.getFullYear()}-${String(o.created_at.getMonth() + 1).padStart(2, '0')}`;
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + o.total_amount;
        });

        res.json({ revenueByWholesaler, monthlyRevenue });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ACTIVITY FEED                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/activity
 * Recent platform activity (orders, payments, new registrations)
 */
router.get('/activity', requireAdmin, async (req, res) => {
    try {
        const limit = parseInt((req.query.limit as string) || '50', 10);

        // Recent orders
        const recentOrders = await prisma.order.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            select: {
                id: true, status: true, total_amount: true, created_at: true, invoice_no: true,
                retailer: { select: { name: true, shop_name: true } },
                wholesaler: { select: { name: true } },
            },
        });

        // Recent payments
        const recentPayments = await prisma.payment.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            select: {
                id: true, amount: true, method: true, status: true, created_at: true,
                retailer: { select: { name: true } },
                wholesaler: { select: { name: true } },
            },
        });

        // Recent registrations
        const recentWholesalers = await prisma.wholesaler.findMany({
            orderBy: { created_at: 'desc' },
            take: 10,
            select: { id: true, name: true, phone: true, plan: true, created_at: true },
        });

        const recentRetailers = await prisma.retailer.findMany({
            orderBy: { created_at: 'desc' },
            take: 10,
            select: { id: true, name: true, shop_name: true, phone: true, is_self_registered: true, created_at: true },
        });

        // Merge into unified activity feed
        type Activity = { id: string; type: string; description: string; detail: string; timestamp: string; meta?: any };
        const activities: Activity[] = [];

        recentOrders.forEach(o => {
            activities.push({
                id: o.id,
                type: 'ORDER',
                description: `Order ${o.status.toLowerCase()} — ₹${o.total_amount.toLocaleString('en-IN')}`,
                detail: `${o.retailer.shop_name || o.retailer.name} → ${o.wholesaler.name}`,
                timestamp: o.created_at.toISOString(),
                meta: { status: o.status, amount: o.total_amount },
            });
        });

        recentPayments.forEach(p => {
            activities.push({
                id: p.id,
                type: 'PAYMENT',
                description: `Payment ₹${p.amount.toLocaleString('en-IN')} via ${p.method}`,
                detail: `${p.retailer?.name || 'Unknown'} → ${p.wholesaler?.name || 'Unknown'}`,
                timestamp: p.created_at.toISOString(),
                meta: { method: p.method, amount: p.amount },
            });
        });

        recentWholesalers.forEach(w => {
            activities.push({
                id: w.id,
                type: 'REGISTRATION',
                description: `New sub-wholesaler registered: ${w.name}`,
                detail: `Plan: ${w.plan} · Phone: ${w.phone}`,
                timestamp: w.created_at.toISOString(),
                meta: { plan: w.plan },
            });
        });

        recentRetailers.forEach(r => {
            activities.push({
                id: r.id,
                type: 'REGISTRATION',
                description: `New retailer registered: ${r.shop_name || r.name}`,
                detail: `Phone: ${r.phone}${r.is_self_registered ? ' · Self-registered' : ''}`,
                timestamp: r.created_at.toISOString(),
            });
        });

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json(activities.slice(0, limit));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PLAN REQUESTS                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

router.get('/plan-requests', requireAdmin, async (req, res) => {
    try {
        const { status } = req.query as { status?: string };
        const where: any = {};
        if (status) where.status = status;
        const requests = await prisma.planRequest.findMany({
            where, orderBy: { created_at: 'desc' },
            include: { wholesaler: { select: { id: true, name: true, phone: true, plan: true } } },
        });
        res.json(requests);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/plan-requests/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, admin_note } = req.body as { action: string; admin_note?: string };
        if (!['APPROVED', 'REJECTED'].includes(action)) return res.status(400).json({ error: 'action must be APPROVED or REJECTED' });

        const request = await prisma.planRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

        const updated = await prisma.planRequest.update({ where: { id }, data: { status: action, admin_note: admin_note || null } });

        if (action === 'APPROVED') {
            await prisma.wholesaler.update({ where: { id: request.wholesaler_id }, data: { plan: request.requested_plan } });
            if (request.coupon_code) {
                await prisma.coupon.updateMany({ where: { code: request.coupon_code }, data: { used_count: { increment: 1 } } });
            }
        }
        res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  COUPON MANAGEMENT                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

router.get('/coupons', requireAdmin, async (_req, res) => {
    try { res.json(await prisma.coupon.findMany({ orderBy: { created_at: 'desc' } })); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/coupons', requireAdmin, async (req, res) => {
    try {
        const { code, discount_type, discount_value, max_uses, valid_plans, expires_at } = req.body;
        if (!code || !discount_type || discount_value == null) return res.status(400).json({ error: 'code, discount_type, discount_value required' });
        if (!['PERCENTAGE', 'FLAT'].includes(discount_type)) return res.status(400).json({ error: 'discount_type must be PERCENTAGE or FLAT' });
        const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (existing) return res.status(409).json({ error: 'Code already exists' });
        const coupon = await prisma.coupon.create({
            data: { code: code.toUpperCase(), discount_type, discount_value, max_uses: max_uses || 0, valid_plans: valid_plans || null, expires_at: expires_at ? new Date(expires_at) : null },
        });
        res.status(201).json(coupon);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/coupons/:id', requireAdmin, async (req, res) => {
    try {
        const updated = await prisma.coupon.update({ where: { id: req.params.id }, data: { is_active: req.body.is_active } });
        res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/coupons/:id', requireAdmin, async (req, res) => {
    try { await prisma.coupon.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
