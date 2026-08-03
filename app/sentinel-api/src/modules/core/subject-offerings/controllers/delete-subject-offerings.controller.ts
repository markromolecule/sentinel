import { createRoute } from '@hono/zod-openapi';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { deleteSubjectOfferingsSchema } from '../subject-offerings.dto';
import { SubjectOfferingsService } from '../subject-offerings.service';
import {
    assertSubjectOfferingRecordInScope,
    assertSubjectOfferingMutationAccess,
    buildRequesterAcademicScope,
} from '../../../_shared/academic-scope';

function isNoResultError(error: unknown) {
    return (
        error instanceof Error &&
        (error.name === 'NoResultError' || error.message.toLowerCase().includes('no result'))
    );
}

export const deleteSubjectOfferingsRoute = createRoute({
    method: 'post',
    path: '/bulk-delete',
    tags: ['Subject Offerings'],
    summary: 'Bulk delete subject offerings',
    description: 'Deletes multiple subject offerings.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: deleteSubjectOfferingsSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: deleteSubjectOfferingsSchema.response,
                },
            },
            description: 'Subject offerings deleted successfully',
        },
        500: { description: 'Internal Server Error' },
    },
});

export const deleteSubjectOfferingsRouteHandler: AppRouteHandler<
    typeof deleteSubjectOfferingsRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'subject_offerings:delete',
            'Forbidden. Missing subject_offerings:delete permission.',
        );
        const { ids, institutionId: requestedInstitutionId } = c.req.valid('json');
        const user = c.get('user');
        const supabaseUser = c.get('supabaseUser') as any;
        const requesterRole = supabaseUser?.user_metadata?.role;
        const targetInstitutionId =
            requesterRole === 'support' || requesterRole === 'superadmin'
                ? (requestedInstitutionId ?? c.get('institutionId'))
                : c.get('institutionId');
        const scope = buildRequesterAcademicScope({
            requesterRole,
            requesterInstitutionId: targetInstitutionId,
            requesterDepartmentId: user.user_profiles?.department_id ?? null,
            requesterCourseId: user.user_profiles?.course_id ?? null,
        });

        assertSubjectOfferingMutationAccess(scope);

        const deleteTargets: Array<{ id: string; institutionId?: string | null }> = [];

        // Verify all exist and are in scope before deleting. Support/superadmin views may include
        // child-institution rows while the active filter is on the parent institution.
        for (const id of [...new Set(ids)]) {
            let existingOffering;

            try {
                existingOffering = await SubjectOfferingsService.getSubjectOfferingById(
                    c.get('dbClient'),
                    id,
                    targetInstitutionId,
                );
            } catch (error) {
                if (!isNoResultError(error)) {
                    throw error;
                }

                existingOffering = await SubjectOfferingsService.getSubjectOfferingById(
                    c.get('dbClient'),
                    id,
                );
            }

            assertSubjectOfferingRecordInScope(scope, {
                departmentIds: existingOffering.department_ids,
                courseIds: existingOffering.course_ids,
            });

            deleteTargets.push({
                id,
                institutionId:
                    existingOffering.effective_institution_id ??
                    existingOffering.origin_institution_id ??
                    targetInstitutionId,
            });
        }

        for (const target of deleteTargets) {
            await SubjectOfferingsService.deleteSubjectOffering(
                c.get('dbClient'),
                target.id,
                target.institutionId,
                user.id,
            );
        }

        return c.json(
            {
                message: 'Subject offerings deleted successfully',
                data: null,
            },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Bulk delete subject offerings error:');
    }
};
