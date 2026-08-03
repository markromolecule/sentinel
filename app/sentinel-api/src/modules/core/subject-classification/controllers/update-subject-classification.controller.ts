import { createRoute } from '@hono/zod-openapi';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { updateSubjectClassificationSchema } from '../subject-classification.dto';
import { SubjectClassificationService } from '../subject-classification.service';
import {
    assertSubjectCatalogWriteAccess,
    buildRequesterAcademicScope,
} from '../../../_shared/academic-scope';
import { extractErrorCode } from '../helper/error-utils';
import { toSubjectClassificationResponse } from '../helper/response-utils';

export const updateSubjectClassificationRoute = createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Subject Classification'],
    summary: 'Update subject classification',
    description: 'Updates an existing subject classification group.',
    request: {
        params: updateSubjectClassificationSchema.params,
        body: {
            content: {
                'application/json': {
                    schema: updateSubjectClassificationSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: updateSubjectClassificationSchema.response,
                },
            },
            description: 'Subject classification updated successfully',
        },
        400: { description: 'Bad Request' },
        404: { description: 'Subject classification not found' },
        409: { description: 'Conflict' },
        500: { description: 'Internal Server Error' },
    },
});

export const updateSubjectClassificationRouteHandler: AppRouteHandler<
    typeof updateSubjectClassificationRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'subjects:update',
            'Forbidden. Missing subjects:update permission.',
        );
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const user = c.get('user');
        const supabaseUser = c.get('supabaseUser') as any;
        const role = supabaseUser?.user_metadata?.role;
        const targetInstitutionId =
            role === 'support'
                ? (body.institution_id ?? c.get('institutionId'))
                : c.get('institutionId');
        const scope = buildRequesterAcademicScope({
            requesterRole: role,
            requesterInstitutionId: targetInstitutionId,
            requesterDepartmentId: user.user_profiles?.department_id ?? null,
            requesterCourseId: user.user_profiles?.course_id ?? null,
        });

        assertSubjectCatalogWriteAccess(scope);

        const classification = await SubjectClassificationService.updateSubjectClassification(
            c.get('dbClient'),
            id,
            {
                name: body.name,
                type: body.type,
                description: body.description,
                subject_ids: body.subject_ids,
                department_id: body.department_id,
                course_ids: body.course_ids,
                year_levels: body.year_levels,
                updated_by: user.id,
            },
            scope.requesterInstitutionId ?? undefined,
        );

        return c.json(
            {
                message: 'Subject classification updated successfully',
                data: toSubjectClassificationResponse(classification),
            },
            200,
        );
    } catch (error: any) {
        const code = extractErrorCode(error);

        if (
            error?.code === 'P2025' ||
            error?.message === 'No result' ||
            error?.message === 'no result' ||
            error?.name === 'NoResultError'
        ) {
            return c.json({ error: 'Subject classification not found' }, 404);
        }

        if (
            code === SubjectClassificationService.duplicateCode ||
            error?.message?.includes('already exists')
        ) {
            return c.json({ error: 'Classification group already exists' }, 409);
        }

        if (code === SubjectClassificationService.invalidPayloadCode) {
            return c.json(
                { error: error?.message ?? 'Invalid subject classification payload' },
                400,
            );
        }

        return respondWithRouteError(c, error, 'Update subject classification error:');
    }
};
