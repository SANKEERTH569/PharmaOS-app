/**
 * reminders.ts — Admin-only routes for managing payment reminders
 *
 * POST /api/reminders/trigger          — Manually fire reminders right now
 * GET  /api/reminders/logs             — View recent reminder logs (wholesaler-scoped or admin-global)
 * GET  /api/reminders/status           — Cron schedule info + last-run summary
 * GET  /api/reminders/preview          — Dry-run: list which retailers would be reminded today
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAnyRole } from '../middleware/auth';
import { sendPaymentReminders } from '../services/reminderService';
import { getCronStatus } from './reminderCron';

const router = Router();
router.use(authenticate);
router.use(requireAnyRole(['ADMIN', 'WHOLESALER']));

// ── POST /api/reminders/trigger ────────────────────────────────────────────
router.post('/trigger', async (req, res) => {
  try {
    console.log(`[ReminderRoute] Manual trigger by user ${req.user?.id} (${req.user?.role})`);
    const stats = await sendPaymentReminders();
    res.json({ ok: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reminders/logs ────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.limit as string || '100', 10), 500);
    const where: any = {};

    // Wholesalers only see their own logs; admins see all
    if (req.user?.role === 'WHOLESALER') {
      const wholesalerId = req.user.wholesaler_id || req.user.id;
      where.wholesaler_id = wholesalerId;
    }

    // Optional filters
    if (req.query.status) where.status = req.query.status;
    if (req.query.channel) where.channel = req.query.channel;
    if (req.query.retailer_id) where.retailer_id = req.query.retailer_id;

    const logs = await prisma.reminderLog.findMany({
      where,
      orderBy: { sent_at: 'desc' },
      take,
      include: {
        retailer: { select: { name: true, shop_name: true, phone: true } },
        wholesaler: { select: { name: true } },
      },
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reminders/status ──────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const cronStatus = getCronStatus();

    // Count logs from the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where: any = { sent_at: { gte: since } };
    if (req.user?.role === 'WHOLESALER') {
      where.wholesaler_id = req.user.wholesaler_id || req.user.id;
    }

    const [total, sent, failed] = await Promise.all([
      prisma.reminderLog.count({ where }),
      prisma.reminderLog.count({ where: { ...where, status: 'SENT' } }),
      prisma.reminderLog.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    res.json({
      cron: cronStatus,
      last24h: { total, sent, failed },
      channel: process.env.REMINDER_CHANNEL || 'IN_APP',
      minOverdueAmount: parseFloat(process.env.MIN_OVERDUE_AMOUNT || '1'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reminders/preview ─────────────────────────────────────────────
router.get('/preview', async (req, res) => {
  try {
    const minAmount = parseFloat(process.env.MIN_OVERDUE_AMOUNT || '1');
    const where: any = {
      current_balance: { gte: minAmount },
      is_active: true,
      wholesaler_id: { not: null },
    };

    if (req.user?.role === 'WHOLESALER') {
      where.wholesaler_id = req.user.wholesaler_id || req.user.id;
    }

    const retailers = await prisma.retailer.findMany({
      where,
      select: {
        id: true,
        name: true,
        shop_name: true,
        phone: true,
        current_balance: true,
        last_payment_date: true,
        wholesaler: { select: { name: true, upi_id: true } },
      },
      orderBy: { current_balance: 'desc' },
    });

    res.json({ count: retailers.length, retailers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
