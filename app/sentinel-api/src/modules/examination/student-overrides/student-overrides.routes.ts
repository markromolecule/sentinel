import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from '../../../middleware/auth';
import { type HonoEnv } from '../../../types/hono';
import {
    createStudentExamAccessOverrideRoute,
    createStudentExamAccessOverrideRouteHandler,
} from './controllers/create-student-exam-access-override.controller';
import {
    batchCreateStudentExamAccessOverrideRoute,
    batchCreateStudentExamAccessOverrideRouteHandler,
} from './controllers/batch-create-overrides.controller';
import {
    overrideReconnectLimitRoute,
    overrideReconnectLimitRouteHandler,
} from './controllers/override-reconnect-limit.controller';

export function registerStudentOverridesRoutes(app: OpenAPIHono<HonoEnv>) {
    app.openapi(createStudentExamAccessOverrideRoute, createStudentExamAccessOverrideRouteHandler);
    app.openapi(
        batchCreateStudentExamAccessOverrideRoute,
        batchCreateStudentExamAccessOverrideRouteHandler,
    );
    app.openapi(overrideReconnectLimitRoute, overrideReconnectLimitRouteHandler);
}

