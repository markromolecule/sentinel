import { describe, expect, it } from 'vitest';
import app from '../app';

describe('CORS functionality', () => {
    it('should return CORS headers for allowed origins (exact match)', async () => {
        const res = await app.request('/', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://core.sentinelph.tech',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://core.sentinelph.tech');
        expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should return CORS headers for allowed subdomains (regex match)', async () => {
        const res = await app.request('/', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://random-preview.vercel.app',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
            'https://random-preview.vercel.app',
        );
    });

    it('should return default origin (localhost) for disallowed origins', async () => {
        const res = await app.request('/', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://evil.com',
                'Access-Control-Request-Method': 'GET',
            },
        });

        // Hono's cors middleware returns null if the origin is not matched, resulting in no CORS header
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should return CORS headers for specific API routes', async () => {
        const res = await app.request('/heartbeat', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://core.sentinelph.tech',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://core.sentinelph.tech');
    });

    it('should return CORS headers for AI route preflight requests from the app domain', async () => {
        const res = await app.request('/ai/generate-preview', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://app.sentinelph.tech',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'authorization, content-type',
            },
        });

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.sentinelph.tech');
        expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
        expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
        expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });

    it('should keep CORS headers on AI route error responses from the app domain', async () => {
        const res = await app.request('/ai/generate-preview', {
            method: 'POST',
            headers: {
                Origin: 'https://app.sentinelph.tech',
            },
        });

        expect(res.status).toBe(401);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.sentinelph.tech');
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
        await expect(res.json()).resolves.toMatchObject({
            message: 'Missing auth token',
        });
    });
});
