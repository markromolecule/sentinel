import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from '../../../middleware/auth';
import { type HonoEnv } from '../../../types/hono';
import {
    getGradingExamsRoute,
    getGradingExamsRouteHandler,
} from './controllers/get-grading-exams.controller';
import {
    getGradingStudentsRoute,
    getGradingStudentsRouteHandler,
} from './controllers/get-grading-students.controller';
import {
    getGradingAttemptDetailRoute,
    getGradingAttemptDetailRouteHandler,
} from './controllers/get-grading-attempt-detail.controller';
import {
    updateGradingAttemptRoute,
    updateGradingAttemptRouteHandler,
} from './controllers/update-grading-attempt.controller';
import {
    bulkFinalizeAttemptsRoute,
    bulkFinalizeAttemptsRouteHandler,
} from './controllers/bulk-finalize-attempts.controller';

const gradingRoutes = new OpenAPIHono<HonoEnv>();

gradingRoutes.use('*', authMiddleware);

gradingRoutes
    .openapi(getGradingExamsRoute, getGradingExamsRouteHandler)
    .openapi(getGradingStudentsRoute, getGradingStudentsRouteHandler)
    .openapi(getGradingAttemptDetailRoute, getGradingAttemptDetailRouteHandler)
    .openapi(updateGradingAttemptRoute, updateGradingAttemptRouteHandler)
    .openapi(bulkFinalizeAttemptsRoute, bulkFinalizeAttemptsRouteHandler);

export default gradingRoutes;

