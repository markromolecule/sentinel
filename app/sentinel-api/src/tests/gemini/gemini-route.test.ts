import { z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import app from '../../app';
import {
    generatePreviewRoute,
    generatePreviewRouteHandler,
    legacyGenerateReviewRoute,
} from '../../modules/integrations/gemini/gemini.controller';
import { QuestionGeneratorService } from '../../lib/gemini/services/question-generator';
import { LogsService } from '../../modules/general/logs/logs.service';
import { PassageQualityValidationError } from '../../lib/gemini/services/question-normalizer';

describe('Gemini AI routes', () => {
    const createAuthorizedApp = (
        args: { permissionKeys: string[]; role?: string } = {
            permissionKeys: [],
            role: 'support',
        },
    ) => {
        const testApp = new OpenAPIHono();

        testApp.use('*', async (c, next) => {
            c.set('dbClient', {} as any);
            c.set('user', { id: 'user-1' } as any);
            c.set('supabaseUser', {
                sub: 'user-1',
                user_metadata: {
                    role: args.role ?? 'support',
                },
            } as any);
            c.set('institutionId', 'institution-1');
            c.set('role', args.role ?? 'support');
            c.set('activePermissionKeys', args.permissionKeys);
            await next();
        });

        testApp.openapi(generatePreviewRoute, generatePreviewRouteHandler);
        testApp.openapi(legacyGenerateReviewRoute, generatePreviewRouteHandler);

        return testApp;
    };

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it.each(['/ai/generate-preview', '/ai/generate-review'])(
        'keeps %s registered behind auth',
        async (path) => {
            const response = await app.request(path, {
                method: 'POST',
            });

            expect(response.status).toBe(401);
            await expect(response.json()).resolves.toMatchObject({
                message: 'Missing auth token',
            });
        },
    );

    it.each(['/ai/generate-preview', '/ai/generate-review'])(
        'allows %s for callers with ai:generate_questions',
        async (path) => {
            const generateSpy = vi
                .spyOn(QuestionGeneratorService, 'generatePreviewFromPdf')
                .mockResolvedValue({
                    target: 'QUESTION_BANK',
                } as any);
            const logSpy = vi.spyOn(LogsService, 'createLog').mockResolvedValue(undefined as any);

            const testApp = createAuthorizedApp({
                permissionKeys: ['ai:generate_questions'],
                role: 'support',
            });
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

            const response = await testApp.request(path.replace('/ai', ''), {
                method: 'POST',
                body: formData,
            });

            expect(response.status).toBe(200);
            expect(generateSpy).toHaveBeenCalledTimes(1);
            expect(logSpy).toHaveBeenCalledTimes(1);
        },
    );

    it.each(['/ai/generate-preview', '/ai/generate-review'])(
        'allows %s for callers with assessments:manage',
        async (path) => {
            const generateSpy = vi
                .spyOn(QuestionGeneratorService, 'generatePreviewFromPdf')
                .mockResolvedValue({
                    target: 'QUESTION_BANK',
                } as any);
            const logSpy = vi.spyOn(LogsService, 'createLog').mockResolvedValue(undefined as any);

            const testApp = createAuthorizedApp({
                permissionKeys: ['assessments:manage'],
                role: 'instructor',
            });
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

            const response = await testApp.request(path.replace('/ai', ''), {
                method: 'POST',
                body: formData,
            });

            expect(response.status).toBe(200);
            expect(generateSpy).toHaveBeenCalledTimes(1);
            expect(logSpy).toHaveBeenCalledTimes(1);
        },
    );

    it.each(['/ai/generate-preview', '/ai/generate-review'])(
        'returns 403 when callers have neither ai:generate_questions nor assessments:manage on %s',
        async (path) => {
            const generateSpy = vi.spyOn(QuestionGeneratorService, 'generatePreviewFromPdf');

            const testApp = createAuthorizedApp({
                permissionKeys: [],
                role: 'student',
            });
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

            const response = await testApp.request(path.replace('/ai', ''), {
                method: 'POST',
                body: formData,
            });

            expect(response.status).toBe(403);
            expect(generateSpy).not.toHaveBeenCalled();
        },
    );

    it('returns 502 with quality validation message when PassageQualityValidationError is thrown', async () => {
        vi.spyOn(QuestionGeneratorService, 'generatePreviewFromPdf').mockRejectedValue(
            new HTTPException(502, {
                message:
                    'AI passage generation did not meet quality checks. The questions could not be generated without leaking answers.',
            }),
        );

        const testApp = createAuthorizedApp({
            permissionKeys: ['ai:generate_questions'],
            role: 'instructor',
        });
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

        const response = await testApp.request('/generate-preview', {
            method: 'POST',
            body: formData,
        });

        expect(response.status).toBe(502);
        const text = await response.text();
        expect(text).toContain('AI passage generation did not meet quality checks');
    });
});
