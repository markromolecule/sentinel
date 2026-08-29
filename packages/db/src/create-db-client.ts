import { prisma, type Prisma } from './db';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Shared Kysely database query client instance.
 * Provides type-safe querying leveraging the Kysely query builder and auto-generated database types.
 */
export type DbClient = typeof prisma.$kysely;

export const dbClient = new Proxy({} as DbClient, {
    get(target, prop, receiver) {
        const kysely = prisma.$kysely;
        const value = Reflect.get(kysely as any, prop, receiver);
        if (typeof value === 'function') {
            return value.bind(kysely);
        }
        return value;
    },
});
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
 * If an active transaction exists in AsyncLocalStorage (e.g. during testing or nested calls)
 * or an existing client is passed, it is reused transparently.
 */
export async function executeTransaction<T>(
    callback: (trx: DbClient) => Promise<T>,
    options?: TransactionOptions,
): Promise<T>;
export async function executeTransaction<T>(
    db: DbClient,
    callback: (trx: DbClient) => Promise<T>,
    options?: TransactionOptions,
): Promise<T>;
export async function executeTransaction<T>(
    dbOrCallback: DbClient | ((trx: DbClient) => Promise<T>),
    callbackOrOptions?: ((trx: DbClient) => Promise<T>) | TransactionOptions,
    options?: TransactionOptions,
): Promise<T> {
    let explicitDb: DbClient | undefined;
    let callback: (trx: DbClient) => Promise<T>;
    let txOptions: TransactionOptions | undefined;

    if (typeof dbOrCallback === 'function') {
        callback = dbOrCallback;
        txOptions = callbackOrOptions as TransactionOptions | undefined;
    } else {
        explicitDb = dbOrCallback;
        callback = callbackOrOptions as (trx: DbClient) => Promise<T>;
        txOptions = options;
    }

    if (explicitDb && explicitDb !== dbClient) {
        return await callback(explicitDb);
    }

    const activeTrx = transactionStorage.getStore();
    if (activeTrx) {
        return await callback(activeTrx);
    }

    return await prisma.$transaction(async (tx) => {
        const trx = (tx as any).$kysely as DbClient;
        return await transactionStorage.run(trx, () => callback(trx));
    }, txOptions);
}
