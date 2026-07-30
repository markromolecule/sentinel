import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { getMessageRecipientsSchema } from '../messages.dto';
import { MessagesService } from '../messages.service';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';

export const getMessageRecipientsRoute = createRoute({
    method: 'get',
    path: '/recipients',
    tags: ['Messages'],
    summary: 'List message recipients',
    description: 'Retrieves eligible message recipients for direct conversation selection.',
    request: {
        query: getMessageRecipientsSchema.query,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: getMessageRecipientsSchema.response,
                },
            },
            description: 'Eligible recipients fetched successfully',
        },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const getMessageRecipientsRouteHandler: AppRouteHandler<
    typeof getMessageRecipientsRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'messages:create',
            'Forbidden. You do not have permission to start conversations.',
        );

        const user = c.get('user');
        const queryParams = c.req.valid('query');

        const institutionId = user.user_profiles?.institution_id;
        if (!institutionId) {
            return c.json(
                {
                    success: false,
                    message: 'User does not belong to an institution.',
                    data: [],
                },
                400,
            );
        }

        const recipients = await MessagesService.listMessageRecipients(c.get('dbClient'), {
            requesterUserId: user.id,
            institutionId,
            search: queryParams.search,
            limit: queryParams.limit,
        });

        return c.json(
            {
                success: true,
                message: 'Eligible recipients fetched successfully',
                data: recipients,
            },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Get message recipients error:');
    }
};
export type GetMessageRecipientsRoute = typeof getMessageRecipientsRoute;
export type GetMessageRecipientsRouteHandler = typeof getMessageRecipientsRouteHandler;
