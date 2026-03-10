import { prisma } from '../lib/prisma';

/**
 * DEBIT: Wholesaler owes MORE (supply order delivered).
 * Called when supply order status → DELIVERED.
 */
export async function debitWholesaler(
    mainWholesalerId: string,
    wholesalerId: string,
    amount: number,
    orderId: string,
    description: string
) {
    return await prisma.$transaction(async (tx) => {
        // Upsert connection to ensure it exists
        const connection = await tx.mainWholesalerConnection.upsert({
            where: {
                main_wholesaler_id_wholesaler_id: {
                    main_wholesaler_id: mainWholesalerId,
                    wholesaler_id: wholesalerId,
                },
            },
            update: {},
            create: {
                main_wholesaler_id: mainWholesalerId,
                wholesaler_id: wholesalerId,
                credit_limit: 500000,
                current_balance: 0,
            },
        });

        const entries = await tx.mainWholesalerLedgerEntry.findMany({
            where: { main_wholesaler_id: mainWholesalerId, wholesaler_id: wholesalerId },
        });
        const currentBalance = entries.reduce(
            (acc, e) => (e.type === 'DEBIT' ? acc + e.amount : acc - e.amount),
            0
        );
        const newBalance = currentBalance + amount;

        await tx.mainWholesalerConnection.update({
            where: { id: connection.id },
            data: { current_balance: newBalance },
        });

        const entry = await tx.mainWholesalerLedgerEntry.create({
            data: {
                main_wholesaler_id: mainWholesalerId,
                wholesaler_id: wholesalerId,
                type: 'DEBIT',
                amount,
                balance_after: newBalance,
                reference_id: orderId,
                description,
            },
        });

        return { entry, newBalance };
    });
}

/**
 * CREDIT: Wholesaler owes LESS (payment made).
 * Called when a main wholesaler payment is recorded.
 */
export async function creditWholesaler(
    mainWholesalerId: string,
    wholesalerId: string,
    amount: number,
    referenceId: string,
    description: string
) {
    return await prisma.$transaction(async (tx) => {
        // Upsert connection to ensure it exists
        const connection = await tx.mainWholesalerConnection.upsert({
            where: {
                main_wholesaler_id_wholesaler_id: {
                    main_wholesaler_id: mainWholesalerId,
                    wholesaler_id: wholesalerId,
                },
            },
            update: {},
            create: {
                main_wholesaler_id: mainWholesalerId,
                wholesaler_id: wholesalerId,
                credit_limit: 500000,
                current_balance: 0,
            },
        });

        const entries = await tx.mainWholesalerLedgerEntry.findMany({
            where: { main_wholesaler_id: mainWholesalerId, wholesaler_id: wholesalerId },
        });
        const currentBalance = entries.reduce(
            (acc, e) => (e.type === 'DEBIT' ? acc + e.amount : acc - e.amount),
            0
        );
        const newBalance = Math.max(0, currentBalance - amount);

        await tx.mainWholesalerConnection.update({
            where: { id: connection.id },
            data: { current_balance: newBalance },
        });

        const entry = await tx.mainWholesalerLedgerEntry.create({
            data: {
                main_wholesaler_id: mainWholesalerId,
                wholesaler_id: wholesalerId,
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

/** Get current ledger-derived balance */
export async function getWholesalerBalance(mainWholesalerId: string, wholesalerId: string): Promise<number> {
    const entries = await prisma.mainWholesalerLedgerEntry.findMany({
        where: { main_wholesaler_id: mainWholesalerId, wholesaler_id: wholesalerId },
    });
    return entries.reduce(
        (acc, e) => (e.type === 'DEBIT' ? acc + e.amount : acc - e.amount),
        0
    );
}
