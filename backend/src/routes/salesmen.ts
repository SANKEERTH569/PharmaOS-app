import { Router } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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
 * POST /api/salesmen
 * Create a salesman account under this wholesaler
 */
router.post('/', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const { name, phone, username, password } = req.body as {
      name: string;
      phone: string;
      username: string;
      password: string;
    };

    if (!name || !phone || !username || !password) {
      return res.status(400).json({ error: 'name, phone, username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUsername = await prisma.salesman.findUnique({ where: { username } });
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' });

    const existingPhone = await prisma.salesman.findUnique({ where: { phone } });
    if (existingPhone) return res.status(409).json({ error: 'Phone number already in use' });

    const password_hash = await bcrypt.hash(password, 10);
    const salesman = await prisma.salesman.create({
      data: { wholesaler_id, name, phone, username, password_hash },
    });

    const { password_hash: _pw, ...safe } = salesman;
    return res.status(201).json(safe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/salesmen
 * List all salesmen for this wholesaler
 */
router.get('/', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const salesmen = await prisma.salesman.findMany({
      where: { wholesaler_id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        username: true,
        is_active: true,
        created_at: true,
        beat_routes: { select: { id: true, name: true } },
      },
    });
    res.json(salesmen);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/salesmen/:id
 * Get single salesman
 */
router.get('/:id', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const salesman = await prisma.salesman.findFirst({
      where: { id: req.params.id, wholesaler_id },
      select: {
        id: true,
        name: true,
        phone: true,
        username: true,
        is_active: true,
        created_at: true,
        beat_routes: { select: { id: true, name: true } },
      },
    });
    if (!salesman) return res.status(404).json({ error: 'Salesman not found' });
    res.json(salesman);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/salesmen/:id
 * Update salesman (name, phone, is_active, password)
 */
router.patch('/:id', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const existing = await prisma.salesman.findFirst({
      where: { id: req.params.id, wholesaler_id },
    });
    if (!existing) return res.status(404).json({ error: 'Salesman not found' });

    const { name, phone, is_active, password } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.salesman.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, phone: true, username: true, is_active: true, created_at: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/salesmen/:id
 * Deactivate a salesman (soft delete)
 */
router.delete('/:id', async (req, res) => {
  const wholesaler_id = getWholesalerId(req, res);
  if (!wholesaler_id) return;

  try {
    const existing = await prisma.salesman.findFirst({
      where: { id: req.params.id, wholesaler_id },
    });
    if (!existing) return res.status(404).json({ error: 'Salesman not found' });

    await prisma.salesman.update({
      where: { id: req.params.id },
      data: { is_active: false },
    });
    res.json({ success: true, message: 'Salesman deactivated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
