/**
 * Seed script — imports all medicines from the CSV dataset into the database.
 *
 * CSV source: dataset/Extensive_A_Z_medicines_dataset_of_India.csv
 *
 * Run: npm run seed:medicines
 *
 * The medicines are inserted for ALL wholesalers (distributed evenly).
 * If you want a single wholesaler, set WHOLESALER_ID env var:
 *   WHOLESALER_ID=ws-1 npm run seed:medicines
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────────────────
const CSV_PATH = path.resolve(
  __dirname,
  '../../dataset/Extensive_A_Z_medicines_dataset_of_India.csv'
);
const BATCH_SIZE = 500;

// Medicines are seeded as catalog entries (wholesaler_id = null) — visible to ALL wholesalers
const ALL_WHOLESALER_IDS: string[] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseUnit(packSize: string): string {
  const s = (packSize || '').toLowerCase();
  if (s.includes('syrup') || s.includes('bottle') || s.includes('solution') || s.includes('suspension') || s.includes('drops')) return 'bottle';
  if (s.includes('injection') || s.includes('vial') || s.includes('ampoule')) return 'vial';
  if (s.includes('cream') || s.includes('gel') || s.includes('ointment') || s.includes('lotion')) return 'tube';
  if (s.includes('inhaler') || s.includes('rotacap') || s.includes('respule')) return 'inhaler';
  if (s.includes('powder') || s.includes('sachet')) return 'sachet';
  if (s.includes('capsule') || s.includes('tablet')) return 'strip';
  return 'strip';
}

function safeFloat(val: string, fallback = 0): number {
  const n = parseFloat((val || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? fallback : n;
}

function rndInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── CSV Row interface ─────────────────────────────────────────────────────────
interface CsvRow {
  id: string;
  name: string;
  'price(₹)': string;
  Is_discontinued: string;
  manufacturer_name: string;
  type: string;
  pack_size_label: string;
  short_composition1: string;
  short_composition2: string;
  substitute0: string;
  substitute1: string;
  substitute2: string;
  substitute3: string;
  substitute4: string;
  Consolidated_Side_Effects: string;
  use0: string;
  use1: string;
  use2: string;
  use3: string;
  use4: string;
  'Chemical Class': string;
  'Habit Forming': string;
  'Therapeutic Class': string;
  'Action Class': string;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting medicines seed from CSV...');
  console.log(`   CSV: ${CSV_PATH}`);

  // Verify CSV exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error('❌ CSV file not found at:', CSV_PATH);
    process.exit(1);
  }

  // All catalog entries get wholesaler_id = null so every wholesaler sees them
  console.log('   Seeding as universal catalog entries (wholesaler_id = null)');

  // Optional: clear existing medicines first
  if (process.env.CLEAR_MEDICINES === 'true') {
    console.log('   Clearing existing medicines...');
    await prisma.medicine.deleteMany();
    console.log('   Cleared.');
  }

  // Read CSV into memory (streams for large files)
  const rows: CsvRow[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`   Loaded ${rows.length.toLocaleString()} rows from CSV`);

  // Transform & batch insert
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const data = batch.map((row) => {
      const mrp = safeFloat(row['price(₹)'], 0);
      const price = parseFloat((mrp * 0.75).toFixed(2));
      const isDiscontinued = (row.Is_discontinued || '').toLowerCase() === 'true';

      // Build uses string from use0-use4
      const uses = [row.use0, row.use1, row.use2, row.use3, row.use4]
        .filter(Boolean)
        .join('; ');

      return {
        wholesaler_id: null,
        name: (row.name || '').trim(),
        salt: (row.short_composition1 || '').trim() || null,
        composition2: (row.short_composition2 || '').trim() || null,
        brand: (row.manufacturer_name || '').trim() || null,
        unit: parseUnit(row.pack_size_label),
        pack_size: (row.pack_size_label || '').trim() || null,
        mrp,
        price: price > 0 ? price : mrp * 0.75,
        gst_rate: 12,
        hsn_code: '3004',
        stock_qty: rndInt(50, 2000),
        therapeutic_class: (row['Therapeutic Class'] || '').trim() || null,
        side_effects: (row.Consolidated_Side_Effects || '').trim() || null,
        uses: uses || null,
        is_discontinued: isDiscontinued,
        is_active: !isDiscontinued,
      };
    }).filter((m) => m.name.length > 0); // skip blank rows

    const result = await prisma.medicine.createMany({
      data,
      skipDuplicates: false,
    });

    inserted += result.count;

    const progress = Math.min(i + BATCH_SIZE, rows.length);
    process.stdout.write(
      `\r   Progress: ${progress.toLocaleString()} / ${rows.length.toLocaleString()} rows  (inserted: ${inserted.toLocaleString()})`
    );
  }

  console.log('\n');
  console.log('✅ Medicines seed complete!');

  const total = await prisma.medicine.count();
  console.log(`   Total medicines in DB: ${total.toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
