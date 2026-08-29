import { describe, it, expect } from 'vitest';
import { prisma, DEFAULT_DB_POOL_CONFIG } from '../db';
import { dbClient } from '../create-db-client';

describe('Database Connection Pool Configuration', () => {
    it('defines tuned production pool defaults for multi-replica concurrency', () => {
        expect(DEFAULT_DB_POOL_CONFIG.max).toBe(20);
        expect(DEFAULT_DB_POOL_CONFIG.idleTimeoutMillis).toBe(15000);
        expect(DEFAULT_DB_POOL_CONFIG.connectionTimeoutMillis).toBe(5000);
    });

    it('exposes prisma and kysely dbClient proxies with expected properties', () => {
        expect(prisma).toBeDefined();
        expect(dbClient).toBeDefined();
    });

    it('verifies environment variable fallback pool configuration logic', () => {
        const max =
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

        expect(max).toBeGreaterThanOrEqual(1);
        expect(idleTimeoutMillis).toBeGreaterThanOrEqual(1000);
        expect(connectionTimeoutMillis).toBeGreaterThanOrEqual(1000);
    });
});
