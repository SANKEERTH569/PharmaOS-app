import { prisma } from '../lib/prisma';

/**
 * DEBIT: Retailer owes MORE (order delivered).
 * Always called when order status → DELIVERED.
 */
export async function debitRetailer(
  wholesalerId: string,
  retailerId: string,
  amount: number,
  orderId: string,
  description: string
) {
  return await prisma.$transaction(async (tx) => {
    // Get current balance from ledger entries (source of truth)
    const entries = await tx.ledgerEntry.findMany({
      where: { wholesaler_id: wholesalerId, retailer_id: retailerId },
    });
    const currentBalance = entries.reduce(
      (acc, e) => (e.type === 'DEBIT' ? acc + e.amount : acc - e.amount),
      0
    );
    const newBalance = currentBalance + amount;

    // Update retailer.current_balance snapshot for quick reads
    await tx.retailer.update({
      where: { id: retailerId },
      data: { current_balance: newBalance },
    });

    // Create ledger entry
    const entry = await tx.ledgerEntry.create({
      data: {
        wholesaler_id: wholesalerId,
        retailer_id: retailerId,
        type: 'DEBIT',
        amount,
        balance_after: newBalance,
        reference_id: orderId,
        order_id: orderId,
        description,
      },
    });

    return { entry, newBalance };
  });
}

/**
 * CREDIT: Retailer owes LESS (payment made).
 * Called when a payment is recorded.
 */
export async function creditRetailer(
  wholesalerId: string,
  retailerId: string,
  amount: number,
  referenceId: string,
  description: string
) {
  return await prisma.$transaction(async (tx) => {
    const entries = await tx.ledgerEntry.findMany({
      where: { wholesaler_id: wholesalerId, retailer_id: retailerId },
    });
    const currentBalance = entries.reduce(
      (acc, e) => (e.type === 'DEBIT' ? acc + e.amount : acc - e.amount),
      0
    );
    const newBalance = Math.max(0, currentBalance - amount);

    await tx.retailer.update({
      where: { id: retailerId },
      data: { current_balance: newBalance, last_payment_date: new Date() },
    });

    const entry = await tx.ledgerEntry.create({
      data: {
        wholesaler_id: wholesalerId,
        retailer_id: retailerId,
        type: 'CREDIT',
        amount,
        balance_after: newBalance,
        reference_id: referenceId,
        description,
      },
    });

    return { entry, newBalance };
  });
}

/** Get current ledger-derived balance for a retailer under a wholesaler */
export async function getRetailerBalance(wholesalerId: string, retailerId: string): Promise<number> {
  const entries = await prisma.ledgerEntry.findMany({
    where: { wholesaler_id: wholesalerId, retailer_id: retailerId },
  });
  return entries.reduce(
    (acc, e) => (e.type === 'DEBIT' ? acc + e.amount : acc - e.amount),
    0
  );
}
