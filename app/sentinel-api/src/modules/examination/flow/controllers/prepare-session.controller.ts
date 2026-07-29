import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { prepareSessionSchema } from '../flow.dto';
import { SessionManagerService } from '../flow.service';
import { EntitlementsRepository } from '../../access/data/entitlements.repository';

export const prepareSessionRoute = createRoute({
    method: 'post',
    path: '/prepare',
    tags: ['Examination Flow'],
    summary: 'Prepare an Exam Turn-In',
    description: 'Builds the authoritative submission preview for a student attempt.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: prepareSessionSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: prepareSessionSchema.response,
                },
            },
            description: 'Turn-in preview prepared successfully',
        },
        403: {
            description: 'Forbidden - Only students can prepare a turn-in preview',
        },
        404: {
            description: 'Exam session not found',
        },
        409: {
            description: 'Exam session cannot be prepared',
        },
    },
});

export const prepareSessionRouteHandler: AppRouteHandler<typeof prepareSessionRoute> = async (
    c,
) => {
    try {
        const body = c.req.valid('json');
        const user = c.get('user');

        if (!user?.id) {
            throw new HTTPException(403, {
                message: 'Forbidden. Only students can prepare exam submissions.',
            });
        }

        const studentProfile = await EntitlementsRepository.getStudentProfileByUserId(
            c.get('dbClient'),
            user.id,
        );

        if (!studentProfile) {
            throw new HTTPException(403, {
                message: 'Forbidden. Only students can prepare exam submissions.',
            });
        }

        const result = await SessionManagerService.prepareSession(c.get('dbClient'), user.id, body);

        return c.json(
            {
                message: 'Turn-in preview prepared successfully',
                data: result,
            },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Prepare Session Error:');
    }
};
