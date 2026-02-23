/**
 * Seed script — populates the database with mock data matching the frontend prototype.
 * Run: npm run seed
 * (or: npx ts-node src/seed.ts)
 */
import 'dotenv/config';
import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ── Wholesalers ────────────────────────────────────────────────────────────
const WHOLESALERS = [
  { id: 'ws-1', name: 'Sai Ram Agencies',         phone: '9876543210', address: '12-5-189/A, Pharma Plaza, Moosapet, Hyderabad', plan: 'pro' },
  { id: 'ws-2', name: 'Mahaveer Distributors',     phone: '9876543211', address: '45-2, Market Street, Sultan Bazar, Hyderabad',  plan: 'growth' },
  { id: 'ws-3', name: 'Balaji Pharma',             phone: '9876543212', address: '88-1, Industrial Estate, Jeedimetla, Hyderabad', plan: 'starter' },
  { id: 'ws-4', name: 'Sri Krishna Enterprises',   phone: '9876543213', address: '102, Emerald House, Abids, Hyderabad',          plan: 'pro' },
  { id: 'ws-5', name: 'Venkateshwara Agencies',    phone: '9876543214', address: 'Plot 45, Auto Nagar, Hyderabad',                plan: 'growth' },
];

// ── Medicines ─────────────────────────────────────────────────────────────
const portfolios: Record<string, string[]> = {
  'ws-1': ['Sun Pharma', 'Cipla', 'Torrent', 'Sanofi'],
  'ws-2': ['Mankind', 'Alkem', 'Aristo', 'Indoco'],
  'ws-3': ["Dr. Reddy's", 'Lupin', 'Glenmark', 'Zydus'],
  'ws-4': ['Abbott', 'GSK', 'Pfizer', 'Novartis'],
  'ws-5': ['Micro Labs', 'Blue Cross', 'FDC', 'Intas'],
};
const categories = [
  { name: 'Paracetamol',   salts: ['Paracetamol 650mg', 'Paracetamol 500mg'],                  priceRange: [20, 40] },
  { name: 'Amoxicillin',   salts: ['Amoxicillin 500mg', 'Amoxicillin + Clavulanic Acid 625'],   priceRange: [150, 250] },
  { name: 'Metformin',     salts: ['Metformin 500mg', 'Metformin 1000mg'],                       priceRange: [20, 60] },
  { name: 'Atorvastatin',  salts: ['Atorvastatin 10mg', 'Atorvastatin 20mg'],                   priceRange: [70, 140] },
  { name: 'Omeprazole',    salts: ['Omeprazole 20mg', 'Pantoprazole 40mg'],                      priceRange: [50, 160] },
  { name: 'Azithromycin',  salts: ['Azithromycin 500mg', 'Azithromycin 250mg'],                  priceRange: [100, 180] },
  { name: 'Multivitamins', salts: ['Vitamin B Complex', 'Vitamin C + Zinc'],                     priceRange: [40, 120] },
  { name: 'Diclofenac',    salts: ['Diclofenac Gel', 'Diclofenac 50mg'],                         priceRange: [60, 130] },
];

const MANKIND_MEDICINES = [
  { name: 'Moxikind-CV 625', salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg', mrp: 220, price: 165 },
  { name: 'Telmikind 40',    salt: 'Telmisartan 40mg',                           mrp: 65,  price: 48.75 },
  { name: 'Amlokind 5',      salt: 'Amlodipine 5mg',                             mrp: 40,  price: 30 },
  { name: 'Glimestar M1',    salt: 'Glimepiride 1mg + Metformin 500mg',           mrp: 85,  price: 63.75 },
  { name: 'Zenflox 200',     salt: 'Ofloxacin 200mg',                             mrp: 75,  price: 56.25 },
  { name: 'Nurokind-OD',     salt: 'Mecobalamin 1500mcg',                         mrp: 140, price: 105 },
  { name: 'Monticope',       salt: 'Montelukast 10mg + Levocetirizine 5mg',       mrp: 110, price: 82.5 },
  { name: 'Gudcef 200',      salt: 'Cefpodoxime 200mg',                           mrp: 210, price: 157.5 },
  { name: 'Pantakind 40',    salt: 'Pantoprazole 40mg',                           mrp: 95,  price: 71.25 },
  { name: 'Cefakind 500',    salt: 'Cefuroxime 500mg',                            mrp: 350, price: 262.5 },
  { name: 'Caldikind Plus',  salt: 'Calcium + Calcitriol + Zinc',                 mrp: 120, price: 90 },
  { name: 'Mahacef 200',     salt: 'Cefixime 200mg',                              mrp: 105, price: 78.75 },
  { name: 'Candiforce 100',  salt: 'Itraconazole 100mg',                          mrp: 160, price: 120 },
  { name: 'Vomikind 4',      salt: 'Ondansetron 4mg',                             mrp: 35,  price: 26.25 },
  { name: 'Dolokind-Plus',   salt: 'Aceclofenac 100mg + Paracetamol 325mg',      mrp: 60,  price: 45 },
];

// ── Retailers ─────────────────────────────────────────────────────────────
const FIXED_RETAILERS = [
  { id: 'r1', name: 'Ravi Kumar',    shop_name: 'Ravi Medical',     phone: '9111111111', credit_limit: 150000, current_balance: 12500, address: '123 Main St, Moosapet, Hyderabad',  gstin: '36ABCDE1234F1Z5' },
  { id: 'r2', name: 'Srinivas Rao',  shop_name: 'Sri Medicals',     phone: '9222222222', credit_limit: 200000, current_balance: 67000, address: '456 Market Rd, Secunderabad',        gstin: '36FGHIJ5678K1Z2' },
  { id: 'r3', name: 'Lakshmi Devi',  shop_name: 'Lakshmi Pharmacy', phone: '9333333333', credit_limit: 50000,  current_balance: 5000,  address: '789 Colony, Kukatpally, Hyderabad',  gstin: '36KLMNO9012P1Z3' },
  { id: 'r4', name: 'Kiran Reddy',   shop_name: 'Apollo Pharmacy',  phone: '9444444444', credit_limit: 500000, current_balance: 120000,address: 'Plot 12, Hitech City, Hyderabad',   gstin: '36PQRST3456U1Z4' },
  { id: 'r5', name: 'Vijay Kumar',   shop_name: 'MedPlus',          phone: '9555555555', credit_limit: 300000, current_balance: 45000, address: 'Shop 5, Banjara Hills, Hyderabad', gstin: '36UVWXY7890Z1Z5' },
];
const AREAS = ['Kukatpally','Ameerpet','Secunderabad','Banjara Hills','Jubilee Hills','Gachibowli','Hitech City','Miyapur','Kondapur','Manikonda'];
const FIRST_NAMES = ['Ravi','Suresh','Ramesh','Mahesh','Vijay','Anil','Sunil','Kiran','Rajesh','Venkatesh','Srinivas','Lakshmi','Anita','Priya','Swathi'];
const LAST_NAMES = ['Kumar','Reddy','Rao','Gupta','Sharma','Singh','Yadav','Goud','Chowdary','Naidu'];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (order matters for FK constraints)
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.wholesaler.deleteMany();

  // ── 1. Wholesalers ──────────────────────────────────────────────────────
  console.log('  Creating wholesalers...');
  for (const ws of WHOLESALERS) {
    await prisma.wholesaler.create({ data: ws });
  }

  // ── 2. Medicines ────────────────────────────────────────────────────────
  console.log('  Creating medicines...');
  // Mankind medicines → ws-2
  for (const m of MANKIND_MEDICINES) {
    await prisma.medicine.create({
      data: {
        wholesaler_id: 'ws-2',
        brand: 'Mankind',
        unit: 'strip',
        gst_rate: 12,
        hsn_code: '3004',
        stock_qty: rndInt(200, 1500),
        is_active: true,
        ...m,
      },
    });
  }
  // Random medicines for each wholesaler
  for (const wsId of Object.keys(portfolios)) {
    const brands = portfolios[wsId];
    const count = rndInt(25, 40);
    for (let i = 0; i < count; i++) {
      const brand = rnd(brands);
      const cat = rnd(categories);
      const salt = rnd(cat.salts);
      const mrp = parseFloat((Math.random() * (cat.priceRange[1] - cat.priceRange[0]) + cat.priceRange[0]).toFixed(2));
      await prisma.medicine.create({
        data: {
          wholesaler_id: wsId,
          name: `${salt} ${brand.split(' ')[0]}`,
          salt,
          brand,
          unit: Math.random() > 0.8 ? 'bottle' : 'strip',
          mrp,
          price: parseFloat((mrp * 0.75).toFixed(2)),
          gst_rate: 12,
          hsn_code: '3004',
          stock_qty: rndInt(100, 2000),
          is_active: true,
        },
      });
    }
  }

  // ── 3. Retailers (linked to ws-1 for demo; first 5 are fixed) ──────────
  console.log('  Creating retailers...');
  // Assign fixed retailers to ws-1
  for (const r of FIXED_RETAILERS) {
    await prisma.retailer.create({
      data: { ...r, wholesaler_id: 'ws-1', is_active: true },
    });
  }
  // Generate 25 more random retailers spread across wholesalers
  for (let i = 6; i <= 30; i++) {
    const firstName = rnd(FIRST_NAMES);
    const lastName = rnd(LAST_NAMES);
    const area = rnd(AREAS);
    const wsId = rnd(Object.keys(portfolios));
    const creditLimit = rnd([50000, 100000, 150000, 200000, 250000, 500000]);
    await prisma.retailer.create({
      data: {
        wholesaler_id: wsId,
        name: `${firstName} ${lastName}`,
        shop_name: `${firstName} ${Math.random() > 0.5 ? 'Medicals' : 'Pharmacy'}`,
        phone: `9${rndInt(100000000, 999999999)}`,
        credit_limit: creditLimit,
        current_balance: 0,
        is_active: true,
        address: `${rndInt(1, 100)}-${rndInt(1, 50)}, Main Road, ${area}, Hyderabad`,
      },
    });
  }

  // ── 4. Orders ────────────────────────────────────────────────────────────
  console.log('  Creating orders...');
  const allMedicines = await prisma.medicine.findMany();
  const allRetailers = await prisma.retailer.findMany();
  const statuses: OrderStatus[] = ['PENDING', 'ACCEPTED', 'DISPATCHED', 'DELIVERED'];

  for (let i = 0; i < 50; i++) {
    const retailer = rnd(allRetailers);
    const wsId = retailer.wholesaler_id;
    if (!wsId) continue;
    const wsMeds = allMedicines.filter((m) => m.wholesaler_id === wsId);
    if (wsMeds.length === 0) continue;

    const numItems = rndInt(1, 5);
    let subTotal = 0;
    const itemsData: any[] = [];

    for (let j = 0; j < numItems; j++) {
      const med = rnd(wsMeds);
      const qty = rndInt(1, 10);
      const taxable = med.price * qty;
      const tax = taxable * 0.12;
      subTotal += taxable;
      itemsData.push({
        medicine_id: med.id,
        medicine_name: med.name,
        qty,
        mrp: med.mrp,
        unit_price: med.price,
        discount_percent: 0,
        discount_amount: 0,
        total_price: taxable + tax,
        hsn_code: med.hsn_code,
        gst_rate: 12,
        taxable_value: taxable,
        tax_amount: tax,
      });
    }

    const status = rnd(statuses);
    const createdAt = new Date(Date.now() - rndInt(0, 10 * 24 * 60 * 60 * 1000));

    await prisma.order.create({
      data: {
        wholesaler_id: wsId,
        retailer_id: retailer.id,
        retailer_name: retailer.shop_name,
        status,
        invoice_no: status !== 'PENDING' ? `INV/${new Date().getFullYear()}/${1000 + i}` : undefined,
        sub_total: subTotal,
        tax_total: subTotal * 0.12,
        total_amount: subTotal * 1.12,
        payment_terms: 'NET 15',
        created_at: createdAt,
        items: { create: itemsData },
      },
    });
  }

  const counts = {
    wholesalers: await prisma.wholesaler.count(),
    retailers: await prisma.retailer.count(),
    medicines: await prisma.medicine.count(),
    orders: await prisma.order.count(),
  };

  console.log('✅ Seed complete!');
  console.table(counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
