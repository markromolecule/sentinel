import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, authCache, lastSeenUpdatedMap, AuthLruCache, getTokenDigest } from './auth';
import { sign } from 'hono/jwt';
import { prisma } from '@sentinel/db';

vi.mock('@sentinel/db', () => ({
    prisma: {
        users: {
            findUnique: vi.fn(),
        },
        user_profiles: {
            update: vi.fn().mockResolvedValue({}),
        },
    },
}));

vi.mock('../modules/security/permission/data/get-user-active-permissions', () => ({
    getUserActivePermissions: vi.fn().mockResolvedValue(['exams:read', 'exams:take']),
}));

vi.mock('../modules/security/access-control/services/access-control-catalog.service', () => ({
    ensureAccessControlCatalogs: vi.fn().mockResolvedValue(undefined),
}));

describe('Auth Middleware & LRU Auth Cache', () => {
    const JWT_SECRET = 'test-secret-12345678901234567890';

    beforeEach(() => {
        vi.clearAllMocks();
        authCache.clear();
        lastSeenUpdatedMap.clear();
        process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
        process.env.SUPABASE_JWT_ALGORITHM = 'HS256';
    });

    it('manages LRU cache eviction and TTL expiration correctly', () => {
        const cache = new AuthLruCache(2, 50); // max 2 items, 50ms TTL

        const item1 = {
            userId: 'u1',
            dbUser: { id: 'u1' },
            institutionId: 'inst-1',
            role: 'student',
            activePermissionKeys: ['p1'],
            supabaseUser: { sub: 'u1' },
        };
        const item2 = { ...item1, userId: 'u2' };
        const item3 = { ...item1, userId: 'u3' };

        cache.set('k1', item1);
        cache.set('k2', item2);
        expect(cache.size).toBe(2);

        // Access k1 to make k2 the oldest
        expect(cache.get('k1')?.userId).toBe('u1');

        // Adding k3 should evict k2
        cache.set('k3', item3);
        expect(cache.get('k2')).toBeUndefined();
        expect(cache.get('k1')).toBeDefined();
        expect(cache.get('k3')).toBeDefined();
    });

    it('authenticates user from DB on cache miss and caches the result', async () => {
        const payload = {
            sub: 'user-uuid-1',
            email: 'student@example.com',
            user_metadata: { role: 'student' },
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        const token = await sign(payload, JWT_SECRET, 'HS256');

        const mockDbUser = {
            id: 'user-uuid-1',
            email: 'student@example.com',
            user_profiles: {
                institution_id: 'inst-999',
                last_seen_at: new Date(Date.now() - 600000), // 10 mins ago
            },
        };
        (prisma.users.findUnique as any).mockResolvedValue(mockDbUser);

        const app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => {
            return c.json({
                userId: (c.get('user') as any)?.id,
                institutionId: c.get('institutionId'),
                role: c.get('role'),
                permissions: c.get('activePermissionKeys'),
            });
        });

        // Request 1: Cache Miss -> calls DB
        const res1 = await app.request('/test', {
            headers: { Authorization: `Bearer ${token}` },
        });

        expect(res1.status).toBe(200);
        const data1 = await res1.json();
        expect(data1.userId).toBe('user-uuid-1');
        expect(data1.institutionId).toBe('inst-999');
        expect(data1.role).toBe('student');
        expect(data1.permissions).toEqual(['exams:read', 'exams:take']);
        expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);

        // Verify token is in cache
        const digest = getTokenDigest(token);
        expect(authCache.get(digest)).toBeDefined();

        // Request 2: Cache Hit -> bypasses DB completely
        const res2 = await app.request('/test', {
            headers: { Authorization: `Bearer ${token}` },
        });

        expect(res2.status).toBe(200);
        const data2 = await res2.json();
        expect(data2.userId).toBe('user-uuid-1');
        expect(prisma.users.findUnique).toHaveBeenCalledTimes(1); // Still 1! No DB query executed
    });

    it('rejects request when token is missing or invalid', async () => {
        const app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.text('ok'));

        const resNoHeader = await app.request('/test');
        expect(resNoHeader.status).toBe(401);

        const resBadToken = await app.request('/test', {
            headers: { Authorization: 'Bearer invalid.token.payload' },
        });
        expect(resBadToken.status).toBe(401);
    });

    it('handles CORS OPTIONS preflight without auth check', async () => {
        const app = new Hono();
        app.use('*', authMiddleware);
        app.options('/test', (c) => c.text('options-ok'));

        const res = await app.request('/test', { method: 'OPTIONS' });
        expect(res.status).toBe(200);
        expect(prisma.users.findUnique).not.toHaveBeenCalled();
    });

    it('evicts expired token from cache and rejects with 401', async () => {
        const expiredPayload = {
            sub: 'user-expired',
            exp: Math.floor(Date.now() / 1000) - 10, // expired 10s ago
        };
        const token = await sign(expiredPayload, JWT_SECRET, 'HS256');
        const digest = getTokenDigest(token);

        // Manually place in cache with past expiration
        authCache.set(digest, {
            userId: 'user-expired',
            dbUser: { id: 'user-expired' },
            institutionId: 'inst-1',
            role: 'student',
            activePermissionKeys: [],
            supabaseUser: expiredPayload,
        });

        const app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.text('ok'));

        const res = await app.request('/test', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status).toBe(401);
        expect(authCache.get(digest)).toBeUndefined();
    });

    it('handles 50 concurrent requests for the same user with single DB read and throttled background write', async () => {
        const payload = {
            sub: 'user-concurrent-1',
            email: 'concurrent@example.com',
            user_metadata: { role: 'student' },
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        const token = await sign(payload, JWT_SECRET, 'HS256');

        const mockDbUser = {
            id: 'user-concurrent-1',
            email: 'concurrent@example.com',
            user_profiles: {
                institution_id: 'inst-concurrent',
                last_seen_at: new Date(Date.now() - 600000),
            },
        };
        (prisma.users.findUnique as any).mockResolvedValue(mockDbUser);

        const app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ ok: true }));

        // Fire 50 concurrent requests simultaneously
        const requests = Array.from({ length: 50 }, () =>
            app.request('/test', {
                headers: { Authorization: `Bearer ${token}` },
            }),
        );

        const responses = await Promise.all(requests);
        for (const res of responses) {
            expect(res.status).toBe(200);
        }

        // DB read should be called at most once (or minimal during cache population)
        expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);

        // last_seen_at update is throttled to at most 1 execution in 5 minutes
        expect(prisma.user_profiles.update).toHaveBeenCalledTimes(1);
    });
});
