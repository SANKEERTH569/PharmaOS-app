import { Router } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { verifyFirebasePhoneToken } from '../lib/firebaseAdmin';
import { sendMail } from '../lib/mailer';

const router = Router();
const EMAIL_VERIFICATION_TTL_HOURS = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

function getFrontendUrl() {
  return (
    process.env.EMAIL_VERIFICATION_FRONTEND_URL ||
    process.env.CLIENT_URL ||
    'https://pharmahead.app'
  ).replace(/\/$/, '');
}

async function sendVerificationEmail(args: { email: string; role: 'WHOLESALER' | 'MAIN_WHOLESALER'; token: string; name: string }) {
  const verifyLink = `${getFrontendUrl()}/#/verify-email?token=${encodeURIComponent(args.token)}&role=${args.role}`;
  const subject = 'Verify your Pharma Head account email';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p>Hi ${args.name},</p>
      <p>Thanks for registering on Pharma Head. Please verify your email to activate login.</p>
      <p>
        <a href="${verifyLink}" style="display:inline-block;padding:10px 14px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;">Verify Email</a>
      </p>
      <p>If the button does not work, copy and paste this link:</p>
      <p>${verifyLink}</p>
      <p>This link expires in ${EMAIL_VERIFICATION_TTL_HOURS} hours.</p>
      <p>If you did not create this account, please ignore this email.</p>
    </div>
  `;

  await sendMail({
    to: args.email,
    subject,
    html,
    text: `Hi ${args.name}, verify your Pharma Head account: ${verifyLink} (expires in ${EMAIL_VERIFICATION_TTL_HOURS} hours).`,
  });
}

function toComparablePhone(phone: string): string {
  const raw = (phone || '').trim();
  const digits = raw.replace(/\D/g, '');

  // Default to India country code for 10-digit local mobile input.
  if (!raw.startsWith('+') && digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

/**
 * POST /api/auth/register
 * Wholesaler self-registration.
 * Body: { username, password, name, phone, email, address? }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, phone, email, address } = req.body as {
      username: string;
      password: string;
      name: string;
      phone: string;
      email: string;
      address?: string;
      firebase_id_token?: string;
    };

    const { firebase_id_token } = req.body as { firebase_id_token?: string };

    if (!username || !password || !name || !phone || !email) {
      return res.status(400).json({ error: 'username, password, name, phone and email are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (firebase_id_token) {
      let verifiedPhone: string;
      try {
        verifiedPhone = await verifyFirebasePhoneToken(firebase_id_token);
      } catch (e: any) {
        return res.status(400).json({ error: e.message || 'Phone verification failed' });
      }

      if (toComparablePhone(verifiedPhone) !== toComparablePhone(phone)) {
        return res.status(400).json({ error: 'Verified phone does not match entered phone number' });
      }
    }

    const existing = await prisma.wholesaler.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }

    const existingPhone = await prisma.wholesaler.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(409).json({ error: 'Phone number already registered.' });
    }

    const existingEmail = await prisma.wholesaler.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered. Please use another email.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { token, tokenHash, expiresAt } = createVerificationToken();

    const wholesaler = await prisma.wholesaler.create({
      data: {
        username,
        password_hash,
        name,
        phone,
        email: normalizedEmail,
        address,
        plan: 'starter',
        email_verified: false,
        email_verification_token_hash: tokenHash,
        email_verification_expires_at: expiresAt,
        email_verification_sent_at: new Date(),
      },
    });

    let emailSent = true;
    try {
      await sendVerificationEmail({ email: normalizedEmail, role: 'WHOLESALER', token, name });
    } catch (emailErr: any) {
      emailSent = false;
      console.error('Failed to send verification email (WHOLESALER register):', emailErr?.message || emailErr);
    }

    const { password_hash: _pw, ...safeWholesaler } = wholesaler;
    return res.status(201).json({
      requires_email_verification: true,
      email_sent: emailSent,
      message: emailSent
        ? 'Registration successful. Please verify your email before login.'
        : 'Registration successful, but verification email could not be sent right now. Please use resend verification.',
      user: safeWholesaler,
      role: 'WHOLESALER',
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Wholesaler: { username, password, role: 'WHOLESALER' }
 * Retailer:   { phone, password, role: 'RETAILER' }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, phone, password, role } = req.body as {
      username?: string;
      phone?: string;
      password: string;
      role: 'WHOLESALER' | 'RETAILER' | 'ADMIN' | 'MAIN_WHOLESALER' | 'SALESMAN';
    };

    if (!password || !role) {
      return res.status(400).json({ error: 'password and role are required' });
    }

    if (role === 'WHOLESALER') {
      if (!username) return res.status(400).json({ error: 'username is required for wholesaler login' });

      const wholesaler = await prisma.wholesaler.findUnique({ where: { username } });
      if (!wholesaler) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (!wholesaler.password_hash) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      const valid = await bcrypt.compare(password, wholesaler.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (wholesaler.email && !wholesaler.email_verified) {
        return res.status(403).json({
          error: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: wholesaler.email,
          role: 'WHOLESALER',
        });
      }

      const token = jwt.sign(
        { id: wholesaler.id, role: 'WHOLESALER', wholesaler_id: wholesaler.id },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
      );

      const { password_hash: _pw, ...safeWholesaler } = wholesaler;
      return res.json({ token, user: safeWholesaler, role: 'WHOLESALER' });
    }

    if (role === 'RETAILER') {
      if (!phone) return res.status(400).json({ error: 'phone is required for retailer login' });

      const retailer = await prisma.retailer.findFirst({ where: { phone } });
      if (!retailer) {
        return res.status(404).json({ error: 'Retailer not found. Contact your wholesaler.' });
      }

      if (!retailer.password_hash) {
        return res.status(403).json({ error: 'Account not activated. Contact your wholesaler to set your password.' });
      }

      const valid = await bcrypt.compare(password, retailer.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid phone number or password' });
      }

      const token = jwt.sign(
        {
          id: retailer.id,
          role: 'RETAILER',
          wholesaler_id: retailer.wholesaler_id,
          retailer_id: retailer.id,
        },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
      );

      const { password_hash: _pw, ...safeRetailer } = retailer;
      return res.json({ token, user: safeRetailer, role: 'RETAILER' });
    }

    if (role === 'ADMIN') {
      if (!username) return res.status(400).json({ error: 'username is required for admin login' });

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

      const { password_hash: _pw, ...safeAdmin } = admin;
      return res.json({ token, user: safeAdmin, role: 'ADMIN' });
    }

    if (role === 'SALESMAN') {
      if (!username) return res.status(400).json({ error: 'username is required for salesman login' });

      const salesman = await prisma.salesman.findUnique({ where: { username } });
      if (!salesman) return res.status(401).json({ error: 'Invalid username or password' });
      if (!salesman.is_active) return res.status(403).json({ error: 'Account deactivated. Contact your manager.' });

      const valid = await bcrypt.compare(password, salesman.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

      const token = jwt.sign(
        { id: salesman.id, role: 'SALESMAN', wholesaler_id: salesman.wholesaler_id, salesman_id: salesman.id },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
      );

      const { password_hash: _pw, ...safeSalesman } = salesman;
      return res.json({ token, user: safeSalesman, role: 'SALESMAN' });
    }

    if (role === 'MAIN_WHOLESALER') {
      if (!username) return res.status(400).json({ error: 'username is required for wholesaler login' });

      const mw = await prisma.mainWholesaler.findUnique({ where: { username } });
      if (!mw) return res.status(401).json({ error: 'Invalid username or password' });
      if (!mw.is_active) return res.status(403).json({ error: 'Account deactivated' });

      const valid = await bcrypt.compare(password, mw.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

      if (mw.email && !mw.email_verified) {
        return res.status(403).json({
          error: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: mw.email,
          role: 'MAIN_WHOLESALER',
        });
      }

      const token = jwt.sign(
        { id: mw.id, role: 'MAIN_WHOLESALER', main_wholesaler_id: mw.id, wholesaler_id: null },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
      );

      const { password_hash: _pw, ...safeMW } = mw;
      return res.json({ token, user: safeMW, role: 'MAIN_WHOLESALER' });
    }

    return res.status(400).json({ error: 'Invalid role' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/register/main-wholesaler
 * Wholesaler (tier above sub-wholesaler) self-registration.
 * Body: { username, password, name, phone, email, address?, gstin? }
 */
router.post('/register/main-wholesaler', async (req, res) => {
  try {
    const { username, password, name, phone, email, address, gstin } = req.body as {
      username: string;
      password: string;
      name: string;
      phone: string;
      email: string;
      address?: string;
      gstin?: string;
      firebase_id_token?: string;
    };

    const { firebase_id_token } = req.body as { firebase_id_token?: string };

    if (!username || !password || !name || !phone || !email) {
      return res.status(400).json({ error: 'username, password, name, phone and email are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (firebase_id_token) {
      let verifiedPhone: string;
      try {
        verifiedPhone = await verifyFirebasePhoneToken(firebase_id_token);
      } catch (e: any) {
        return res.status(400).json({ error: e.message || 'Phone verification failed' });
      }

      if (toComparablePhone(verifiedPhone) !== toComparablePhone(phone)) {
        return res.status(400).json({ error: 'Verified phone does not match entered phone number' });
      }
    }

    const existing = await prisma.mainWholesaler.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }

    const existingPhone = await prisma.mainWholesaler.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(409).json({ error: 'Phone number already registered.' });
    }

    const existingEmail = await prisma.mainWholesaler.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered. Please use another email.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { token, tokenHash, expiresAt } = createVerificationToken();

    const mainWholesaler = await prisma.mainWholesaler.create({
      data: {
        username,
        password_hash,
        name,
        phone,
        email: normalizedEmail,
        address,
        gstin,
        email_verified: false,
        email_verification_token_hash: tokenHash,
        email_verification_expires_at: expiresAt,
        email_verification_sent_at: new Date(),
      },
    });

    let emailSent = true;
    try {
      await sendVerificationEmail({ email: normalizedEmail, role: 'MAIN_WHOLESALER', token, name });
    } catch (emailErr: any) {
      emailSent = false;
      console.error('Failed to send verification email (MAIN_WHOLESALER register):', emailErr?.message || emailErr);
    }

    const { password_hash: _pw, ...safe } = mainWholesaler;
    return res.status(201).json({
      requires_email_verification: true,
      email_sent: emailSent,
      message: emailSent
        ? 'Registration successful. Please verify your email before login.'
        : 'Registration successful, but verification email could not be sent right now. Please use resend verification.',
      user: safe,
      role: 'MAIN_WHOLESALER',
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token, role } = req.body as { token?: string; role?: 'WHOLESALER' | 'MAIN_WHOLESALER' };
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    if (!role || !['WHOLESALER', 'MAIN_WHOLESALER'].includes(role)) {
      return res.status(400).json({ error: 'role must be WHOLESALER or MAIN_WHOLESALER' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    if (role === 'WHOLESALER') {
      const wholesaler = await prisma.wholesaler.findFirst({
        where: {
          email_verification_token_hash: tokenHash,
          email_verification_expires_at: { gt: now },
        },
      });

      if (!wholesaler) {
        return res.status(400).json({ error: 'Invalid or expired verification link' });
      }

      await prisma.wholesaler.update({
        where: { id: wholesaler.id },
        data: {
          email_verified: true,
          email_verification_token_hash: null,
          email_verification_expires_at: null,
        },
      });
    } else {
      const mainWholesaler = await prisma.mainWholesaler.findFirst({
        where: {
          email_verification_token_hash: tokenHash,
          email_verification_expires_at: { gt: now },
        },
      });

      if (!mainWholesaler) {
        return res.status(400).json({ error: 'Invalid or expired verification link' });
      }

      await prisma.mainWholesaler.update({
        where: { id: mainWholesaler.id },
        data: {
          email_verified: true,
          email_verification_token_hash: null,
          email_verification_expires_at: null,
        },
      });
    }

    return res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to verify email' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email, role } = req.body as { email?: string; role?: 'WHOLESALER' | 'MAIN_WHOLESALER' };
    if (!email || !role) {
      return res.status(400).json({ error: 'email and role are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const { token, tokenHash, expiresAt } = createVerificationToken();

    if (role === 'WHOLESALER') {
      const wholesaler = await prisma.wholesaler.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });

      if (!wholesaler || !wholesaler.email) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (wholesaler.email_verified) {
        return res.status(400).json({ error: 'Email is already verified' });
      }

      const previousTokenHash = wholesaler.email_verification_token_hash;
      const previousExpiresAt = wholesaler.email_verification_expires_at;
      const previousSentAt = wholesaler.email_verification_sent_at;

      await prisma.wholesaler.update({
        where: { id: wholesaler.id },
        data: {
          email_verification_token_hash: tokenHash,
          email_verification_expires_at: expiresAt,
          email_verification_sent_at: new Date(),
        },
      });

      try {
        await sendVerificationEmail({
          email: wholesaler.email,
          role: 'WHOLESALER',
          token,
          name: wholesaler.name,
        });
      } catch (emailErr: any) {
        // Restore previous token values so already-sent links are not invalidated on transient SMTP failures.
        await prisma.wholesaler.update({
          where: { id: wholesaler.id },
          data: {
            email_verification_token_hash: previousTokenHash,
            email_verification_expires_at: previousExpiresAt,
            email_verification_sent_at: previousSentAt,
          },
        });
        return res.status(503).json({
          error: emailErr?.message || 'Email service unavailable. Please try again in a minute.',
          code: 'EMAIL_DELIVERY_FAILED',
        });
      }
    } else if (role === 'MAIN_WHOLESALER') {
      const mainWholesaler = await prisma.mainWholesaler.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });

      if (!mainWholesaler || !mainWholesaler.email) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (mainWholesaler.email_verified) {
        return res.status(400).json({ error: 'Email is already verified' });
      }

      const previousTokenHash = mainWholesaler.email_verification_token_hash;
      const previousExpiresAt = mainWholesaler.email_verification_expires_at;
      const previousSentAt = mainWholesaler.email_verification_sent_at;

      await prisma.mainWholesaler.update({
        where: { id: mainWholesaler.id },
        data: {
          email_verification_token_hash: tokenHash,
          email_verification_expires_at: expiresAt,
          email_verification_sent_at: new Date(),
        },
      });

      try {
        await sendVerificationEmail({
          email: mainWholesaler.email,
          role: 'MAIN_WHOLESALER',
          token,
          name: mainWholesaler.name,
        });
      } catch (emailErr: any) {
        // Restore previous token values so already-sent links are not invalidated on transient SMTP failures.
        await prisma.mainWholesaler.update({
          where: { id: mainWholesaler.id },
          data: {
            email_verification_token_hash: previousTokenHash,
            email_verification_expires_at: previousExpiresAt,
            email_verification_sent_at: previousSentAt,
          },
        });
        return res.status(503).json({
          error: emailErr?.message || 'Email service unavailable. Please try again in a minute.',
          code: 'EMAIL_DELIVERY_FAILED',
        });
      }
    } else {
      return res.status(400).json({ error: 'role must be WHOLESALER or MAIN_WHOLESALER' });
    }

    return res.json({ success: true, message: 'Verification email sent' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to resend verification email' });
  }
});

/**
 * GET /api/auth/me
 * Returns current wholesaler, retailer or admin profile
 */
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (payload.role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { id: payload.id } });
      if (!admin) return res.status(404).json({ error: 'Not found' });
      const { password_hash: _pw, ...safe } = admin;
      return res.json({ user: safe, role: 'ADMIN' });
    } else if (payload.role === 'WHOLESALER') {
      const ws = await prisma.wholesaler.findUnique({ where: { id: payload.wholesaler_id } });
      if (!ws) return res.status(404).json({ error: 'Not found' });
      const { password_hash: _pw, ...safeWs } = ws;
      return res.json({ user: safeWs, role: 'WHOLESALER' });
    } else {
      const rt = await prisma.retailer.findUnique({ where: { id: payload.retailer_id } });
      if (!rt) return res.status(404).json({ error: 'Not found' });
      const { password_hash: _pw, ...safeRt } = rt;
      return res.json({ user: safeRt, role: 'RETAILER' });
    }
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * PATCH /api/auth/wholesaler
 * Update wholesaler profile (cannot change username or password via this route)
 */
router.patch('/wholesaler', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== 'WHOLESALER') return res.status(403).json({ error: 'Forbidden' });

    // Extract specific fields from req.body, including upi_id, and exclude sensitive ones
    const {
      name,
      phone,
      address,
      gstin,
      dl_number,
      email,
      bank_name,
      bank_account,
      ifsc,
      upi_id,
      // Exclude sensitive fields that should not be updated via this route
      password_hash,
      username,
      // Any other fields not explicitly listed will be ignored
      ...rest
    } = req.body;

    const updated = await prisma.wholesaler.update({
      where: { id: payload.wholesaler_id }, // Corrected from decoded.id to payload.wholesaler_id
      data: { name, phone, address, gstin, dl_number, email, bank_name, bank_account, ifsc, upi_id },
    });
    const { password_hash: _pw, ...safeUpdated } = updated;
    res.json(safeUpdated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/wholesaler/plan-request
 * Sub-wholesaler requests a plan upgrade (goes to admin for approval)
 * Body: { requested_plan, coupon_code? }
 */
router.post('/wholesaler/plan-request', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== 'WHOLESALER') return res.status(403).json({ error: 'Forbidden' });

    const { requested_plan, coupon_code } = req.body as { requested_plan: string; coupon_code?: string };
    if (!requested_plan || !['starter', 'growth', 'pro', 'enterprise'].includes(requested_plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const wholesaler = await prisma.wholesaler.findUnique({ where: { id: payload.wholesaler_id } });
    if (!wholesaler) return res.status(404).json({ error: 'Wholesaler not found' });

    if (wholesaler.plan === requested_plan) {
      return res.status(400).json({ error: 'You are already on this plan' });
    }

    // Check for existing pending request
    const existing = await prisma.planRequest.findFirst({
      where: { wholesaler_id: wholesaler.id, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending plan request. Please wait for admin approval.' });
    }

    // Plan prices
    const planPrices: Record<string, number> = { starter: 0, growth: 999, pro: 2499, enterprise: 4999 };
    let baseAmount = planPrices[requested_plan] || 0;
    let discountAmount = 0;

    // Validate coupon if provided
    if (coupon_code) {
      const coupon = await prisma.coupon.findUnique({ where: { code: coupon_code } });
      if (!coupon) return res.status(400).json({ error: 'Invalid coupon code' });
      if (!coupon.is_active) return res.status(400).json({ error: 'This coupon is no longer active' });
      if (coupon.expires_at && new Date() > coupon.expires_at) return res.status(400).json({ error: 'This coupon has expired' });
      if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'This coupon has been fully used' });
      if (coupon.valid_plans) {
        const validPlans = coupon.valid_plans.split(',').map(p => p.trim());
        if (!validPlans.includes(requested_plan)) {
          return res.status(400).json({ error: `This coupon is not valid for the ${requested_plan} plan` });
        }
      }

      if (coupon.discount_type === 'PERCENTAGE') {
        discountAmount = Math.round(baseAmount * coupon.discount_value / 100);
      } else {
        discountAmount = Math.min(coupon.discount_value, baseAmount);
      }
    }

    const finalAmount = Math.max(baseAmount - discountAmount, 0);

    const planRequest = await prisma.planRequest.create({
      data: {
        wholesaler_id: wholesaler.id,
        current_plan: wholesaler.plan,
        requested_plan,
        coupon_code: coupon_code || null,
        discount_amount: discountAmount,
        final_amount: finalAmount,
      },
    });

    res.status(201).json(planRequest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/wholesaler/plan-requests
 * Get current wholesaler's plan requests
 */
router.get('/wholesaler/plan-requests', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== 'WHOLESALER') return res.status(403).json({ error: 'Forbidden' });

    const requests = await prisma.planRequest.findMany({
      where: { wholesaler_id: payload.wholesaler_id },
      orderBy: { created_at: 'desc' },
    });
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/validate-coupon
 * Validate a coupon code and return discount info
 * Body: { code, plan }
 */
router.post('/validate-coupon', async (req, res) => {
  try {
    const { code, plan } = req.body as { code: string; plan: string };
    if (!code || !plan) return res.status(400).json({ error: 'code and plan are required' });

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });
    if (!coupon.is_active) return res.status(400).json({ error: 'This coupon is no longer active' });
    if (coupon.expires_at && new Date() > coupon.expires_at) return res.status(400).json({ error: 'This coupon has expired' });
    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'This coupon has been fully used' });
    if (coupon.valid_plans) {
      const validPlans = coupon.valid_plans.split(',').map(p => p.trim());
      if (!validPlans.includes(plan)) return res.status(400).json({ error: `This coupon is not valid for the ${plan} plan` });
    }

    const planPrices: Record<string, number> = { starter: 0, growth: 999, pro: 2499, enterprise: 4999 };
    const baseAmount = planPrices[plan] || 0;
    let discountAmount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discountAmount = Math.round(baseAmount * coupon.discount_value / 100);
    } else {
      discountAmount = Math.min(coupon.discount_value, baseAmount);
    }

    res.json({
      valid: true,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discountAmount,
      final_amount: Math.max(baseAmount - discountAmount, 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/set-retailer-password
 * Wholesaler activates a retailer account by setting their login password.
 * Body: { retailer_id, password }
 */
router.post('/set-retailer-password', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== 'WHOLESALER') return res.status(403).json({ error: 'Forbidden' });

    const { retailer_id, password } = req.body as { retailer_id: string; password: string };
    if (!retailer_id || !password) {
      return res.status(400).json({ error: 'retailer_id and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const retailer = await prisma.retailer.findFirst({
      where: { id: retailer_id, wholesaler_id: payload.wholesaler_id },
    });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });

    const password_hash = await bcrypt.hash(password, 10);
    await prisma.retailer.update({ where: { id: retailer_id }, data: { password_hash } });

    res.json({ success: true, message: 'Retailer password set successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/retailer-register
 * Retailer self-registration (independent of any wholesaler).
 * Body: { name, shop_name, phone, password, address?, gstin?, dl_number? }
 */
router.post('/retailer-register', async (req, res) => {
  try {
    const { name, shop_name, phone, password, address, gstin, dl_number } = req.body as {
      name: string;
      shop_name: string;
      phone: string;
      password: string;
      address?: string;
      gstin?: string;
      dl_number?: string;
    };

    if (!name || !shop_name || !phone || !password) {
      return res.status(400).json({ error: 'name, shop_name, phone and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.retailer.findFirst({ where: { phone } });
    if (existing) {
      return res.status(409).json({ error: 'A retailer with this phone number already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const retailer = await prisma.retailer.create({
      data: {
        name,
        shop_name,
        phone,
        password_hash,
        address,
        gstin,
        dl_number,
        wholesaler_id: undefined,
        is_self_registered: true,
        current_balance: 0,
        credit_limit: 0,
      },
    });

    const token = jwt.sign(
      { id: retailer.id, role: 'RETAILER', wholesaler_id: null, retailer_id: retailer.id },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    const { password_hash: _pw, ...safeRetailer } = retailer;
    return res.status(201).json({ token, user: safeRetailer, role: 'RETAILER' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
