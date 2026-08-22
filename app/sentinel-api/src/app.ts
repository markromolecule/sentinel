import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { User as SupabaseUser } from '@supabase/supabase-js';

// BigInt Serialization Support
(BigInt.prototype as any).toJSON = function () {
    return Number(this);
};

// Database Imports
import { type DbClient, dbClient, Prisma } from '@sentinel/db';
import { getRedisClient, hasRedisConfigured } from './lib/redis/redis-client';

// Trigger Redis connection if configured
if (hasRedisConfigured()) {
    getRedisClient();
}

// Route & Middleware Imports
import { authMiddleware } from './middleware/auth';
import onboardingRouter from './modules/identity/onboarding/onboarding.routes';
import departmentsRouter from './modules/core/departments/departments.routes';
import coursesRouter from './modules/core/courses/courses.routes';
import sectionsRouter from './modules/core/sections/sections.routes';
import classroomRouter from './modules/core/classroom/classroom.routes';
import subjectsRouter from './modules/core/subjects/subject.routes';
import subjectClassificationRouter from './modules/core/subject-classification/subject-classification.routes';
import subjectOfferingsRouter from './modules/core/subject-offerings/subject-offerings.routes';
import usersRouter from './modules/identity/users/user.routes';
import institutionsRouter from './modules/core/institutions/institution.routes';
import enrollmentsRouter from './modules/identity/enrollments/enrollments.routes';
import examsRouter from './modules/examination/exams/exam.routes';
import rubricRouter from './modules/examination/rubric/rubric.route';
import configurationRouter from './modules/examination/configuration/configuration.route';
import examinationAccessRouter from './modules/examination/access/access.routes';
import historyRouter from './modules/examination/history/history.routes';
import gradingRouter from './modules/examination/grading/grading.routes';
import assignRouter from './modules/examination/assign/assign.routes';
import examinationFlowRouter from './modules/examination/flow/flow.routes';
import semestersRouter from './modules/core/semesters/semesters.routes';
import roomsRouter from './modules/core/rooms/room.routes';
import aiRouter from './modules/integrations/gemini/gemini.route';
import questionBankRouter from './modules/content/question-bank/question-bank.route';
import questionCollectionRouter from './modules/content/question-collection/question-collection.route';
import questionsRouter from './modules/content/question/question.route';
import questionTypeRouter from './modules/content/question-type/question-type.route';
import builderRouter from './modules/examination/builder/builder.route';
import studentWhitelistRouter from './modules/identity/student-whitelist/student-whitelist.routes';
import accessControlRouter from './modules/security/access-control/access-control.route';
import telemetryRouter from './modules/telemetry/telemetry.routes';
import authRouter from './modules/identity/auth/auth.routes';
import notificationRouter from './modules/general/notification/notification.routes';
import audioRouter from './modules/infrastructure/audio/audio.routes';
import liveKitRouter from './modules/infrastructure/livekit/livekit.routes';
import calendarRouter from './modules/general/calendar/calendar.routes';
import announcementsRouter from './modules/general/announcements/announcement.routes';
import analyticsRouter from './modules/general/analytics/analytics.routes';
import messagesRouter from './modules/general/messages/messages.routes';
import logsRouter from './modules/general/logs/logs.routes';
import feedbackRouter from './modules/general/feedbacks/feedback.routes';
import instructorSubjectRequestsRouter from './modules/core/instructor-subject-requests/instructor-subject-requests.routes';
import passageImagesRouter from './modules/infrastructure/passage-images/passage-images.routes';
import pdfDocumentsRouter from './modules/general/pdf-documents/pdf-documents.routes';

type Variables = {
    user: Prisma.usersGetPayload<{ include: { user_profiles: true } }>;
    supabaseUser: SupabaseUser;
    dbClient: DbClient;
    activePermissionKeys: string[];
};

const app = new OpenAPIHono<{ Variables: Variables }>({ strict: false });

export const DEFAULT_CORS_ORIGIN = 'https://sentinelph.tech';
export const ALLOWED_CORS_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://sentinel-coral.vercel.app',
    'https://app.sentinelph.tech',
    'https://sentinelph.tech',
    'https://www.sentinelph.tech',
    'https://core.sentinelph.tech',
];

const PRIVATE_NETWORK_ORIGIN_REGEX =
    /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function resolveCorsOrigin(origin?: string | null, nodeEnv = process.env.NODE_ENV): string | null {
    if (!origin) return DEFAULT_CORS_ORIGIN;
    if (ALLOWED_CORS_ORIGINS.includes(origin)) return origin;

    if (origin.endsWith('.sentinelph.tech') || origin.endsWith('.vercel.app')) {
        return origin;
    }

    if (nodeEnv !== 'production') {
        if (PRIVATE_NETWORK_ORIGIN_REGEX.test(origin)) {
            return origin;
        }
        if (/^exp:\/\//.test(origin)) {
            return origin;
        }
    }

    return null;
}

function applyCorsHeaders(c: Context) {
    const allowedOrigin = resolveCorsOrigin(c.req.header('Origin'));

    if (!allowedOrigin) return;

    c.header('Access-Control-Allow-Origin', allowedOrigin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Vary', 'Origin');
}

// 1. CORS Configuration
app.use(
    '*',
    cors({
        origin: (origin) => resolveCorsOrigin(origin),
        allowHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'apikey',
            'x-client-info',
        ],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        exposeHeaders: ['Content-Length', 'X-Kysely-Query'],
        maxAge: 600,
        credentials: true,
    }),
);

// 2. Database Client Injection
app.use('*', async (c, next) => {
    c.set('dbClient', dbClient);
    await next();
});

// 4. Base Routes
app.get('/', (c) => c.text('Sentinel API'));

app.get('/me', authMiddleware, (c) => {
    return c.json({
        message: 'You are authenticated',
        user: c.get('user'),
    });
});

app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

app.get('/heartbeat', authMiddleware, (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// 5. Feature Modules
app.route('/onboarding', onboardingRouter);
app.route('/departments', departmentsRouter);
app.route('/courses', coursesRouter);
app.route('/sections', sectionsRouter);
app.route('/classrooms', classroomRouter);
app.route('/subjects/classifications', subjectClassificationRouter);
app.route('/subjects', subjectsRouter);
app.route('/subject-offerings', subjectOfferingsRouter);
app.route('/enrollments', enrollmentsRouter);
app.route('/exams', examsRouter);
app.route('/rubrics', rubricRouter);
app.route('/history', historyRouter);
app.route('/grading', gradingRouter);
app.route('/examination/assign', assignRouter);
app.route('/configuration', configurationRouter);
app.route('/examination/access', examinationAccessRouter);
app.route('/examination/flow', examinationFlowRouter);
app.route('/users', usersRouter);
app.route('/institutions', institutionsRouter);
app.route('/questions', questionsRouter);
app.route('/question-types', questionTypeRouter);
app.route('/question-bank', questionBankRouter);
app.route('/question-collection', questionCollectionRouter);
app.use(
    '/ai/*',
    bodyLimit({
        maxSize: 50 * 1024 * 1024,
        onError: (c) => {
            applyCorsHeaders(c);
            return c.json({ success: false, error: 'Payload too large.' }, 413);
        },
    }),
);
app.route('/ai', aiRouter);
app.route('/builder', builderRouter);
app.route('/semesters', semestersRouter);
app.route('/rooms', roomsRouter);
app.route('/student-whitelist', studentWhitelistRouter);
app.route('/access-control', accessControlRouter);
app.route('/telemetry', telemetryRouter);
app.route('/settings/audio', audioRouter);
app.route('/infrastructure/livekit', liveKitRouter);
app.route('/media/passage-images', passageImagesRouter);
app.route('/auth', authRouter);
app.route('/notifications', notificationRouter);
app.route('/announcements', announcementsRouter);
app.route('/calendar', calendarRouter);
app.route('/analytics', analyticsRouter);
app.route('/messages', messagesRouter);
app.route('/logs', logsRouter);
app.route('/feedbacks', feedbackRouter);
app.route('/instructor-subject-requests', instructorSubjectRequestsRouter);
app.route('/pdf-documents', pdfDocumentsRouter);

// 6. OpenAPI Specs & Documentation
app.doc('/doc', {
    openapi: '3.0.0',
    info: {
        version: '1.0.0',
        title: 'Sentinel API Documentation',
    },
});

// Scalar API Reference UI
app.get('/reference', async (c, next) => {
    // Dynamic import
    const scalar = await Function(`return import('@scalar/hono-api-reference')`)();

    return scalar.apiReference({
        spec: { url: '/doc' },
    } as any)(c, next);
});

// 6. Global Error Handling
app.onError((err, c) => {
    applyCorsHeaders(c);

    if (err instanceof HTTPException) {
        return c.json(
            {
                success: false,
                error: err.name,
                message: err.message,
            },
            err.status,
        );
    }

    // Handle Zod Validation Errors
    if (err.name === 'ZodError' || (err as any).format) {
        return c.json(
            {
                success: false,
                error: 'Validation Error',
                message: err.message,
                issues: (err as any).issues,
            },
            400,
        );
    }

    console.error('API Error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        path: c.req.path,
        method: c.req.method,
    });

    const status = 'status' in err ? (err as any).status : 500;

    return c.json(
        {
            success: false,
            error: err.name || 'Internal Server Error',
            message:
                process.env.NODE_ENV === 'production'
                    ? 'An unexpected error occurred. Please contact support.'
                    : err.message,
        },
        status,
    );
});

// 7. 404 Handler
app.notFound((c) => {
    applyCorsHeaders(c);

    return c.json({ error: 'Not Found', message: `Route ${c.req.path} not found` }, 404);
});

export default app;
