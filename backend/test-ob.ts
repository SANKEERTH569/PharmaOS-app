import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    const wholesaler = await prisma.wholesaler.findFirst();
    if (!wholesaler) return console.log('No wholesaler');
    const retailer = await prisma.retailer.findFirst({ where: { wholesaler_id: wholesaler.id } });
    if (!retailer) return console.log('No retailer');

    try {
        const amount = 500;
        const notes = 'Test opening balance';
        const result = await prisma.$transaction(async (tx) => {
            const newBalance = retailer.current_balance + amount;
            const ledgerEntry = await tx.ledgerEntry.create({
                data: {
                    wholesaler_id: wholesaler.id,
                    retailer_id: retailer.id,
                    type: 'DEBIT',
                    amount,
                    balance_after: newBalance,
                    description: notes,
                },
            });
            const updatedRetailer = await tx.retailer.update({
                where: { id: retailer.id },
                data: { current_balance: newBalance },
            });
            return { ledgerEntry, retailer: updatedRetailer };
        });
        console.log('SUCCESS:', result);
    } catch (err: any) {
        console.error('ERROR:', err);
    }
}

test().finally(() => prisma.$disconnect());
