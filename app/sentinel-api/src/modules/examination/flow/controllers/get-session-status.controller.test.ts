import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import {
    getSessionStatusRoute,
    getSessionStatusRouteHandler,
} from './get-session-status.controller';
import { SessionManagerService } from '../flow.service';

vi.mock('../flow.service', () => ({
    SessionManagerService: {
        getSessionStatus: vi.fn(),
    },
}));

describe('getSessionStatusRouteHandler', () => {
    function createApp(user?: { id: string } | null) {
        const app = new OpenAPIHono();

        app.use('*', async (c, next) => {
            c.set('dbClient', {} as any);
            c.set('user', user ?? { id: 'user-1' });
            await next();
        });

        app.openapi(getSessionStatusRoute, getSessionStatusRouteHandler);

        return app;
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns owned session status from the service', async () => {
        vi.mocked(SessionManagerService.getSessionStatus).mockResolvedValue({
            sessionId: '11111111-1111-4111-8111-111111111111',
            attemptId: '11111111-1111-4111-8111-111111111111',
            examId: '22222222-2222-4222-8222-222222222222',
            status: 'IN_PROGRESS',
            lifecycleState: 'IN_PROGRESS',
            completedAt: null,
            closedReason: null,
            terminalMessage: null,
        });

        const app = createApp();
        const response = await app.request(
            '/sessions/11111111-1111-4111-8111-111111111111/status',
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            message: 'Session status retrieved successfully.',
            data: {
                sessionId: '11111111-1111-4111-8111-111111111111',
                attemptId: '11111111-1111-4111-8111-111111111111',
                examId: '22222222-2222-4222-8222-222222222222',
                status: 'IN_PROGRESS',
                lifecycleState: 'IN_PROGRESS',
                completedAt: null,
                closedReason: null,
                terminalMessage: null,
            },
        });
        expect(SessionManagerService.getSessionStatus).toHaveBeenCalledWith(
            expect.any(Object),
            'user-1',
            '11111111-1111-4111-8111-111111111111',
        );
    });

    it('returns 404 for missing or cross-student sessions', async () => {
        vi.mocked(SessionManagerService.getSessionStatus).mockRejectedValue(
            new HTTPException(404, {
                message: 'Exam session not found for the authenticated student.',
            }),
        );

        const app = createApp();
        const response = await app.request(
            '/sessions/11111111-1111-4111-8111-111111111111/status',
        );

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: 'Exam session not found for the authenticated student.',
        });
    });
});
