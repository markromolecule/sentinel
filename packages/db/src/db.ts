import { PrismaClient, Prisma } from '../generated/client';
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';
import kyselyExtension from 'prisma-extension-kysely';
import type { DB } from './generated/types';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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
        Number(process.env.DB_POOL_MAX) > 0 ? Number(process.env.DB_POOL_MAX) : 20;
    const idleTimeoutMillis =
        Number(process.env.DB_POOL_IDLE_TIMEOUT_MS) > 0
            ? Number(process.env.DB_POOL_IDLE_TIMEOUT_MS)
            : 30000;
    const connectionTimeoutMillis =
        Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS) > 0
            ? Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS)
            : 20000;

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

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;

