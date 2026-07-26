import { createRoute } from '@hono/zod-openapi';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { requireActivePermission } from '../../../../lib/permissions';
import {
    generateAnalyticsReportBodySchema,
    generateAnalyticsReportResponseSchema,
} from '../analytics.dto';
import { AnalyticsService } from '../analytics.service';

export const generateAnalyticsReportRoute = createRoute({
    method: 'post',
    path: '/reports',
    tags: ['Analytics'],
    summary: 'Generate an analytics report',
    description:
        'Triggers the generation of a new overall analytics report and returns the pending record.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: generateAnalyticsReportBodySchema,
                },
            },
        },
    },
    responses: {
        202: {
            content: {
                'application/json': {
                    schema: generateAnalyticsReportResponseSchema,
                },
            },
            description: 'Analytics report generation accepted and queued',
        },
        400: { description: 'Bad Request / Validation Error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Target institution not found' },
        500: { description: 'Internal Server Error' },
    },
});

export const generateAnalyticsReportRouteHandler: AppRouteHandler<
    typeof generateAnalyticsReportRoute
> = async (c) => {
    try {
        const user = c.get('user');

        requireActivePermission(
            c,
            ['reports:generate'],
            'Forbidden. You do not have permission to generate reports.',
        );

        const payload = c.req.valid('json');
        const role = c.get('role');
        const authedInstitutionId = c.get('institutionId');

        let targetInstitutionId = authedInstitutionId;
        if ((role === 'support' || role === 'superadmin') && payload.institutionId) {
            targetInstitutionId = payload.institutionId;
        }

        if (!targetInstitutionId && role !== 'support' && role !== 'superadmin') {
            return c.json(
                { success: false, error: 'Unauthorized. Institution ID not found.' },
                401 as any,
            );
        }

        // Validate target institution scope consistently
        if (targetInstitutionId) {
            const instExists = await c
                .get('dbClient')
                .selectFrom('institutions')
                .select('id')
                .where('id', '=', targetInstitutionId)
                .executeTakeFirst();
            if (!instExists) {
                return c.json(
                    { success: false, error: 'Target institution not found.' },
                    404 as any,
                );
            }
        }

        const data = await AnalyticsService.generateReport({
            dbClient: c.get('dbClient'),
            userId: user.id,
            title: payload.title,
            institutionId: targetInstitutionId,
            period: payload.period,
            startDate: payload.startDate,
            endDate: payload.endDate,
            timezone: payload.timezone,
        });

        return c.json(
            {
                success: true,
                message: 'Analytics report generation accepted and queued',
                data,
            },
            202 as any,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Generate analytics report error:');
    }
};
