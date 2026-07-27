import { OpenAPIHono } from '@hono/zod-openapi';
import { type HonoEnv } from '../../../types/hono';
import { authMiddleware } from '../../../middleware/auth';

import {
    initializeEvidenceUploadRoute,
    initializeEvidenceUploadRouteHandler,
} from './controllers/initialize-evidence-upload.controller';
import {
    completeEvidenceUploadRoute,
    completeEvidenceUploadRouteHandler,
} from './controllers/complete-evidence-upload.controller';
import {
    getIncidentEvidenceRoute,
    getIncidentEvidenceRouteHandler,
} from './controllers/get-incident-evidence.controller';
import {
    deleteEvidenceRoute,
    deleteEvidenceRouteHandler,
} from './controllers/delete-evidence.controller';
import {
    reconcileEvidenceRoute,
    reconcileEvidenceRouteHandler,
} from './controllers/reconcile-evidence.controller';

const telemetryEvidenceRoutes = new OpenAPIHono<HonoEnv>();

// Reconciliation route (cron bearer auth, no user session middleware)
telemetryEvidenceRoutes.openapi(reconcileEvidenceRoute, reconcileEvidenceRouteHandler);

// Authenticated student/instructor routes
const authenticatedRoutes = new OpenAPIHono<HonoEnv>();
authenticatedRoutes.use('*', authMiddleware);

authenticatedRoutes.openapi(initializeEvidenceUploadRoute, initializeEvidenceUploadRouteHandler);
authenticatedRoutes.openapi(completeEvidenceUploadRoute, completeEvidenceUploadRouteHandler);
authenticatedRoutes.openapi(getIncidentEvidenceRoute, getIncidentEvidenceRouteHandler);
authenticatedRoutes.openapi(deleteEvidenceRoute, deleteEvidenceRouteHandler);

telemetryEvidenceRoutes.route('/', authenticatedRoutes);

export default telemetryEvidenceRoutes;
