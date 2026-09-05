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
export const authInFlightPromises = new Map<string, Promise<CachedAuthContext>>();

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

function applyCachedAuthToContext(c: Context<HonoEnv>, cachedAuth: CachedAuthContext) {
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

        applyCachedAuthToContext(c, cachedAuth);
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

    // 4. Coalesce in-flight token resolution (synchronous map registration)
    let inFlightPromise = authInFlightPromises.get(tokenDigest);
    if (!inFlightPromise) {
        inFlightPromise = (async (): Promise<CachedAuthContext> => {
            let userId: string;
            let decodedPayload: any;

            // Verify JWT
            let detectedAlg = SUPABASE_JWT_ALGORITHM || 'HS256';
            try {
                const [headerB64] = token.split('.');
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
                decodedPayload = await verify(token, SUPABASE_JWT_SECRET!, 'HS256');
            }

            userId = decodedPayload.sub as string;

            // Fetch User from DB
            const dbUser = await prisma.users.findUnique({
                where: { id: userId },
                include: { user_profiles: true },
            });

            if (!dbUser) {
                throw new HTTPException(401, { message: 'User record not found' });
            }

            const institutionId = dbUser.user_profiles?.institution_id || '';
            const rawRole =
                decodedPayload?.user_metadata?.role ||
                decodedPayload?.app_metadata?.role ||
                '';
            const role = String(rawRole).toLowerCase();

            await ensureAccessControlCatalogsSynced(c);
            const activePermissionKeys = await getUserActivePermissions(c.get('dbClient'), userId);

            const now = Date.now();
            const tokenRemainingMs = decodedPayload.exp
                ? Math.max(0, decodedPayload.exp * 1000 - now)
                : 60_000;
            const effectiveTtl = Math.min(60_000, tokenRemainingMs);

            const authData: CachedAuthContext = {
                userId,
                dbUser,
                institutionId,
                role,
                activePermissionKeys,
                supabaseUser: decodedPayload,
                cachedAt: now,
                expiresAt: now + effectiveTtl,
            };

            if (effectiveTtl > 0) {
                authCache.set(tokenDigest, authData, effectiveTtl);
            }

            return authData;
        })();

        authInFlightPromises.set(tokenDigest, inFlightPromise);
        inFlightPromise.catch(() => {}).finally(() => {
            authInFlightPromises.delete(tokenDigest);
        });
    }

    try {
        const authData = await inFlightPromise;
        applyCachedAuthToContext(c, authData);
    } catch (error: any) {
        if (error instanceof HTTPException) throw error;
        console.error('JWT Verification / DB Error:', error.message || error);
        throw new HTTPException(401, { message: error.message || 'Invalid or expired token' });
    }

    return await next();
};
