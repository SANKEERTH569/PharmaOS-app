const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const m = await prisma.medicine.findMany({
    where: { 
      wholesaler_id: { not: null }
    },
    take: 10,
    orderBy: { created_at: 'desc' }
  });
  console.log('Recent Wholesaler Medicines:', m.map(x => ({id: x.id, name: x.name, stock: x.stock_qty, wholesaler: x.wholesaler_id, is_active: x.is_active})));
}

main().catch(console.dir).finally(() => prisma.$disconnect());
