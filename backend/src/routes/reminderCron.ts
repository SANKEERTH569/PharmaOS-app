/**
 * reminderCron.ts
 *
 * Initialises the node-cron job that fires payment reminders every morning
 * at 09:00 AM IST (03:30 UTC).
 *
 * Call `startReminderCron()` once during app startup.
 * Call `getCronStatus()` to read the last run time (used by the status API).
 */

import cron from 'node-cron';
import { sendPaymentReminders, ReminderStats } from '../services/reminderService';

// ── State ──────────────────────────────────────────────────────────────────

interface CronStatus {
  isRunning: boolean;
  schedule: string;
  timezone: string;
  lastRunAt: string | null;
  lastRunStats: ReminderStats | null;
  nextRunDescription: string;
}

let _status: CronStatus = {
  isRunning: false,
  schedule: '30 3 * * *',          // 03:30 UTC = 09:00 IST
  timezone: 'Asia/Kolkata',
  lastRunAt: null,
  lastRunStats: null,
  nextRunDescription: 'Every day at 09:00 AM IST',
};

export function getCronStatus(): CronStatus {
  return { ..._status };
}

// ── Job ────────────────────────────────────────────────────────────────────

export function startReminderCron(): void {
  const schedule = process.env.REMINDER_CRON_SCHEDULE || '30 3 * * *';

  if (!cron.validate(schedule)) {
    console.error(`[ReminderCron] Invalid cron expression "${schedule}" — cron NOT started`);
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      if (_status.isRunning) {
        console.warn('[ReminderCron] Previous run still in progress — skipping this tick');
        return;
      }

      console.log('[ReminderCron] Starting scheduled payment reminders…');
      _status.isRunning = true;
      _status.lastRunAt = new Date().toISOString();

      try {
        const stats = await sendPaymentReminders();
        _status.lastRunStats = stats;
        console.log('[ReminderCron] Completed:', stats);
      } catch (err: any) {
        console.error('[ReminderCron] Unhandled error:', err.message);
        _status.lastRunStats = {
          total: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          errors: [err.message],
        };
      } finally {
        _status.isRunning = false;
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  _status.schedule = schedule;
  console.log(`[ReminderCron] ✅ Scheduled — "${schedule}" (Asia/Kolkata) → runs at 09:00 AM IST daily`);
}
