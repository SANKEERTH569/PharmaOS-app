import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();

const ensureTicketTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      requester_role TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_phone TEXT,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      admin_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolved_by_admin_id TEXT
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON support_tickets(requester_role, requester_id);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);
  `);
};

const requireWholesalerOrMain = (req: any, res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!['WHOLESALER', 'MAIN_WHOLESALER'].includes(payload.role)) {
      return res.status(403).json({ error: 'Only wholesaler or main wholesaler can raise tickets' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/my', requireWholesalerOrMain, async (req: any, res) => {
  try {
    await ensureTicketTable();
    const role = req.user.role as 'WHOLESALER' | 'MAIN_WHOLESALER';
    const id = req.user.id as string;

    const rows = await prisma.$queryRawUnsafe(`
      SELECT id, requester_role, requester_id, requester_name, requester_phone,
             subject, category, priority, description, status, admin_note,
             created_at, updated_at, resolved_at
      FROM support_tickets
      WHERE requester_role = $1 AND requester_id = $2
      ORDER BY created_at DESC
      LIMIT 300
    `, role, id);

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireWholesalerOrMain, async (req: any, res) => {
  try {
    await ensureTicketTable();

    const { subject, category, priority = 'MEDIUM', description } = req.body as {
      subject: string;
      category: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      description: string;
    };

    if (!subject || !category || !description) {
      return res.status(400).json({ error: 'subject, category and description are required' });
    }

    const role = req.user.role as 'WHOLESALER' | 'MAIN_WHOLESALER';
    const requesterId = req.user.id as string;
    let requesterName = 'User';
    let requesterPhone: string | null = null;

    if (role === 'WHOLESALER') {
      const user = await prisma.wholesaler.findUnique({ where: { id: requesterId }, select: { name: true, phone: true } });
      requesterName = user?.name || 'Wholesaler';
      requesterPhone = user?.phone || null;
    } else {
      const user = await prisma.mainWholesaler.findUnique({ where: { id: requesterId }, select: { name: true, phone: true } });
      requesterName = user?.name || 'Main Wholesaler';
      requesterPhone = user?.phone || null;
    }

    const ticketId = `TKT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const rows = await prisma.$queryRawUnsafe(`
      INSERT INTO support_tickets (
        id, requester_role, requester_id, requester_name, requester_phone,
        subject, category, priority, description, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'OPEN')
      RETURNING *
    `,
      ticketId,
      role,
      requesterId,
      requesterName,
      requesterPhone,
      subject.trim(),
      category.trim(),
      String(priority || 'MEDIUM').toUpperCase(),
      description.trim(),
    ) as any[];

    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { ensureTicketTable };
export default router;
