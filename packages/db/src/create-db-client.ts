import { prisma, type Prisma } from './db';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Shared Kysely database query client instance.
 * Provides type-safe querying leveraging the Kysely query builder and auto-generated database types.
 */
export const dbClient = prisma.$kysely;

export type DbClient = typeof dbClient;
export type TransactionOptions = {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
};

const globalForTransaction = globalThis as unknown as {
    transactionStorage: AsyncLocalStorage<DbClient> | undefined;
};

export const transactionStorage =
    globalForTransaction.transactionStorage ?? new AsyncLocalStorage<DbClient>();
globalForTransaction.transactionStorage = transactionStorage;


/**
 * Execute a transaction using Prisma's $transaction while staying within the Kysely ecosystem
 * for queries. This is necessary because the prisma-extension-kysely driver doesn't support
 * native Kysely transactions.
 * If an active transaction exists in AsyncLocalStorage (e.g. during testing or nested calls),
 * it is reused transparently.
 */
export async function executeTransaction<T>(
    callback: (trx: DbClient) => Promise<T>,
    options?: TransactionOptions,
): Promise<T> {
    const activeTrx = transactionStorage.getStore();
    if (activeTrx) {
        return await callback(activeTrx);
    }

    return await prisma.$transaction(async (tx) => {
        const trx = (tx as any).$kysely as DbClient;
        return await transactionStorage.run(trx, () => callback(trx));
    }, options);
}
