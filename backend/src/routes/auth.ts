import { Router } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * POST /api/auth/register
 * Wholesaler self-registration.
 * Body: { username, password, name, phone, email?, address? }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, phone, email, address } = req.body as {
      username: string;
      password: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
    };

    if (!username || !password || !name || !phone) {
      return res.status(400).json({ error: 'username, password, name and phone are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.wholesaler.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }

    const existingPhone = await prisma.wholesaler.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(409).json({ error: 'Phone number already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const wholesaler = await prisma.wholesaler.create({
      data: { username, password_hash, name, phone, email, address, plan: 'starter' },
    });

    const token = jwt.sign(
      { id: wholesaler.id, role: 'WHOLESALER', wholesaler_id: wholesaler.id },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    const { password_hash: _pw, ...safeWholesaler } = wholesaler;
    return res.status(201).json({ token, user: safeWholesaler, role: 'WHOLESALER' });
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
      role: 'WHOLESALER' | 'RETAILER';
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

    return res.status(400).json({ error: 'Invalid role' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns current wholesaler or retailer profile
 */
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (payload.role === 'WHOLESALER') {
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
