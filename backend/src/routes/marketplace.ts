import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('RETAILER'));

/**
 * GET /api/marketplace/medicines
 *
 * Returns medicines from the retailer's linked wholesaler inventories.
 * Only medicines that the wholesaler explicitly added/imported (wholesaler_id != null).
 *
 * Query params:
 *   search  — filter by name/brand/salt
 *   agency  — filter by specific wholesaler_id ("ALL" = all linked)
 */
router.get('/medicines', async (req, res) => {
  try {
    const retailer_id = req.user!.retailer_id;
    const search = ((req.query.search as string) || '').trim();
    const agencyFilter = (req.query.agency as string) || 'ALL';

    // 1. Get all linked active agencies
    const linkedAgencies = await prisma.retailerAgency.findMany({
      where: { retailer_id, status: 'ACTIVE' },
      select: {
        wholesaler_id: true,
        is_primary: true,
        wholesaler: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { is_primary: 'desc' },
    });

    const linkedWholesalerIds = linkedAgencies.map((a) => a.wholesaler_id);

    if (linkedWholesalerIds.length === 0) {
      return res.json({ medicines: [], agencies: [] });
    }

    // 2. Filter to specific agency if requested
    const targetIds =
      agencyFilter === 'ALL'
        ? linkedWholesalerIds
        : linkedWholesalerIds.filter((id) => id === agencyFilter);

    // 3. Fetch medicines from those wholesalers' inventories (wholesaler_id != null)
    const whereClause: any = {
      wholesaler_id: { in: targetIds },
      is_active: true,
      is_discontinued: false,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { salt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const medicines = await prisma.medicine.findMany({
      where: whereClause,
      include: {
        wholesaler: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });

    // 4. Find alternatives: same salt from other linked wholesalers
    const saltSet = Array.from(new Set(medicines.map((m) => m.salt).filter(Boolean)));

    const alternativeMeds = saltSet.length
      ? await prisma.medicine.findMany({
        where: {
          salt: { in: saltSet as string[] },
          is_active: true,
          is_discontinued: false,
          wholesaler_id: { in: linkedWholesalerIds },
        },
        include: {
          wholesaler: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { price: 'asc' },
      })
      : [];

    // 5. Group alternatives by salt
    const altBySalt: Record<string, typeof alternativeMeds> = {};
    for (const alt of alternativeMeds) {
      const salt = alt.salt || '';
      if (!altBySalt[salt]) altBySalt[salt] = [];
      if (altBySalt[salt].length < 5) altBySalt[salt].push(alt);
    }

    // 6. Attach alternatives
    const medicinesWithAlts = medicines.map((med) => ({
      ...med,
      alternatives: altBySalt[med.salt || ''] || [],
    }));

    // 7. Agencies for sidebar
    const agenciesInfo = linkedAgencies.map((a) => ({
      wholesaler_id: a.wholesaler_id,
      is_primary: a.is_primary,
      name: a.wholesaler.name,
      phone: a.wholesaler.phone,
    }));

    res.json({ medicines: medicinesWithAlts, agencies: agenciesInfo });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;


