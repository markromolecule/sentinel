import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { createDirectConversationSchema } from '../messages.dto';
import { MessagesService } from '../messages.service';
import { requireActivePermission } from '../../../../lib/permissions';
import { respondWithRouteError } from '../../../../lib/route-error-response';

export const createDirectConversationRoute = createRoute({
    method: 'post',
    path: '/conversations/direct',
    tags: ['Messages'],
    summary: 'Create or locate direct conversation',
    description: 'Establishes a 1:1 chat between the authenticated user and another user.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: createDirectConversationSchema.body,
                },
            },
        },
    },
    responses: {
        201: {
            content: {
                'application/json': {
                    schema: createDirectConversationSchema.response,
                },
            },
            description: 'Conversation created or located successfully',
        },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not Found' },
        500: { description: 'Internal Server Error' },
    },
});

export const createDirectConversationRouteHandler: AppRouteHandler<
    typeof createDirectConversationRoute
> = async (c) => {
    try {
        requireActivePermission(
            c,
            'messages:create',
            'Forbidden. You do not have permission to create conversations.',
        );

        const user = c.get('user');
        const { recipientId } = c.req.valid('json');

        const conversation = await MessagesService.createDirectConversation(c.get('dbClient'), {
            userId: user.id,
            recipientId,
        });

        return c.json(
            {
                success: true,
                message: 'Conversation established successfully',
                data: conversation,
            },
            201,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Create direct conversation error:');
    }
};
