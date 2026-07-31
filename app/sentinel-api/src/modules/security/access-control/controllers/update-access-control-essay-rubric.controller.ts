import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { updateBaselineEssayRubricSchema } from '../../../examination/rubric/rubric.dto';
import { RubricService } from '../../../examination/rubric/services/rubric.service';
import { assertSupportAccess } from '../services/access-control-authorization.service';
import { LogsService } from '../../../general/logs/logs.service';
import { findActiveBaselineRubric } from '../../../examination/rubric/data/find-active-baseline-rubric';
import { type EssayRubricDefinition } from '@sentinel/shared';

export const updateBaselineEssayRubricRoute = createRoute({
    method: 'put',
    path: '/essay-rubric',
    tags: ['Access Control / Essay Rubric'],
    summary: 'Update the active baseline essay rubric',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: updateBaselineEssayRubricSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Active baseline essay rubric updated successfully',
            content: {
                'application/json': {
                    schema: updateBaselineEssayRubricSchema.response,
                },
            },
        },
    },
});

export const updateBaselineEssayRubricRouteHandler: AppRouteHandler<
    typeof updateBaselineEssayRubricRoute
> = async (c) => {
    assertSupportAccess(c);

    const { criteria } = c.req.valid('json');
    const dbClient = c.get('dbClient');
    const user = c.get('user');

    const previousBaseline = await findActiveBaselineRubric(dbClient);

    const definition: EssayRubricDefinition = { criteria };

    const newVersion = await RubricService.createEssayRubricVersion(
        dbClient,
        'BASELINE',
        null,
        definition,
        user.id,
    );

    // Emit audit log
    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'essay_rubric.baseline_updated',
        resourceType: 'system',
        resourceId: 'system',
        activeInstitutionId: undefined,
        details: {
            previousRubricVersionId: previousBaseline?.rubric_version_id || null,
            newRubricVersionId: newVersion.rubric_version_id,
            versionNumber: newVersion.version_number,
        },
    });

    return c.json(
        {
            message: 'Active baseline essay rubric updated successfully',
            data: {
                rubricVersionId: newVersion.rubric_version_id,
                versionNumber: newVersion.version_number,
                scope: newVersion.scope,
                definition: newVersion.definition as unknown as EssayRubricDefinition,
            },
        },
        200,
    );
};
