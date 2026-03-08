const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const targetIds = ['cmlxzp01z0005u363i0vbrrt5']; // Gupta Agencies
  const schemes = await prisma.scheme.findMany({
    where: {
      wholesaler_id: { in: targetIds },
      is_active: true,
    },
    include: {
      medicine: { select: { id: true, name: true, brand: true, mrp: true, price: true } },
    },
  });
  console.log(schemes);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
