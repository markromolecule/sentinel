import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { sessionStatusSchema } from '../flow.dto';
import { SessionManagerService } from '../flow.service';

export const getSessionStatusRoute = createRoute({
    method: 'get',
    path: '/sessions/:sessionId/status',
    tags: ['Examination Flow'],
    summary: 'Get Exam Session Status',
    description: 'Returns lightweight lifecycle status for the authenticated student session.',
    request: {
        params: sessionStatusSchema.params,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: sessionStatusSchema.response,
                },
            },
            description: 'Session status retrieved successfully',
        },
        404: {
            description: 'Exam session not found',
        },
    },
});

export const getSessionStatusRouteHandler: AppRouteHandler<typeof getSessionStatusRoute> = async (
    c,
) => {
    try {
        const { sessionId } = c.req.valid('param');
        const user = c.get('user');
        const status = await SessionManagerService.getSessionStatus(
            c.get('dbClient'),
            user.id,
            sessionId,
        );

        return c.json({
            message: 'Session status retrieved successfully.',
            data: status,
        });
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Get Session Status Error:');
    }
};
