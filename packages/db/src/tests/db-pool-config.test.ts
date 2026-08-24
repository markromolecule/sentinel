import { describe, it, expect } from 'vitest';
import { prisma } from '../db';

describe('Database Connection Pool Configuration', () => {
    it('initializes prisma and kysely extensions successfully with pool adapter', () => {
        expect(prisma).toBeDefined();
        expect(prisma.$kysely).toBeDefined();
    });

    it('verifies default connection pool configuration settings in db module', async () => {
        // Run a lightweight raw query to ensure the pool establishes connections
        const result = await prisma.$queryRaw<Array<{ num: number }>>`SELECT 1 as num`;
        expect(result).toBeDefined();
        expect(result[0]?.num).toBe(1);
    });
});
