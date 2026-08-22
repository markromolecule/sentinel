import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { describe, expect, it, vi } from 'vitest';
import app from '../app';
import {
    generatePreviewRoute,
    generatePreviewRouteHandler,
} from '../modules/integrations/gemini/gemini.controller';
import { QuestionGeneratorService } from '../lib/gemini/services/question-generator';

describe('CORS functionality', () => {
    const createCorsAwareAiApp = () => {
        const testApp = new OpenAPIHono();

        testApp.use(
            '*',
            cors({
                origin: (origin) => (origin === 'https://app.sentinelph.tech' ? origin : null),
                credentials: true,
                allowHeaders: ['Content-Type', 'Authorization'],
            }),
        );

        testApp.use('*', async (c, next) => {
            c.set('dbClient', {} as any);
            c.set('user', { id: 'user-1' } as any);
            c.set('supabaseUser', {
                sub: 'user-1',
                user_metadata: {
                    role: 'instructor',
                },
            } as any);
            c.set('institutionId', 'institution-1');
            c.set('role', 'instructor');
            c.set('activePermissionKeys', ['ai:generate_questions']);
            await next();
        });

        testApp.openapi(generatePreviewRoute, generatePreviewRouteHandler);

        testApp.onError((err, c) => {
            const origin = c.req.header('Origin');
            if (origin === 'https://app.sentinelph.tech') {
                c.header('Access-Control-Allow-Origin', origin);
                c.header('Access-Control-Allow-Credentials', 'true');
                c.header('Vary', 'Origin');
            }

            if (err instanceof HTTPException) {
                return c.json(
                    {
                        success: false,
                        error: err.name,
                        message: err.message,
                    },
                    err.status,
                );
            }

            return c.json(
                {
                    success: false,
                    error: err.name || 'Internal Server Error',
                    message: err.message,
                },
                500,
            );
        });

        return testApp;
    };

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

    it('should keep CORS headers on AI preview 502 responses', async () => {
        vi.spyOn(QuestionGeneratorService, 'generatePreviewFromPdf').mockRejectedValue(
            new HTTPException(502, {
                message: 'Gemini request timed out or failed to connect.',
            }),
        );

        const testApp = createCorsAwareAiApp();
        const formData = new FormData();
        formData.append(
            'file',
            new File(['%PDF-1.4 test'], 'lesson.pdf', {
                type: 'application/pdf',
            }),
        );
        formData.append(
            'config',
            JSON.stringify({
                target: 'QUESTION_BANK',
                questionCount: 1,
                questionTypeDistribution: [{ type: 'MULTIPLE_CHOICE', count: 1 }],
            }),
        );

        const res = await testApp.request('/generate-preview', {
            method: 'POST',
            body: formData,
            headers: {
                Origin: 'https://app.sentinelph.tech',
            },
        });

        expect(res.status).toBe(502);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.sentinelph.tech');
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
        await expect(res.json()).resolves.toMatchObject({
            success: false,
            message: 'Gemini request timed out or failed to connect.',
        });
    });

    it('should return CORS headers for dynamic localhost ports', async () => {
        const res = await app.request('/', {
            method: 'OPTIONS',
            headers: {
                Origin: 'http://localhost:3004',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3004');
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should return CORS headers for private LAN IPs in development', async () => {
        const res1 = await app.request('/', {
            method: 'OPTIONS',
            headers: {
                Origin: 'http://192.168.1.102:8081',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(res1.status).toBe(204);
        expect(res1.headers.get('Access-Control-Allow-Origin')).toBe('http://192.168.1.102:8081');

        const res2 = await app.request('/', {
            method: 'OPTIONS',
            headers: {
                Origin: 'http://10.0.2.2:8081',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(res2.status).toBe(204);
        expect(res2.headers.get('Access-Control-Allow-Origin')).toBe('http://10.0.2.2:8081');
    });

    it('should allow Expo scheme origins in development', async () => {
        const res = await app.request('/', {
            method: 'OPTIONS',
            headers: {
                Origin: 'exp://192.168.1.102:8081',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('exp://192.168.1.102:8081');
    });

    it('should keep CORS headers on 404 responses', async () => {
        const res = await app.request('/non-existent-route', {
            method: 'GET',
            headers: {
                Origin: 'https://app.sentinelph.tech',
            },
        });

        expect(res.status).toBe(404);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.sentinelph.tech');
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
});

