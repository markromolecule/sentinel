import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { getBaselineEssayRubricSchema } from '../../../examination/rubric/rubric.dto';
import { RubricService } from '../../../examination/rubric/services/rubric.service';
import { assertSupportAccess } from '../services/access-control-authorization.service';

export const getBaselineEssayRubricRoute = createRoute({
    method: 'get',
    path: '/essay-rubric',
    tags: ['Access Control / Essay Rubric'],
    summary: 'Get the active baseline essay rubric',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Active baseline essay rubric fetched successfully',
            content: {
                'application/json': {
                    schema: getBaselineEssayRubricSchema.response,
                },
            },
        },
    },
});

export const getBaselineEssayRubricRouteHandler: AppRouteHandler<
    typeof getBaselineEssayRubricRoute
> = async (c) => {
    assertSupportAccess(c);

    const dbClient = c.get('dbClient');
    const rubric = await RubricService.resolveEffectiveEssayRubric(dbClient, null);

    return c.json(
        {
            message: 'Active baseline essay rubric fetched successfully',
            data: rubric,
        },
        200,
    );
};
