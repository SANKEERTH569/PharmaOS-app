const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function main() {
  const retailer = await prisma.user.findFirst({ where: { role: 'RETAILER' } });
  if (!retailer) throw new Error("No retailer found");
  
  const token = jwt.sign(
    { id: retailer.id, role: retailer.role, wholesaler_id: retailer.wholesaler_id, retailer_id: retailer.retailer_id },
    process.env.JWT_SECRET || 'fallback_secret_if_not_in_env'
  );

  const res = await fetch('http://localhost:3000/api/marketplace/medicines', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("Schemes length:", data.schemes ? data.schemes.length : "undefined");
  if(data.schemes) console.log(data.schemes);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
