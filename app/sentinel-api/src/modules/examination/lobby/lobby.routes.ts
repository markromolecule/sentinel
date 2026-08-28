import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from '../../../middleware/auth';
import { type HonoEnv } from '../../../types/hono';
import {
    bootstrapLobbyRoute,
    bootstrapLobbyRouteHandler,
} from './controllers/bootstrap-lobby.controller';
import {
    checkInLobbyRoute,
    checkInLobbyRouteHandler,
} from './controllers/check-in-lobby.controller';
import {
    getAdmissionStatusRoute,
    getAdmissionStatusRouteHandler,
} from './controllers/get-admission-status.controller';
import {
    getLobbyCountRoute,
    getLobbyCountRouteHandler,
} from './controllers/get-lobby-count.controller';
import {
    getWaitingListRoute,
    getWaitingListRouteHandler,
} from './controllers/get-waiting-list.controller';
import {
    updateAdmissionsRoute,
    updateAdmissionsRouteHandler,
} from './controllers/update-admissions.controller';

export function registerLobbyRoutes(app: OpenAPIHono<HonoEnv>) {
    app.openapi(bootstrapLobbyRoute, bootstrapLobbyRouteHandler);
    app.openapi(checkInLobbyRoute, checkInLobbyRouteHandler);
    app.openapi(getAdmissionStatusRoute, getAdmissionStatusRouteHandler);
    app.openapi(getLobbyCountRoute, getLobbyCountRouteHandler);
    app.openapi(getWaitingListRoute, getWaitingListRouteHandler);
    app.openapi(updateAdmissionsRoute, updateAdmissionsRouteHandler);
}

