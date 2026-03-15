import nodemailer from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type EmailProvider = 'auto' | 'smtp' | 'resend';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.zoho.in';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = process.env.SMTP_USER || 'noreply@pharmahead.app';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || 'Pharma Head <noreply@pharmahead.app>';
  const connectionTimeoutMs = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
  const greetingTimeoutMs = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
  const socketTimeoutMs = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    connectionTimeoutMs,
    greetingTimeoutMs,
    socketTimeoutMs,
  } as SmtpConfig;
}

function getEmailProvider(): EmailProvider {
  const provider = String(process.env.EMAIL_PROVIDER || 'auto').toLowerCase();
  if (provider === 'smtp' || provider === 'resend' || provider === 'auto') {
    return provider;
  }
  return 'auto';
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'Pharma Head <noreply@pharmahead.app>';
  const timeoutMs = Number(process.env.RESEND_TIMEOUT_MS || 10000);
  return { apiKey, from, timeoutMs };
}

function parseFallbacks(base: SmtpConfig): SmtpConfig[] {
  const fallbackHosts = (process.env.SMTP_FALLBACK_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  const fallbackPorts = (process.env.SMTP_FALLBACK_PORTS || '')
    .split(',')
    .map((p) => Number(p.trim()))
    .filter((p) => Number.isFinite(p) && p > 0);

  const configs: SmtpConfig[] = [];

  for (const host of fallbackHosts) {
    if (host === base.host) continue;
    const port = fallbackPorts[0] || base.port;
    const secure = base.secure || port === 465;
    configs.push({ ...base, host, port, secure });
  }

  for (const port of fallbackPorts) {
    if (port === base.port) continue;
    const secure = port === 465;
    configs.push({ ...base, port, secure });
  }

  return configs;
}

function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: config.connectionTimeoutMs,
    greetingTimeout: config.greetingTimeoutMs,
    socketTimeout: config.socketTimeoutMs,
    tls: {
      // Helps in environments where reverse DNS is flaky but cert CN is valid.
      servername: config.host,
    },
  });
}

function shouldRetry(error: any) {
  const code = String(error?.code || '').toUpperCase();
  return (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNECTION'
  );
}

async function sendViaResend(payload: MailPayload) {
  const config = getResendConfig();
  if (!config.apiKey) {
    throw new Error('RESEND_API_KEY is required when using Resend provider.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Resend API failed (${response.status}): ${body || response.statusText}`);
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Resend API request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaSmtp(payload: MailPayload) {
  const config = getSmtpConfig();
  if (!config.pass) {
    throw new Error('SMTP_PASS is required to send email verification links.');
  }

  const attempts = [config, ...parseFallbacks(config)];
  let lastError: any = null;

  for (let i = 0; i < attempts.length; i += 1) {
    const current = attempts[i];
    try {
      const transporter = createTransporter(current);
      await transporter.sendMail({
        from: current.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      return;
    } catch (error: any) {
      lastError = error;
      const hasMoreAttempts = i < attempts.length - 1;
      if (!hasMoreAttempts || !shouldRetry(error)) {
        break;
      }
    }
  }

  const code = lastError?.code ? ` (${lastError.code})` : '';
  throw new Error(`Email delivery failed${code}. Check SMTP host/port and outbound network access from production.`);
}

export async function sendMail(payload: MailPayload) {
  const provider = getEmailProvider();

  if (provider === 'resend') {
    await sendViaResend(payload);
    return;
  }

  if (provider === 'smtp') {
    await sendViaSmtp(payload);
    return;
  }

  try {
    await sendViaSmtp(payload);
  } catch (smtpErr: any) {
    // In auto mode, try HTTPS provider fallback if configured.
    const resendConfig = getResendConfig();
    if (resendConfig.apiKey) {
      await sendViaResend(payload);
      return;
    }
    throw smtpErr;
  }
}
