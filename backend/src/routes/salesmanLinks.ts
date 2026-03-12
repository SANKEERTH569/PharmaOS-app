import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/salesman-links/wholesalers — Public list of active sub-wholesalers (paginated)
// Used by salesman to browse & request connection
router.get('/wholesalers', async (req, res) => {
  try {
    const { search = '' } = req.query as Record<string, string>;
    const where: any = { is_active: true };
    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    const wholesalers = await prisma.wholesaler.findMany({
      where,
      select: { id: true, name: true, phone: true, address: true, plan: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    res.json(wholesalers);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/salesman-links/my — Salesman sees their connection requests and status
router.get('/my', async (req, res) => {
  if (req.user!.role !== 'SALESMAN') return res.status(403).json({ error: 'Forbidden' });
  try {
    const links = await prisma.salesmanWholesalerLink.findMany({
      where: { salesman_id: req.user!.salesman_id! },
      include: { wholesaler: { select: { id: true, name: true, phone: true, address: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(links);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/salesman-links/request — Salesman requests to connect to a wholesaler
router.post('/request', async (req, res) => {
  if (req.user!.role !== 'SALESMAN') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { wholesaler_id, message } = req.body;
    if (!wholesaler_id) return res.status(400).json({ error: 'wholesaler_id required' });

    const wholesaler = await prisma.wholesaler.findUnique({ where: { id: wholesaler_id } });
    if (!wholesaler) return res.status(404).json({ error: 'Wholesaler not found' });

    const existing = await prisma.salesmanWholesalerLink.findUnique({
      where: { salesman_id_wholesaler_id: { salesman_id: req.user!.salesman_id!, wholesaler_id } },
    });
    if (existing) return res.status(409).json({ error: `Already ${existing.status.toLowerCase()}` });

    const link = await prisma.salesmanWholesalerLink.create({
      data: {
        salesman_id: req.user!.salesman_id!,
        wholesaler_id,
        message: message || null,
        status: 'PENDING',
      },
      include: { wholesaler: { select: { id: true, name: true } } },
    });
    res.status(201).json(link);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/salesman-links/requests — Wholesaler sees pending/all connection requests
router.get('/requests', async (req, res) => {
  if (req.user!.role !== 'WHOLESALER') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = { wholesaler_id: req.user!.wholesaler_id! };
    if (status) where.status = status;

    const links = await prisma.salesmanWholesalerLink.findMany({
      where,
      include: {
        salesman: { select: { id: true, name: true, phone: true, username: true, company_name: true, employee_id: true, territory: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(links);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/salesman-links/:id/approve — Wholesaler approves a request
router.patch('/:id/approve', async (req, res) => {
  if (req.user!.role !== 'WHOLESALER') return res.status(403).json({ error: 'Forbidden' });
  try {
    const link = await prisma.salesmanWholesalerLink.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });
    if (!link) return res.status(404).json({ error: 'Request not found' });

    // Update link status
    const updated = await prisma.salesmanWholesalerLink.update({
      where: { id: link.id },
      data: { status: 'APPROVED' },
      include: { salesman: true },
    });

    // Update the salesman's wholesaler_id to this wholesaler
    await prisma.salesman.update({
      where: { id: link.salesman_id },
      data: { wholesaler_id: req.user!.wholesaler_id! },
    });

    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/salesman-links/:id/reject — Wholesaler rejects a request
router.patch('/:id/reject', async (req, res) => {
  if (req.user!.role !== 'WHOLESALER') return res.status(403).json({ error: 'Forbidden' });
  try {
    const link = await prisma.salesmanWholesalerLink.findFirst({
      where: { id: req.params.id, wholesaler_id: req.user!.wholesaler_id! },
    });
    if (!link) return res.status(404).json({ error: 'Request not found' });

    const updated = await prisma.salesmanWholesalerLink.update({
      where: { id: link.id },
      data: { status: 'REJECTED' },
    });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/salesman-links/:id — Salesman withdraws a pending request
router.delete('/:id', async (req, res) => {
  if (req.user!.role !== 'SALESMAN') return res.status(403).json({ error: 'Forbidden' });
  try {
    const link = await prisma.salesmanWholesalerLink.findFirst({
      where: { id: req.params.id, salesman_id: req.user!.salesman_id!, status: 'PENDING' },
    });
    if (!link) return res.status(404).json({ error: 'Request not found or already processed' });
    await prisma.salesmanWholesalerLink.delete({ where: { id: link.id } });
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
