import { Context, Next } from 'hono';
import { env } from 'hono/adapter';
import { verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '@sentinel/db';
import crypto from 'crypto';
import { getUserActivePermissions } from '../modules/security/permission/data/get-user-active-permissions';
import { ensureAccessControlCatalogs } from '../modules/security/access-control/services/access-control-catalog.service';
import type { HonoEnv } from '../types/hono';

export type AppBindings = HonoEnv;

export interface CachedAuthContext {
    userId: string;
    dbUser: any;
    institutionId: string;
    role: string;
    activePermissionKeys: string[];
    supabaseUser: any;
    cachedAt: number;
    expiresAt: number;
}

export class AuthLruCache {
    private cache = new Map<string, CachedAuthContext>();
    private maxEntries: number;
    private ttlMs: number;

    constructor(maxEntries = 5000, ttlMs = 60_000) {
        this.maxEntries = maxEntries;
        this.ttlMs = ttlMs;
    }

    get(key: string): CachedAuthContext | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        // Move to end for LRU refresh
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry;
    }

    set(
        key: string,
        value: Omit<CachedAuthContext, 'cachedAt' | 'expiresAt'>,
        customTtlMs?: number,
    ): CachedAuthContext {
        if (this.cache.size >= this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        const now = Date.now();
        const ttl = customTtlMs ?? this.ttlMs;
        const entry: CachedAuthContext = {
            ...value,
            cachedAt: now,
            expiresAt: now + ttl,
        };
        this.cache.set(key, entry);
        return entry;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

export const authCache = new AuthLruCache(5000, 60_000);
export const lastSeenUpdatedMap = new Map<string, number>();

export function getTokenDigest(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

let accessControlCatalogSyncPromise: Promise<void> | null = null;

async function ensureAccessControlCatalogsSynced(c: Context<HonoEnv>) {
    if (!accessControlCatalogSyncPromise) {
        accessControlCatalogSyncPromise = ensureAccessControlCatalogs(c.get('dbClient')).catch(
            (error) => {
                accessControlCatalogSyncPromise = null;
                throw error;
            },
        );
    }

    await accessControlCatalogSyncPromise;
}

export const authMiddleware = async (c: Context<HonoEnv>, next: Next) => {
    // 1. Handle CORS Preflight immediately
    if (c.req.method === 'OPTIONS') {
        return await next();
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        throw new HTTPException(401, { message: 'Missing auth token' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const tokenDigest = getTokenDigest(token);

    // 2. Check in-memory LRU auth cache first
    const cachedAuth = authCache.get(tokenDigest);
    if (cachedAuth) {
        if (cachedAuth.supabaseUser?.exp && cachedAuth.supabaseUser.exp * 1000 < Date.now()) {
            authCache.delete(tokenDigest);
            throw new HTTPException(401, { message: 'Invalid or expired token' });
        }

        c.set('supabaseUser', cachedAuth.supabaseUser);
        c.set('user', cachedAuth.dbUser);
        c.set('institutionId', cachedAuth.institutionId);
        c.set('role', cachedAuth.role);
        c.set('activePermissionKeys', cachedAuth.activePermissionKeys);

        // Async decoupled last_seen_at check
        if (cachedAuth.dbUser?.user_profiles) {
            const lastUpdated = lastSeenUpdatedMap.get(cachedAuth.userId);
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            if (!lastUpdated || now - lastUpdated > fiveMinutes) {
                lastSeenUpdatedMap.set(cachedAuth.userId, now);
                void prisma.user_profiles
                    .update({
                        where: { user_id: cachedAuth.userId },
                        data: { last_seen_at: new Date(now) },
                    })
                    .catch((err) => {
                        console.error('Failed to update last_seen_at asynchronously:', err);
                    });
            }
        }

        return await next();
    }

    // 3. Extract Env Vars (Hono adapter compatible)
    const { SUPABASE_JWT_SECRET, SUPABASE_JWT_ALGORITHM, SUPABASE_JWK } = {
        ...env(c),
        ...process.env,
    };

    if (!SUPABASE_JWT_SECRET && !SUPABASE_JWK) {
        console.error('Missing SUPABASE_JWT_SECRET or SUPABASE_JWK');
        throw new HTTPException(500, { message: 'Server configuration error' });
    }

    let userId: string;
    let decodedPayload: any;

    // 4. Verify JWT
    try {
        // Auto-detect algorithm from JWT header if possible
        let detectedAlg = SUPABASE_JWT_ALGORITHM || 'HS256';
        try {
            const [headerB64] = token.split('.');
            // Use Buffer for robust Base64URL decoding in Node.js
            const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
            const header = JSON.parse(headerJson);
            if (header.alg) detectedAlg = header.alg;
        } catch (e) {
            console.error('Failed to parse JWT header for algorithm detection:', e);
        }

        if (detectedAlg === 'ES256' && typeof SUPABASE_JWK === 'string') {
            const jwk = JSON.parse(SUPABASE_JWK);
            const cryptoKey = await crypto.subtle.importKey(
                'jwk',
                jwk,
                { name: 'ECDSA', namedCurve: 'P-256' },
                true,
                ['verify'],
            );
            decodedPayload = await verify(token, cryptoKey as any, 'ES256');
        } else {
            // Default to HS256 with the secret
            decodedPayload = await verify(token, SUPABASE_JWT_SECRET!, 'HS256');
        }

        userId = decodedPayload.sub as string;
        c.set('supabaseUser', decodedPayload);
    } catch (error: any) {
        console.error('JWT Verification Error:', error.message || error);
        throw new HTTPException(401, { message: 'Invalid or expired token' });
    }

    // 5. Fetch User and Sync Institution Context from DB on cache miss
    try {
        const dbUser = await prisma.users.findUnique({
            where: { id: userId },
            include: { user_profiles: true },
        });

        if (!dbUser) {
            throw new HTTPException(401, { message: 'User record not found' });
        }
        // Set user in context
        c.set('user', dbUser);
        const institutionId = dbUser.user_profiles?.institution_id || '';
        c.set('institutionId', institutionId);

        const rawRole =
            (c.get('supabaseUser') as any)?.user_metadata?.role ||
            (c.get('supabaseUser') as any)?.app_metadata?.role ||
            '';
        const role = String(rawRole).toLowerCase();
        c.set('role', role);

        await ensureAccessControlCatalogsSynced(c);
        const activePermissionKeys = await getUserActivePermissions(c.get('dbClient'), userId);
        c.set('activePermissionKeys', activePermissionKeys);

        // Populate in-memory LRU cache
        const now = Date.now();
        const tokenRemainingMs = decodedPayload.exp
            ? Math.max(0, decodedPayload.exp * 1000 - now)
            : 60_000;
        const effectiveTtl = Math.min(60_000, tokenRemainingMs);

        if (effectiveTtl > 0) {
            authCache.set(
                tokenDigest,
                {
                    userId,
                    dbUser,
                    institutionId,
                    role,
                    activePermissionKeys,
                    supabaseUser: decodedPayload,
                },
                effectiveTtl,
            );
        }

        // 6. Decoupled asynchronous Update Last Seen
        if (dbUser.user_profiles) {
            const lastUpdated = lastSeenUpdatedMap.get(userId);
            const fiveMinutes = 5 * 60 * 1000;

            if (!lastUpdated || now - lastUpdated > fiveMinutes) {
                lastSeenUpdatedMap.set(userId, now);
                void prisma.user_profiles
                    .update({
                        where: { user_id: userId },
                        data: { last_seen_at: new Date(now) },
                    })
                    .catch((e) => {
                        console.error('Failed to update last_seen_at asynchronously:', e);
                    });
            }
        }
    } catch (dbError) {
        if (dbError instanceof HTTPException) throw dbError;
        console.error('Auth Database Error:', dbError);
        throw new HTTPException(500, { message: 'Database Connection Error' });
    }
    return await next();
};
