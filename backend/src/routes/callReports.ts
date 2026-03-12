import { Router } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = Router();

function getAuth(req: any): { wholesaler_id: string | null; salesman_id: string | null; role: string | null } {
  const header = req.headers.authorization;
  if (!header) return { wholesaler_id: null, salesman_id: null, role: null };
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return {
      wholesaler_id: payload.wholesaler_id || null,
      salesman_id: payload.salesman_id || null,
      role: payload.role || null,
    };
  } catch {
    return { wholesaler_id: null, salesman_id: null, role: null };
  }
}

/**
 * POST /api/call-reports
 * Salesman (or manager on behalf) submits a daily call report
 */
router.post('/', async (req, res) => {
  const auth = getAuth(req);
  if (!auth.wholesaler_id || (auth.role !== 'SALESMAN' && auth.role !== 'WHOLESALER')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      retailer_id,
      outcome,
      order_id,
      payment_amount,
      notes,
      lat,
      lng,
      salesman_id: body_salesman_id,
      visit_date,
    } = req.body as {
      retailer_id: string;
      outcome: string;
      order_id?: string;
      payment_amount?: number;
      notes?: string;
      lat?: number;
      lng?: number;
      salesman_id?: string; // Only used when role=WHOLESALER to submit on behalf
      visit_date?: string;
    };

    if (!retailer_id || !outcome) {
      return res.status(400).json({ error: 'retailer_id and outcome are required' });
    }

    const validOutcomes = ['ORDER_TAKEN', 'NO_ORDER', 'PAYMENT_COLLECTED', 'NOT_VISITED'];
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({ error: `outcome must be one of: ${validOutcomes.join(', ')}` });
    }

    // Determine which salesman is reporting
    let effective_salesman_id = auth.salesman_id;
    if (auth.role === 'WHOLESALER') {
      if (!body_salesman_id) return res.status(400).json({ error: 'salesman_id is required when submitting as manager' });
      const s = await prisma.salesman.findFirst({ where: { id: body_salesman_id, wholesaler_id: auth.wholesaler_id! } });
      if (!s) return res.status(400).json({ error: 'Salesman not found' });
      effective_salesman_id = body_salesman_id;
    }

    if (!effective_salesman_id) return res.status(400).json({ error: 'Could not determine salesman' });

    const report = await prisma.dailyCallReport.create({
      data: {
        wholesaler_id: auth.wholesaler_id!,
        salesman_id: effective_salesman_id,
        retailer_id,
        outcome: outcome as any,
        order_id: order_id || null,
        payment_amount: payment_amount || null,
        notes: notes || null,
        lat: lat || null,
        lng: lng || null,
        visit_date: visit_date ? new Date(visit_date) : new Date(),
      },
      include: {
        salesman: { select: { id: true, name: true } },
        retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true } },
      },
    });
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/call-reports
 * Manager: see all reports (filterable by salesman_id, date range)
 * Salesman: see own reports only
 */
router.get('/', async (req, res) => {
  const auth = getAuth(req);
  if (!auth.wholesaler_id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { salesman_id, from, to, retailer_id } = req.query as {
      salesman_id?: string;
      from?: string;
      to?: string;
      retailer_id?: string;
    };

    const where: any = { wholesaler_id: auth.wholesaler_id };
    // Salesmen can only see their own reports
    if (auth.role === 'SALESMAN') {
      where.salesman_id = auth.salesman_id;
    } else if (salesman_id) {
      where.salesman_id = salesman_id;
    }

    if (retailer_id) where.retailer_id = retailer_id;

    if (from || to) {
      where.visit_date = {};
      if (from) where.visit_date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.visit_date.lte = toDate;
      }
    }

    const reports = await prisma.dailyCallReport.findMany({
      where,
      orderBy: { visit_date: 'desc' },
      include: {
        salesman: { select: { id: true, name: true } },
        retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true } },
      },
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/call-reports/today
 * For salesman: their beat retailers for today + visit status
 */
router.get('/today', async (req, res) => {
  const auth = getAuth(req);
  if (!auth.wholesaler_id || auth.role !== 'SALESMAN' || !auth.salesman_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Collect all wholesaler IDs this salesman is linked to (approved)
    const approvedLinks = await prisma.salesmanWholesalerLink.findMany({
      where: { salesman_id: auth.salesman_id, status: 'APPROVED' },
      select: { wholesaler_id: true },
    });
    const linkedWholesalerIds = approvedLinks.map((l: any) => l.wholesaler_id);
    if (auth.wholesaler_id && !linkedWholesalerIds.includes(auth.wholesaler_id)) {
      linkedWholesalerIds.push(auth.wholesaler_id);
    }

    // Get assigned beat retailers across all linked wholesalers
    const beats = await prisma.beatRoute.findMany({
      where: { salesman_id: auth.salesman_id, wholesaler_id: { in: linkedWholesalerIds } },
      include: {
        retailers: {
          include: { retailer: { select: { id: true, name: true, shop_name: true, phone: true, address: true, current_balance: true } } },
        },
      },
    });

    // Today's reports
    const todayReports = await prisma.dailyCallReport.findMany({
      where: {
        salesman_id: auth.salesman_id,
        visit_date: { gte: todayStart, lte: todayEnd },
      },
    });
    const visitedMap = new Map(todayReports.map((r) => [r.retailer_id, r]));

    const result = beats.map((beat) => ({
      beat: { id: beat.id, name: beat.name },
      retailers: beat.retailers.map((br) => ({
        retailer: br.retailer,
        visit: visitedMap.get(br.retailer_id) || null,
      })),
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
