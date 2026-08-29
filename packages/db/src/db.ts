import { PrismaClient, Prisma } from '../generated/client';
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';
import kyselyExtension from 'prisma-extension-kysely';
import type { DB } from './generated/types';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

export const DEFAULT_DB_POOL_CONFIG = {
    max: 20,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 5000,
} as const;

const createClient = () => {
    const connectionUrl = process.env.DATABASE_URL;

    if (!connectionUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    const prismaOptions: any = {
        log: ['error', 'warn'],
    };

    // Determine if the connection is to a local database
    const isLocal =
        connectionUrl.includes('localhost') ||
        connectionUrl.includes('127.0.0.1') ||
        connectionUrl.includes('host.docker.internal') ||
        connectionUrl.includes('//db:') ||
        connectionUrl.includes('@db:') ||
        connectionUrl.includes('sslmode=disable');

    const maxConnections =
        Number(process.env.DB_POOL_MAX) > 0
            ? Number(process.env.DB_POOL_MAX)
            : DEFAULT_DB_POOL_CONFIG.max;
    const idleTimeoutMillis =
        Number(process.env.DB_POOL_IDLE_TIMEOUT_MS) > 0
            ? Number(process.env.DB_POOL_IDLE_TIMEOUT_MS)
            : DEFAULT_DB_POOL_CONFIG.idleTimeoutMillis;
    const connectionTimeoutMillis =
        Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS) > 0
            ? Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS)
            : DEFAULT_DB_POOL_CONFIG.connectionTimeoutMillis;

    // 1. Initialize the standard connection pool with scalable limits
    const pool = new Pool({
        connectionString: connectionUrl,
        max: maxConnections,
        idleTimeoutMillis,
        connectionTimeoutMillis,
        ssl: isLocal ? false : { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
        console.error('Unexpected PG pool error on idle client:', err);
    });

    // 2. Initialize Prisma 7 strictly with the required adapter
    const baseClient = new PrismaClient({
        ...prismaOptions,
        adapter: new PrismaPg(pool),
    });

    // 3. Attach Kysely Extension
    return baseClient.$extends(
        kyselyExtension<DB>({
            kysely: (driver) =>
                new Kysely<DB>({
                    dialect: {
                        createDriver: () => driver,
                        createAdapter: () => new PostgresAdapter(),
                        createIntrospector: (db) => new PostgresIntrospector(db),
                        createQueryCompiler: () => new PostgresQueryCompiler(),
                    },
                }),
        }),
    );
};

export type PrismaKyselyClient = ReturnType<typeof createClient>;
export { Prisma };

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaKyselyClient | undefined;
};

export const getPrismaClient = (): PrismaKyselyClient => {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createClient();
    }
    return globalForPrisma.prisma;
};

export const prisma = new Proxy({} as PrismaKyselyClient, {
    get(target, prop, receiver) {
        const client = getPrismaClient();
        const value = Reflect.get(client as any, prop, receiver);
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    },
});

