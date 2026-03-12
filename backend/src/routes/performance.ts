import { Router } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = Router();

function getWholesalerId(req: any, res: any): string | null {
  const header = req.headers.authorization;
  if (!header) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== 'WHOLESALER') { res.status(403).json({ error: 'Forbidden' }); return null; }
    return payload.wholesaler_id;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

/**
 * GET /api/performance?month=3&year=2026
 * Manager scorecard for all salesmen
 */
router.get('/', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const month = parseInt((req.query.month as string) || String(new Date().getMonth() + 1));
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const salesmen = await prisma.salesman.findMany({
      where: { wholesaler_id },
      include: {
        targets: { where: { month, year } },
      },
    });

    const results = await Promise.all(
      salesmen.map(async (sm) => {
        const reports = await prisma.dailyCallReport.findMany({
          where: {
            salesman_id: sm.id,
            visit_date: { gte: startDate, lt: endDate },
          },
        });

        const visits_total = reports.length;
        const visits_with_order = reports.filter((r) => r.outcome === 'ORDER_TAKEN').length;
        const visits_no_order = reports.filter((r) => r.outcome === 'NO_ORDER').length;
        const collections_value = reports
          .filter((r) => r.outcome === 'PAYMENT_COLLECTED')
          .reduce((sum, r) => sum + (r.payment_amount || 0), 0);

        // Count orders created during this month tagged to this salesman's retailers
        // We approximate: orders where retailer is in salesman's beat, created this month
        const beatRetailers = await prisma.beatRetailer.findMany({
          where: { beat: { salesman_id: sm.id } },
          select: { retailer_id: true },
        });
        const retailerIds = beatRetailers.map((br) => br.retailer_id);

        let orders_value = 0;
        if (retailerIds.length > 0) {
          const orders = await prisma.order.findMany({
            where: {
              wholesaler_id,
              retailer_id: { in: retailerIds },
              created_at: { gte: startDate, lt: endDate },
            },
            select: { total_amount: true },
          });
          orders_value = orders.reduce((sum, o) => sum + o.total_amount, 0);
        }

        // New retailers onboarded this month where salesman's beat includes them
        const new_retailers = await prisma.retailer.count({
          where: {
            wholesaler_id,
            id: { in: retailerIds },
            created_at: { gte: startDate, lt: endDate },
          },
        });

        const { password_hash: _pw, ...safeSm } = sm as any;
        return {
          salesman: safeSm,
          target: sm.targets[0] || null,
          orders_value,
          collections_value,
          new_retailers,
          visits_total,
          visits_with_order,
          visits_no_order,
        };
      })
    );

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/performance/:salesmanId?month=3&year=2026
 * Individual salesman scorecard
 */
router.get('/:salesmanId', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const month = parseInt((req.query.month as string) || String(new Date().getMonth() + 1));
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()));
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const sm = await prisma.salesman.findFirst({
      where: { id: req.params.salesmanId, wholesaler_id },
      include: { targets: { where: { month, year } } },
    });
    if (!sm) return res.status(404).json({ error: 'Salesman not found' });

    const reports = await prisma.dailyCallReport.findMany({
      where: { salesman_id: sm.id, visit_date: { gte: startDate, lt: endDate } },
      include: { retailer: { select: { id: true, name: true, shop_name: true } } },
      orderBy: { visit_date: 'desc' },
    });

    const visits_total = reports.length;
    const visits_with_order = reports.filter((r) => r.outcome === 'ORDER_TAKEN').length;
    const visits_no_order = reports.filter((r) => r.outcome === 'NO_ORDER').length;
    const collections_value = reports
      .filter((r) => r.outcome === 'PAYMENT_COLLECTED')
      .reduce((sum, r) => sum + (r.payment_amount || 0), 0);

    const beatRetailers = await prisma.beatRetailer.findMany({
      where: { beat: { salesman_id: sm.id } },
      select: { retailer_id: true },
    });
    const retailerIds = beatRetailers.map((br) => br.retailer_id);

    let orders_value = 0;
    if (retailerIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { wholesaler_id, retailer_id: { in: retailerIds }, created_at: { gte: startDate, lt: endDate } },
        select: { total_amount: true },
      });
      orders_value = orders.reduce((sum, o) => sum + o.total_amount, 0);
    }

    const new_retailers = await prisma.retailer.count({
      where: { wholesaler_id, id: { in: retailerIds }, created_at: { gte: startDate, lt: endDate } },
    });

    const { password_hash: _pw, ...safeSm } = sm as any;
    res.json({
      salesman: safeSm,
      target: sm.targets[0] || null,
      orders_value,
      collections_value,
      new_retailers,
      visits_total,
      visits_with_order,
      visits_no_order,
      reports,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/performance/:salesmanId/targets
 * Set or update monthly targets for a salesman
 */
router.post('/:salesmanId/targets', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const sm = await prisma.salesman.findFirst({
      where: { id: req.params.salesmanId, wholesaler_id },
    });
    if (!sm) return res.status(404).json({ error: 'Salesman not found' });

    const { month, year, order_target, collection_target, new_retailers_target } = req.body as {
      month: number;
      year: number;
      order_target?: number;
      collection_target?: number;
      new_retailers_target?: number;
    };

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const target = await prisma.salesmanTarget.upsert({
      where: { salesman_id_month_year: { salesman_id: sm.id, month, year } },
      create: {
        wholesaler_id,
        salesman_id: sm.id,
        month,
        year,
        order_target: order_target || 0,
        collection_target: collection_target || 0,
        new_retailers_target: new_retailers_target || 0,
      },
      update: {
        order_target: order_target !== undefined ? order_target : undefined,
        collection_target: collection_target !== undefined ? collection_target : undefined,
        new_retailers_target: new_retailers_target !== undefined ? new_retailers_target : undefined,
      },
    });
    res.json(target);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
