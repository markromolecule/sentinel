import { createRoute } from '@hono/zod-openapi';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { deleteSubjectOfferingSchema } from '../subject-offerings.dto';
import { SubjectOfferingsService } from '../subject-offerings.service';
import { extractErrorCode } from '../../subjects/helper/error-utils';
import {
    assertSubjectOfferingRecordInScope,
    assertSubjectOfferingMutationAccess,
    buildRequesterAcademicScope,
} from '../../../_shared/academic-scope';

export const deleteSubjectOfferingRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Subject Offerings'],
    summary: 'Delete a subject offering',
    description: 'Deletes an existing subject offering.',
    request: {
        params: deleteSubjectOfferingSchema.params,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: deleteSubjectOfferingSchema.response,
                },
            },
            description: 'Subject offering deleted successfully',
        },
        404: { description: 'Subject offering not found' },
        500: { description: 'Internal Server Error' },
    },
});

export const deleteSubjectOfferingRouteHandler: AppRouteHandler<
    typeof deleteSubjectOfferingRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'subject_offerings:delete',
            'Forbidden. Missing subject_offerings:delete permission.',
        );
        const { id } = c.req.valid('param');
        const user = c.get('user');
        const supabaseUser = c.get('supabaseUser') as any;
        const scope = buildRequesterAcademicScope({
            requesterRole: supabaseUser?.user_metadata?.role,
            requesterInstitutionId: c.get('institutionId'),
            requesterDepartmentId: user.user_profiles?.department_id ?? null,
            requesterCourseId: user.user_profiles?.course_id ?? null,
        });

        assertSubjectOfferingMutationAccess(scope);
        const existingOffering = await SubjectOfferingsService.getSubjectOfferingById(
            c.get('dbClient'),
            id,
            c.get('institutionId'),
        );
        assertSubjectOfferingRecordInScope(scope, {
            departmentIds: existingOffering.department_ids,
            courseIds: existingOffering.course_ids,
        });

        await SubjectOfferingsService.deleteSubjectOffering(
            c.get('dbClient'),
            id,
            c.get('institutionId'),
            user.id,
        );

        return c.json(
            {
                message: 'Subject offering deleted successfully',
                data: null,
            },
            200,
        );
    } catch (error: any) {
        const code = extractErrorCode(error);

        if (
            code === 'P2025' ||
            error?.message === 'No result' ||
            error?.message === 'no result' ||
            error?.name === 'NoResultError'
        ) {
            return c.json({ error: 'Subject offering not found' }, 404);
        }

        return respondWithRouteError(c, error, 'Delete subject offering error:');
    }
};
