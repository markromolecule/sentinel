import { createRoute, z } from '@hono/zod-openapi';
import type { AppRouteHandler } from '../../../../types/hono';
import { LiveKitManagedService } from '../services/livekit-managed.service';
import { processLiveKitWebhook } from '../../../examination/live-inspection/services/live-inspection-webhook.service';

export const liveKitWebhookRoute = createRoute({
    method: 'post',
    path: '/webhooks',
    tags: ['Infrastructure'],
    summary: 'Receive verified LiveKit webhooks',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: z.record(z.string(), z.unknown()),
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Webhook accepted',
            content: {
                'application/json': {
                    schema: z.object({
                        message: z.string(),
                        data: z.object({
                            processed: z.boolean(),
                            result: z.string(),
                        }),
                    }),
                },
            },
        },
    },
});

export const liveKitWebhookRouteHandler: AppRouteHandler<typeof liveKitWebhookRoute> = async (
    c,
) => {
    const rawBody = await c.req.text();
    const authorizationHeader = c.req.header('Authorization') ?? c.req.header('Authorize');
    const liveKit = new LiveKitManagedService();
    const event = await liveKit.receiveWebhook(rawBody, authorizationHeader);
    const result = await processLiveKitWebhook({
        dbClient: c.get('dbClient'),
        event,
        liveKit,
    });

    return c.json({ message: 'LiveKit webhook accepted.', data: result });
};
