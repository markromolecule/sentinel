import { OpenAPIHono } from '@hono/zod-openapi';
import { type HonoEnv } from '../../../types/hono';
import { authMiddleware } from '../../../middleware/auth';
import {
    createSubjectOfferingRoute,
    createSubjectOfferingRouteHandler,
} from './controllers/create-subject-offering.controller';
import {
    createSubjectOfferingsFromClassificationRoute,
    createSubjectOfferingsFromClassificationRouteHandler,
} from './controllers/create-subject-offerings-from-classification.controller';
import {
    getSubjectOfferingsRoute,
    getSubjectOfferingsRouteHandler,
} from './controllers/get-subject-offerings.controller';
import {
    getSubjectOfferingRoute,
    getSubjectOfferingRouteHandler,
} from './controllers/get-subject-offering.controller';
import {
    updateSubjectOfferingRoute,
    updateSubjectOfferingRouteHandler,
} from './controllers/update-subject-offering.controller';
import {
    deleteSubjectOfferingRoute,
    deleteSubjectOfferingRouteHandler,
} from './controllers/delete-subject-offering.controller';
import {
    deleteSubjectOfferingsRoute,
    deleteSubjectOfferingsRouteHandler,
} from './controllers/delete-subject-offerings.controller';

const subjectOfferingsRoutes = new OpenAPIHono<HonoEnv>();

subjectOfferingsRoutes.use('*', authMiddleware);

subjectOfferingsRoutes
    .openapi(
        createSubjectOfferingsFromClassificationRoute,
        createSubjectOfferingsFromClassificationRouteHandler,
    )
    .openapi(createSubjectOfferingRoute, createSubjectOfferingRouteHandler)
    .openapi(getSubjectOfferingsRoute, getSubjectOfferingsRouteHandler)
    .openapi(deleteSubjectOfferingsRoute, deleteSubjectOfferingsRouteHandler)
    .openapi(getSubjectOfferingRoute, getSubjectOfferingRouteHandler)
    .openapi(updateSubjectOfferingRoute, updateSubjectOfferingRouteHandler)
    .openapi(deleteSubjectOfferingRoute, deleteSubjectOfferingRouteHandler);

export default subjectOfferingsRoutes;
