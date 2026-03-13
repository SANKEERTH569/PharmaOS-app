import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma, ReturnStatus, ComplaintStatus, LedgerType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ensureTicketTable } from './supportTickets';

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden - admin only' });
    req.adminId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/issues/summary', requireAdmin, async (_req, res) => {
  try {
    await ensureTicketTable();
    const [openComplaints, acknowledgedComplaints, pendingReturns, recentComplaints, recentReturns, openTickets] = await Promise.all([
      prisma.stockComplaint.count({ where: { status: 'OPEN' } }),
      prisma.stockComplaint.count({ where: { status: 'ACKNOWLEDGED' } }),
      prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      prisma.stockComplaint.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          complaint_type: true,
          status: true,
          created_at: true,
          wholesaler: { select: { name: true } },
          retailer: { select: { name: true, shop_name: true } },
        },
      }),
      prisma.returnRequest.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          reason: true,
          status: true,
          total_amount: true,
          created_at: true,
          wholesaler: { select: { name: true } },
          retailer: { select: { name: true, shop_name: true } },
        },
      }),
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM support_tickets WHERE status IN ('OPEN','IN_PROGRESS')`) as any,
    ]);

    res.json({
      openComplaints,
      acknowledgedComplaints,
      pendingReturns,
      openTickets: Array.isArray(openTickets) ? (openTickets[0]?.count || 0) : 0,
      needsAttention: openComplaints + pendingReturns + (Array.isArray(openTickets) ? (openTickets[0]?.count || 0) : 0),
      recentComplaints,
      recentReturns,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tickets', requireAdmin, async (req, res) => {
  try {
    await ensureTicketTable();
    const { status = 'all', search = '' } = req.query as { status?: string; search?: string };

    const whereParts: string[] = [];
    const params: any[] = [];

    if (status !== 'all') {
      params.push(String(status).toUpperCase());
      whereParts.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereParts.push(`(subject ILIKE $${params.length} OR requester_name ILIKE $${params.length} OR category ILIKE $${params.length} OR id ILIKE $${params.length})`);
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, requester_role, requester_id, requester_name, requester_phone, subject, category, priority, description, status, admin_note, created_at, updated_at, resolved_at, resolved_by_admin_id
       FROM support_tickets
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT 500`,
      ...params,
    );

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/tickets/:id', requireAdmin, async (req: any, res) => {
  try {
    await ensureTicketTable();
    const { status, admin_note } = req.body as { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; admin_note?: string };

    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid ticket status' });
    }

    const resolvedAt = status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : null;
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE support_tickets
       SET status = $1,
           admin_note = $2,
           updated_at = NOW(),
           resolved_at = CASE WHEN $3::text IS NULL THEN resolved_at ELSE $3::timestamptz END,
           resolved_by_admin_id = CASE WHEN $3::text IS NULL THEN resolved_by_admin_id ELSE $4 END
       WHERE id = $5
       RETURNING *`,
      status,
      admin_note || null,
      resolvedAt,
      req.adminId,
      req.params.id,
    ) as any[];

    if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/issues', requireAdmin, async (req, res) => {
  try {
    const { kind = 'all', status, wholesaler_id, search } = req.query as {
      kind?: string;
      status?: string;
      wholesaler_id?: string;
      search?: string;
    };

    const complaintWhere: Prisma.StockComplaintWhereInput = {};
    const returnWhere: Prisma.ReturnRequestWhereInput = {};

    if (status && kind !== 'returns') complaintWhere.status = status as ComplaintStatus;
    if (status && kind !== 'complaints') returnWhere.status = status as ReturnStatus;
    if (wholesaler_id) {
      complaintWhere.wholesaler_id = wholesaler_id;
      returnWhere.wholesaler_id = wholesaler_id;
    }

    if (search) {
      complaintWhere.OR = [
        { retailer: { name: { contains: search, mode: 'insensitive' } } },
        { retailer: { shop_name: { contains: search, mode: 'insensitive' } } },
        { wholesaler: { name: { contains: search, mode: 'insensitive' } } },
      ];
      returnWhere.OR = [
        { retailer: { name: { contains: search, mode: 'insensitive' } } },
        { retailer: { shop_name: { contains: search, mode: 'insensitive' } } },
        { wholesaler: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [complaints, returns] = await Promise.all([
      kind !== 'returns'
        ? prisma.stockComplaint.findMany({
            where: complaintWhere,
            orderBy: { created_at: 'desc' },
            include: {
              wholesaler: { select: { id: true, name: true } },
              retailer: { select: { id: true, name: true, shop_name: true, phone: true } },
              items: true,
            },
            take: 200,
          })
        : Promise.resolve([] as any[]),
      kind !== 'complaints'
        ? prisma.returnRequest.findMany({
            where: returnWhere,
            orderBy: { created_at: 'desc' },
            include: {
              wholesaler: { select: { id: true, name: true } },
              retailer: { select: { id: true, name: true, shop_name: true, phone: true } },
              items: true,
            },
            take: 200,
          })
        : Promise.resolve([] as any[]),
    ]);

    res.json({ complaints, returns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/issues/complaints/:id', requireAdmin, async (req, res) => {
  try {
    const { status, resolution_note } = req.body as { status: ComplaintStatus; resolution_note?: string };
    if (!['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid complaint status' });
    }

    const updated = await prisma.stockComplaint.update({
      where: { id: req.params.id },
      data: {
        status,
        resolution_note: resolution_note || null,
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/issues/returns/:id', requireAdmin, async (req, res) => {
  try {
    const { status, rejection_note } = req.body as { status: ReturnStatus; rejection_note?: string };
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid return status' });
    }

    const updated = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        rejection_note: rejection_note || null,
      },
      include: { retailer: true },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/collections/summary', requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const overdueCutoff = new Date(now);
    overdueCutoff.setDate(overdueCutoff.getDate() - 30);

    const [retailers, thisMonthPayments, completedPayments, deliveredRevenue] = await Promise.all([
      prisma.retailer.findMany({
        select: {
          id: true,
          name: true,
          shop_name: true,
          current_balance: true,
          credit_limit: true,
          last_payment_date: true,
          wholesaler: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED', created_at: { gte: startOfMonth } },
      }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
      prisma.order.aggregate({ _sum: { total_amount: true }, where: { status: 'DELIVERED' } }),
    ]);

    const totalOutstanding = retailers.reduce((s, r) => s + (r.current_balance || 0), 0);
    const riskyAccounts = retailers.filter(r => (r.credit_limit || 0) > 0 && (r.current_balance || 0) / (r.credit_limit || 1) >= 0.8);
    const overdueAccounts = retailers.filter(r => (r.current_balance || 0) > 0 && (!!r.last_payment_date ? r.last_payment_date < overdueCutoff : true));

    res.json({
      totalOutstanding,
      riskyAccounts: riskyAccounts.length,
      overdueAccounts: overdueAccounts.length,
      collectionRate: (deliveredRevenue._sum.total_amount || 0) > 0
        ? ((completedPayments._sum.amount || 0) / (deliveredRevenue._sum.total_amount || 1)) * 100
        : 0,
      thisMonthCollection: thisMonthPayments._sum.amount || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/collections/accounts', requireAdmin, async (req, res) => {
  try {
    const { risk = 'all' } = req.query as { risk?: string };

    const retailers = await prisma.retailer.findMany({
      include: {
        wholesaler: { select: { id: true, name: true } },
        _count: { select: { orders: true, payments: true } },
      },
      orderBy: { current_balance: 'desc' },
      take: 300,
    });

    const rows = retailers.map(r => {
      const utilization = (r.credit_limit || 0) > 0 ? (r.current_balance / r.credit_limit) * 100 : 0;
      const bucket = utilization >= 90 ? 'critical' : utilization >= 80 ? 'high' : utilization >= 50 ? 'medium' : 'low';
      return { ...r, utilization, risk: bucket };
    });

    const filtered = risk === 'all' ? rows : rows.filter(r => r.risk === risk);
    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/collections/ledger-adjustment', requireAdmin, async (req, res) => {
  try {
    const { wholesaler_id, retailer_id, amount, action, reason } = req.body as {
      wholesaler_id: string;
      retailer_id: string;
      amount: number;
      action: 'CREDIT' | 'DEBIT';
      reason: string;
    };

    if (!wholesaler_id || !retailer_id || !amount || amount <= 0 || !reason) {
      return res.status(400).json({ error: 'wholesaler_id, retailer_id, positive amount and reason are required' });
    }

    if (!['CREDIT', 'DEBIT'].includes(action)) {
      return res.status(400).json({ error: 'action must be CREDIT or DEBIT' });
    }

    const retailer = await prisma.retailer.findUnique({ where: { id: retailer_id } });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });

    const nextBalance = action === 'DEBIT'
      ? retailer.current_balance + amount
      : Math.max(0, retailer.current_balance - amount);

    const [updatedRetailer, ledgerEntry] = await prisma.$transaction([
      prisma.retailer.update({ where: { id: retailer_id }, data: { current_balance: nextBalance, last_payment_date: action === 'CREDIT' ? new Date() : retailer.last_payment_date } }),
      prisma.ledgerEntry.create({
        data: {
          wholesaler_id,
          retailer_id,
          type: action === 'CREDIT' ? LedgerType.CREDIT : LedgerType.DEBIT,
          amount,
          balance_after: nextBalance,
          description: `Admin adjustment: ${reason}`,
          reference_id: `ADMIN-${Date.now()}`,
        },
      }),
    ]);

    res.status(201).json({ updatedRetailer, ledgerEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/salesforce/summary', requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSalesmen, activeSalesmen, pendingLinks, callsThisMonth, ordersBySalesmen, targets] = await Promise.all([
      prisma.salesman.count(),
      prisma.salesman.count({ where: { is_active: true } }),
      prisma.salesmanWholesalerLink.count({ where: { status: 'PENDING' } }),
      prisma.dailyCallReport.count({ where: { visit_date: { gte: startOfMonth } } }),
      prisma.order.count({ where: { salesman_id: { not: null }, created_at: { gte: startOfMonth } } }),
      prisma.salesmanTarget.count({ where: { month: now.getMonth() + 1, year: now.getFullYear() } }),
    ]);

    res.json({
      totalSalesmen,
      activeSalesmen,
      pendingLinks,
      callsThisMonth,
      ordersBySalesmen,
      targetsConfigured: targets,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/salesforce/reps', requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const reps = await prisma.salesman.findMany({
      include: {
        wholesaler: { select: { id: true, name: true } },
        _count: { select: { call_reports: true, orders: true, beat_routes: true } },
        call_reports: {
          where: { visit_date: { gte: startOfMonth } },
          select: { id: true, outcome: true, visit_date: true },
          orderBy: { visit_date: 'desc' },
        },
        targets: {
          where: { month: now.getMonth() + 1, year: now.getFullYear() },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json(reps.map(r => ({
      ...r,
      callsThisMonth: r.call_reports.length,
      lastVisit: r.call_reports[0]?.visit_date || null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/salesforce/reps/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { is_active } = req.body as { is_active: boolean };
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active boolean is required' });

    const updated = await prisma.salesman.update({ where: { id: req.params.id }, data: { is_active } });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory/expiry', requireAdmin, async (req, res) => {
  try {
    const days = Math.max(parseInt((req.query.days as string) || '45', 10), 1);
    const upper = new Date();
    upper.setDate(upper.getDate() + days);

    const [nearExpiry, expired] = await Promise.all([
      prisma.medicineBatch.findMany({
        where: { expiry_date: { gte: new Date(), lte: upper }, stock_qty: { gt: 0 } },
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              wholesaler: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { expiry_date: 'asc' },
        take: 500,
      }),
      prisma.medicineBatch.findMany({
        where: { expiry_date: { lt: new Date() }, stock_qty: { gt: 0 } },
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              wholesaler: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { expiry_date: 'asc' },
        take: 500,
      }),
    ]);

    res.json({ nearExpiry, expired });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/compliance/overview', requireAdmin, async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      inactiveWholesalers,
      inactiveRetailers,
      inactiveSalesmen,
      failedReminders,
      openComplaints,
      pendingReturns,
      pendingPlanRequests,
      pendingSalesmanLinks,
      blockedAgencies,
    ] = await Promise.all([
      prisma.wholesaler.count({ where: { is_active: false } }),
      prisma.retailer.count({ where: { is_active: false } }),
      prisma.salesman.count({ where: { is_active: false } }),
      prisma.reminderLog.count({ where: { status: 'FAILED', sent_at: { gte: thirtyDaysAgo } } }),
      prisma.stockComplaint.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
      prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      prisma.planRequest.count({ where: { status: 'PENDING' } }),
      prisma.salesmanWholesalerLink.count({ where: { status: 'PENDING' } }),
      prisma.retailerAgency.count({ where: { status: 'BLOCKED' } }),
    ]);

    res.json({
      inactiveUsers: inactiveWholesalers + inactiveRetailers + inactiveSalesmen,
      failedReminders,
      unresolvedIssues: openComplaints + pendingReturns,
      pendingApprovals: pendingPlanRequests + pendingSalesmanLinks,
      blockedAgencies,
      breakdown: {
        inactiveWholesalers,
        inactiveRetailers,
        inactiveSalesmen,
        openComplaints,
        pendingReturns,
        pendingPlanRequests,
        pendingSalesmanLinks,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
