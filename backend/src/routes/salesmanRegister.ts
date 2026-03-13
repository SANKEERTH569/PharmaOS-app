import { Router } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// POST /api/auth/salesman/register — Public. Salesman self-registers.
router.post('/salesman/register', async (req, res) => {
  try {
    const { name, phone, username, password, company_name, employee_id, territory } = req.body;

    const cleanName = name?.trim();
    const cleanPhone = phone?.trim();
    const cleanUsername = username?.trim();
    const cleanPassword = password;
    const cleanCompanyName = company_name?.trim() || null;
    const cleanEmployeeId = employee_id?.trim() || null;
    const cleanTerritory = territory?.trim() || null;

    if (!cleanName || !cleanPhone || !cleanUsername || !cleanPassword) {
      return res.status(400).json({ error: 'name, phone, username, password are required' });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingPhone = await prisma.salesman.findUnique({ where: { phone: cleanPhone } });
    if (existingPhone) return res.status(409).json({ error: 'Phone number already registered' });

    const existingUsername = await prisma.salesman.findUnique({ where: { username: cleanUsername } });
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(cleanPassword, 10);

    // Salesman is created with wholesaler_id = '' — will be linked when approved
    const salesman = await prisma.salesman.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        username: cleanUsername,
        password_hash,
        company_name: cleanCompanyName,
        employee_id: cleanEmployeeId,
        territory: cleanTerritory,
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
