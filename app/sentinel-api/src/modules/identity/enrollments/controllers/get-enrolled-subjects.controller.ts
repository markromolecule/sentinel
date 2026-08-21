import { createRoute } from '@hono/zod-openapi';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { getEnrolledSubjectsSchema } from '../enrollments.dto';
import { EnrollmentService } from '../enrollments.service';

export const getEnrolledSubjectsRoute = createRoute({
    method: 'get',
    path: '/enrolled',
    tags: ['Subjects', 'Instructor'],
    summary: 'Get enrolled offered subjects for the instructor',
    description:
        'Retrieves all approved offered-subject enrollments for the instructor across class groups.',
    request: {
        query: getEnrolledSubjectsSchema.query,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: getEnrolledSubjectsSchema.response,
                },
            },
            description: 'Enrolled subjects retrieved successfully',
        },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const getEnrolledSubjectsRouteHandler: AppRouteHandler<
    typeof getEnrolledSubjectsRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'subject_requests:view',
            'Forbidden. Missing subject_requests:view permission.',
        );
        const supabaseUser = c.get('supabaseUser') as any;
        const role = supabaseUser?.user_metadata?.role;
        const userId = c.get('user')?.id;

        if (role !== 'instructor') {
            return c.json(
                { error: 'Forbidden. Only instructors can get their offered subjects.' },
                403 as any,
            );
        }

        const { search, page, pageSize, limit } = c.req.valid('query');

        const enrolledData = await EnrollmentService.getEnrolledSubjects(
            c.get('dbClient'),
            userId,
            search,
            page,
            limit ?? pageSize,
        );
        const data = Array.isArray(enrolledData) ? enrolledData : enrolledData.items;

        return c.json(
            Array.isArray(enrolledData)
                ? {
                      message: 'Enrolled subjects retrieved successfully',
                      data,
                  }
                : {
                      message: 'Enrolled subjects retrieved successfully',
                      data,
                      pagination: enrolledData.pagination,
                  },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Get enrolled subjects error:');
    }
};
