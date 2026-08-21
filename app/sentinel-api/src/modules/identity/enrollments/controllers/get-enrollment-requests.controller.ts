import { createRoute, z } from '@hono/zod-openapi';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { getEnrollmentRequestsSchema } from '../enrollments.dto';
import { EnrollmentService } from '../enrollments.service';
import {
    buildRequesterAcademicScope,
    resolveAcademicQueryScope,
} from '../../../_shared/academic-scope';

export const getEnrollmentRequestsRoute = createRoute({
    method: 'get',
    path: '/requests',
    tags: ['Subjects', 'Admin'],
    summary: 'Get all pending enrollment requests',
    description:
        'Fetches instructor offered-subject enrollment requests. Restricted to admin, superadmin, or the requesting instructor.',
    request: {
        query: getEnrollmentRequestsSchema.query,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: getEnrollmentRequestsSchema.response,
                },
            },
            description: 'Requests fetched successfully',
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const getEnrollmentRequestsRouteHandler: AppRouteHandler<
    typeof getEnrollmentRequestsRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'subject_requests:view',
            'Forbidden. Missing subject_requests:view permission.',
        );
        const supabaseUser = c.get('supabaseUser') as any;
        const role = supabaseUser?.user_metadata?.role;
        const user = c.get('user');
        const userId = user?.id;

        const {
            status,
            search,
            institutionId: requestedInstitutionId,
            page,
            pageSize,
            limit,
        } = c.req.valid('query');

        // If instructor, only show their own requests
        const targetUserId = role === 'instructor' ? userId : undefined;
        const scope = buildRequesterAcademicScope({
            requesterRole: role,
            requesterInstitutionId: c.get('institutionId'),
            requesterDepartmentId: user?.user_profiles?.department_id ?? null,
            requesterCourseId: user?.user_profiles?.course_id ?? null,
        });
        const queryScope = resolveAcademicQueryScope(scope, {
            requestedInstitutionId,
        });

        const data = await EnrollmentService.getEnrollmentRequests(c.get('dbClient'), {
            status,
            search,
            userId: targetUserId,
            institutionId: queryScope.institutionId,
            departmentId: role === 'instructor' ? undefined : queryScope.departmentId,
            courseId: role === 'instructor' ? undefined : queryScope.courseId,
            page,
            pageSize: limit ?? pageSize,
        });
        const responseData = Array.isArray(data) ? data : data.items;

        return c.json(
            Array.isArray(data)
                ? {
                      message: 'Enrollment requests fetched successfully',
                      data: responseData,
                  }
                : {
                      message: 'Enrollment requests fetched successfully',
                      data: responseData,
                      pagination: data.pagination,
                  },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Get enrollment requests error:');
    }
};
