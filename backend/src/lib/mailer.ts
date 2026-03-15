import nodemailer from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.zoho.in';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = process.env.SMTP_USER || 'noreply@pharmahead.app';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || 'Pharma Head <noreply@pharmahead.app>';

  return { host, port, secure, user, pass, from };
}

export async function sendMail(payload: MailPayload) {
  const config = getSmtpConfig();
  if (!config.pass) {
    throw new Error('SMTP_PASS is required to send email verification links.');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}
