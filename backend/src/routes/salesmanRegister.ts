import { Router } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// POST /api/auth/salesman/register — Public. Salesman self-registers.
router.post('/salesman/register', async (req, res) => {
  try {
    const { name, phone, username, password, company_name, employee_id, territory } = req.body;

    if (!name || !phone || !username || !password) {
      return res.status(400).json({ error: 'name, phone, username, password are required' });
    }

    const existingPhone = await prisma.salesman.findUnique({ where: { phone } });
    if (existingPhone) return res.status(409).json({ error: 'Phone number already registered' });

    const existingUsername = await prisma.salesman.findUnique({ where: { username } });
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, 10);

    // Salesman is created with wholesaler_id = '' — will be linked when approved
    const salesman = await prisma.salesman.create({
      data: {
        name,
        phone,
        username,
        password_hash,
        company_name: company_name || null,
        employee_id: employee_id || null,
        territory: territory || null,
        wholesaler_id: null,
        is_active: true,
      },
    });

    // Auto-generate a JWT so they can log in right away and request connections
    const token = jwt.sign(
      { id: salesman.id, role: 'SALESMAN', wholesaler_id: null, salesman_id: salesman.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    const { password_hash: _, ...salesmanData } = salesman;
    res.status(201).json({ token, salesman: salesmanData, role: 'SALESMAN' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
