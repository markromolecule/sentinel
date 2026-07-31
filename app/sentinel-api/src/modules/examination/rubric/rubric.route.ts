import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from '../../../middleware/auth';
import { type HonoEnv } from '../../../types/hono';
import {
    getEffectiveEssayRubricRoute,
    getEffectiveEssayRubricRouteHandler,
} from './controllers/get-effective-essay-rubric.controller';
import {
    updateExamEssayRubricRoute,
    updateExamEssayRubricRouteHandler,
} from './controllers/update-exam-essay-rubric.controller';
import {
    resetExamEssayRubricRoute,
    resetExamEssayRubricRouteHandler,
} from './controllers/reset-exam-essay-rubric.controller';

const rubricRoutes = new OpenAPIHono<HonoEnv>();

rubricRoutes.use('*', authMiddleware);

rubricRoutes
    .openapi(getEffectiveEssayRubricRoute, getEffectiveEssayRubricRouteHandler)
    .openapi(updateExamEssayRubricRoute, updateExamEssayRubricRouteHandler)
    .openapi(resetExamEssayRubricRoute, resetExamEssayRubricRouteHandler);

export default rubricRoutes;
