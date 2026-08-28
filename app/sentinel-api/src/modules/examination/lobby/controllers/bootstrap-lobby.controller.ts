import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { type AppRouteHandler } from '../../../../types/hono';
import { bootstrapLobbySchema } from '../lobby.dto';
import { LobbyService } from '../lobby.service';

export const bootstrapLobbyRoute = createRoute({
    method: 'post',
    path: '/:id/lobby/bootstrap',
    tags: ['Lobby'],
    summary: 'Consolidated student lobby bootstrap (metadata, check-in, admission, count)',
    request: {
        params: bootstrapLobbySchema.params,
    },
    responses: {
        200: {
            description: 'Lobby bootstrapped successfully',
            content: {
                'application/json': {
                    schema: bootstrapLobbySchema.response,
                },
            },
        },
    },
});

export const bootstrapLobbyRouteHandler: AppRouteHandler<typeof bootstrapLobbyRoute> = async (c) => {
    const { id } = c.req.valid('param');
    const user = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not logged in' });
    }

    const institutionId = c.get('institutionId');
    const result = await LobbyService.bootstrap(c.get('dbClient'), id, user.id, institutionId);

    return c.json({
        message: 'Lobby bootstrapped successfully',
        data: result,
    });
};
