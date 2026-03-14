import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('RETAILER'));

/** Normalize search so "a250" matches "A 250": add space between letters and numbers, then tokenize. */
function normalizeSearch(search: string): string[] {
  const trimmed = search.trim().toLowerCase();
  if (!trimmed) return [];
  // Insert space between letter and digit so "a250" -> "a 250"
  const withSpaces = trimmed.replace(/([a-z])(\d)/gi, '$1 $2').replace(/(\d)([a-z])/gi, '$1 $2');
  return withSpaces.split(/\s+/).filter(Boolean);
}

/**
 * GET /api/marketplace/medicines
 *
 * Returns medicines from the retailer's linked wholesaler inventories.
 * Only medicines that the wholesaler explicitly added/imported (wholesaler_id != null).
 *
 * Query params:
 *   search  — filter by name/brand/salt (supports "a250" -> matches "A 250"; token AND match)
 *   agency  — filter by specific wholesaler_id ("ALL" = all linked)
 *   limit   — max results (default 60, max 200)
 *   offset  — skip N results for pagination
 */
router.get('/medicines', async (req, res) => {
  try {
    const retailer_id = req.user!.retailer_id;
    const rawSearch = ((req.query.search as string) || '').trim();
    const agencyFilter = (req.query.agency as string) || (req.query.agency_id as string) || 'ALL';
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit), 10) || 60), 200);
    const offset = Math.max(0, parseInt(String(req.query.offset), 10) || 0);

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
      return res.json({ medicines: [], total: 0, schemes: [], agencies: [] });
    }

    // 2. Filter to specific agency if requested
    const targetIds =
      agencyFilter === 'ALL'
        ? linkedWholesalerIds
        : linkedWholesalerIds.filter((id) => id === agencyFilter);

    // 3. Build where: base + search (token AND: each token must appear in name, brand, or salt)
    const whereClause: any = {
      wholesaler_id: { in: targetIds },
      is_active: true,
      is_discontinued: false,
    };

    const tokens = normalizeSearch(rawSearch);
    if (tokens.length > 0) {
      // Each token must match in at least one of name, brand, salt (AND across tokens)
      whereClause.AND = tokens.map((token) => ({
        OR: [
          { name: { contains: token, mode: 'insensitive' as const } },
          { brand: { contains: token, mode: 'insensitive' as const } },
          { salt: { contains: token, mode: 'insensitive' as const } },
        ],
      }));
    }

    const [total, medicines] = await Promise.all([
      prisma.medicine.count({ where: whereClause }),
      prisma.medicine.findMany({
        where: whereClause,
        include: {
          wholesaler: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);

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
      altBySalt[salt].push(alt);
    }

    // 6. Attach alternatives
    const medicinesWithAlts = medicines.map((med) => {
      const allSaltAlts = altBySalt[med.salt || ''] || [];

      // Filter out same wholesaler
      const validAlts = allSaltAlts.filter(a => a.wholesaler_id !== med.wholesaler_id);

      // Sort to prioritize exact name matches (since DB already sorted by price, stable sort keeps price order)
      validAlts.sort((a, b) => {
        const aExact = a.name.toLowerCase() === med.name.toLowerCase() ? 1 : 0;
        const bExact = b.name.toLowerCase() === med.name.toLowerCase() ? 1 : 0;
        return bExact - aExact;
      });

      return {
        ...med,
        alternatives: validAlts.slice(0, 5),
      };
    });

    // 7. Fetch active schemes for linked wholesalers
    const schemes = await prisma.scheme.findMany({
      where: {
        wholesaler_id: { in: targetIds },
        is_active: true,
      },
      include: {
        medicine: { select: { id: true, name: true, brand: true, mrp: true, price: true } },
      },
    });

    // 8. Agencies for sidebar
    const agenciesInfo = linkedAgencies.map((a) => ({
      wholesaler_id: a.wholesaler_id,
      is_primary: a.is_primary,
      name: a.wholesaler.name,
      phone: a.wholesaler.phone,
    }));

    res.json({ medicines: medicinesWithAlts, total, limit, offset, schemes, agencies: agenciesInfo });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;


