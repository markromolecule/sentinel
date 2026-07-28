import { OpenAPIHono } from '@hono/zod-openapi';
import { type HonoEnv } from '../../types/hono';
import telemetryIngestionRoutes from './ingestion/ingestion.routes';
import telemetrySettingsRoutes from './settings/settings.routes';
import telemetryStorageRoutes from './storage/storage.routes';
import telemetryEvidenceRoutes from './evidence/evidence.routes';
import {
    telemetryHealthRoute,
    telemetryHealthRouteHandler,
} from './telemetry-monitoring.controller';

import { authMiddleware } from '../../middleware/auth';
import { HTTPException } from 'hono/http-exception';

const telemetryRoutes = new OpenAPIHono<HonoEnv>();

telemetryRoutes.use('/health', authMiddleware);
telemetryRoutes.use('/health', async (c, next) => {
    const role = c.get('role');
    if (role !== 'support' && role !== 'admin' && role !== 'superadmin') {
        throw new HTTPException(403, {
            message: 'Forbidden: Telemetry health is restricted to operational/support roles.',
        });
    }
    await next();
});

telemetryRoutes.openapi(telemetryHealthRoute, telemetryHealthRouteHandler);
telemetryRoutes.route('/', telemetryIngestionRoutes);
telemetryRoutes.route('/', telemetrySettingsRoutes);
telemetryRoutes.route('/', telemetryStorageRoutes);
telemetryRoutes.route('/', telemetryEvidenceRoutes);

export default telemetryRoutes;
