import { createRoute } from '@hono/zod-openapi';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { type AppRouteHandler } from '../../../../types/hono';
import { getCalendarEventsSchema } from '../calendar.dto';
import { CalendarService } from '../calendar.service';
import { requireActivePermission } from '../../../../lib/permissions';

export const getCalendarEventsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Calendar'],
    summary: 'List calendar events',
    description:
        'Retrieves calendar events visible to the institution, optionally filtered by month and year.',
    request: {
        query: getCalendarEventsSchema.request.query,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: getCalendarEventsSchema.response,
                },
            },
            description: 'Calendar events fetched successfully',
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const getCalendarEventsRouteHandler: AppRouteHandler<typeof getCalendarEventsRoute> = async (
    c,
) => {
    try {
        requireActivePermission(
            c,
            'calendar:view',
            'Forbidden. You do not have permission to view calendar events.',
        );

        const institutionId = c.get('institutionId');
        const role = c.get('role');

        if (!institutionId && role !== 'support' && role !== 'superadmin') {
            return c.json({ error: 'Unauthorized. Institution ID not found.' }, 401 as any);
        }

        const userId = c.get('user')?.id;

        if (!userId) {
            return c.json({ error: 'Unauthorized. User ID not found.' }, 401 as any);
        }

        const { month, year } = c.req.valid('query');

        const events = await CalendarService.getCalendarEvents(c.get('dbClient'), {
            institutionId,
            role,
            userId,
            month,
            year,
        });

        return c.json(
            {
                success: true,
                message: 'Calendar events fetched successfully',
                data: events as any[],
            },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Get calendar events error:');
    }
};
