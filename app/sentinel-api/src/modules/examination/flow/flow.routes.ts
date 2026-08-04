import { OpenAPIHono } from '@hono/zod-openapi';
import { type HonoEnv } from '../../../types/hono';

import {
    completeSessionRoute,
    completeSessionRouteHandler,
} from './controllers/complete-session.controller';
import {
    prepareSessionRoute,
    prepareSessionRouteHandler,
} from './controllers/prepare-session.controller';
import {
    getSessionStatusRoute,
    getSessionStatusRouteHandler,
} from './controllers/get-session-status.controller';
import {
    startSessionRoute,
    startSessionRouteHandler,
} from './controllers/start-session.controller';
import { syncSessionRoute, syncSessionRouteHandler } from './controllers/sync-session.controller';
import { authMiddleware } from '../../../middleware/auth';
import studentLiveInspectionRoutes from '../live-inspection/live-inspection.routes';

const flowRoutes = new OpenAPIHono<HonoEnv>();

flowRoutes.use('*', authMiddleware);

flowRoutes
    .openapi(startSessionRoute, startSessionRouteHandler)
    .openapi(getSessionStatusRoute, getSessionStatusRouteHandler)
    .openapi(prepareSessionRoute, prepareSessionRouteHandler)
    .openapi(syncSessionRoute, syncSessionRouteHandler)
    .openapi(completeSessionRoute, completeSessionRouteHandler);

flowRoutes.route('/', studentLiveInspectionRoutes);

export default flowRoutes;
