/**
 * reminderService.ts
 *
 * Automated payment reminder service.
 * Runs via node-cron every morning at 9:00 AM IST (03:30 UTC).
 *
 * Channels (in priority order):
 *   1. WhatsApp (via Twilio) — includes UPI QR code image
 *   2. SMS (via Twilio)      — plain-text with UPI deep link
 *   3. In-app Notification   — always created regardless of channel success
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   — Twilio account SID
 *   TWILIO_AUTH_TOKEN    — Twilio auth token
 *   TWILIO_WHATSAPP_FROM — WhatsApp-enabled Twilio number, e.g. "whatsapp:+14155238886"
 *   TWILIO_SMS_FROM      — SMS-enabled Twilio number, e.g. "+14155238886"
 *   REMINDER_CHANNEL     — "WHATSAPP" | "SMS" | "IN_APP" (default: "IN_APP")
 *   MIN_OVERDUE_AMOUNT   — minimum balance to trigger reminder (default: 1)
 */

import { prisma } from '../lib/prisma';

// ── UPI helpers ────────────────────────────────────────────────────────────

/** Builds a UPI deep-link for the given wholesaler + amount */
function buildUpiLink(upiId: string, payeeName: string, amount: number): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: 'Payment for pharma supplies',
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Returns a publicly accessible QR-code PNG URL for the given UPI link.
 * Uses the free qrserver.com API — no key required.
 */
function buildQrImageUrl(upiLink: string): string {
  const encoded = encodeURIComponent(upiLink);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encoded}`;
}

// ── Message builder ────────────────────────────────────────────────────────

function buildReminderMessage(opts: {
  retailerName: string;
  shopName: string;
  wholesalerName: string;
  amountDue: number;
  upiId: string | null;
  upiLink: string | null;
}): string {
  const { retailerName, shopName, wholesalerName, amountDue, upiId, upiLink } = opts;
  const rupees = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amountDue);

  let msg =
    `Dear ${retailerName} (${shopName}),\n\n` +
    `This is a gentle reminder that you have an outstanding balance of *${rupees}* with *${wholesalerName}*.\n\n` +
    `We request you to clear the payment at the earliest to avoid any disruption to your orders.\n\n`;

  if (upiId) {
    msg += `💳 *Pay via UPI:* ${upiId}\n`;
  }
  if (upiLink) {
    msg += `📲 *Quick Pay Link:* ${upiLink}\n`;
  }

  msg += `\nThank you for your continued business!\n— ${wholesalerName}`;
  return msg;
}

// ── Twilio sender (lazy-loaded to avoid startup errors when not configured) ─

let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Twilio = require('twilio');
  twilioClient = new Twilio(sid, token);
  return twilioClient;
}

/** Normalise Indian phone numbers to E.164 (+91XXXXXXXXXX) */
function toE164India(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`; // already has country code
}

async function sendWhatsApp(to: string, message: string, mediaUrl?: string): Promise<void> {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio client not initialised — check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN env vars');

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error('TWILIO_WHATSAPP_FROM env var not set');

  const payload: Record<string, unknown> = {
    from,
    to: `whatsapp:${to}`,
    body: message,
  };
  if (mediaUrl) payload.mediaUrl = [mediaUrl];

  await client.messages.create(payload);
}

async function sendSMS(to: string, message: string): Promise<void> {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio client not initialised — check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN env vars');

  const from = process.env.TWILIO_SMS_FROM;
  if (!from) throw new Error('TWILIO_SMS_FROM env var not set');

  await client.messages.create({ from, to, body: message });
}

// ── Core job ───────────────────────────────────────────────────────────────

export interface ReminderStats {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Sends payment reminders to all retailers (across all wholesalers) who have
 * an outstanding balance ≥ MIN_OVERDUE_AMOUNT.
 *
 * Call this function from the cron job or a manual API trigger.
 */
export async function sendPaymentReminders(): Promise<ReminderStats> {
  const stats: ReminderStats = { total: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  const minAmount = parseFloat(process.env.MIN_OVERDUE_AMOUNT || '1');
  const channel = (process.env.REMINDER_CHANNEL || 'IN_APP').toUpperCase() as
    | 'WHATSAPP'
    | 'SMS'
    | 'IN_APP';

  // Fetch all retailers with a positive balance along with their wholesaler info
  const retailers = await prisma.retailer.findMany({
    where: {
      current_balance: { gte: minAmount },
      is_active: true,
      wholesaler_id: { not: null },
    },
    include: {
      wholesaler: {
        select: {
          id: true,
          name: true,
          upi_id: true,
          phone: true,
        },
      },
    },
  });

  stats.total = retailers.length;

  for (const retailer of retailers) {
    if (!retailer.wholesaler) {
      stats.skipped++;
      continue;
    }

    const wholesaler = retailer.wholesaler;
    const phone = toE164India(retailer.phone);
    const amountDue = retailer.current_balance;

    const upiLink = wholesaler.upi_id
      ? buildUpiLink(wholesaler.upi_id, wholesaler.name, amountDue)
      : null;
    const qrImageUrl = upiLink ? buildQrImageUrl(upiLink) : null;

    const message = buildReminderMessage({
      retailerName: retailer.name,
      shopName: retailer.shop_name,
      wholesalerName: wholesaler.name,
      amountDue,
      upiId: wholesaler.upi_id ?? null,
      upiLink,
    });

    let sentChannel = channel;
    let sendError: string | null = null;

    try {
      if (channel === 'WHATSAPP') {
        await sendWhatsApp(phone, message, qrImageUrl ?? undefined);
      } else if (channel === 'SMS') {
        await sendSMS(phone, message);
      }
      // IN_APP falls through to notification creation below
    } catch (err: any) {
      sendError = err.message ?? String(err);
      stats.errors.push(`[${retailer.name}] ${sendError}`);

      // Fallback: if WhatsApp fails, try SMS
      if (channel === 'WHATSAPP') {
        try {
          await sendSMS(phone, message);
          sentChannel = 'SMS';
          sendError = null; // fallback succeeded
        } catch (smsErr: any) {
          sendError = smsErr.message ?? String(smsErr);
        }
      }
    }

    // Always create an in-app notification (the retailer sees it in the app)
    try {
      await prisma.notification.create({
        data: {
          wholesaler_id: wholesaler.id,
          retailer_id: retailer.id,
          type: 'OVERDUE_REMINDER',
          title: 'Payment Reminder',
          body: `You have an outstanding balance of ₹${amountDue.toLocaleString('en-IN')} with ${wholesaler.name}. Please clear the dues at the earliest.`,
        },
      });
    } catch (_notifErr) {
      // Non-fatal — don't let notification failure block the log
    }

    // Log the result
    try {
      await prisma.reminderLog.create({
        data: {
          wholesaler_id: wholesaler.id,
          retailer_id: retailer.id,
          channel: sentChannel,
          status: sendError ? 'FAILED' : 'SENT',
          amount_due: amountDue,
          phone,
          error: sendError,
        },
      });
    } catch (_logErr) {
      // Logging failure is non-fatal
    }

    if (sendError) {
      stats.failed++;
    } else {
      stats.sent++;
    }
  }

  console.log(
    `[ReminderService] Run complete — total: ${stats.total}, sent: ${stats.sent}, failed: ${stats.failed}, skipped: ${stats.skipped}`
  );

  return stats;
}
