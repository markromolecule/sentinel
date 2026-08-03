import { createRoute } from '@hono/zod-openapi';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { createSubjectClassificationSchema } from '../subject-classification.dto';
import { SubjectClassificationService } from '../subject-classification.service';
import {
    assertSubjectCatalogWriteAccess,
    buildRequesterAcademicScope,
} from '../../../_shared/academic-scope';
import { extractErrorCode } from '../helper/error-utils';
import { toSubjectClassificationResponse } from '../helper/response-utils';

export const createSubjectClassificationRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Subject Classification'],
    summary: 'Create subject classification',
    description: 'Creates a new subject classification group.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: createSubjectClassificationSchema.body,
                },
            },
        },
    },
    responses: {
        201: {
            content: {
                'application/json': {
                    schema: createSubjectClassificationSchema.response,
                },
            },
            description: 'Subject classification created successfully',
        },
        400: { description: 'Bad Request' },
        409: { description: 'Conflict' },
        500: { description: 'Internal Server Error' },
    },
});

export const createSubjectClassificationRouteHandler: AppRouteHandler<
    typeof createSubjectClassificationRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'subjects:create',
            'Forbidden. Missing subjects:create permission.',
        );
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

        const classification = await SubjectClassificationService.createSubjectClassification(
            c.get('dbClient'),
            {
                name: body.name,
                type: body.type,
                description: body.description,
                subject_ids: body.subject_ids,
                department_id: body.department_id,
                course_ids: body.course_ids,
                year_levels: body.year_levels,
                created_by: user.id,
                institution_id: targetInstitutionId ?? null,
            },
        );

        return c.json(
            {
                message: 'Subject classification created successfully',
                data: toSubjectClassificationResponse(classification),
            },
            201,
        );
    } catch (error: any) {
        const code = extractErrorCode(error);

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

        return respondWithRouteError(c, error, 'Create subject classification error:');
    }
};
