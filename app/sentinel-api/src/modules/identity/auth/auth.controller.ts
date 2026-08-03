import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../types/hono';
import { LoginSchema, ApiRegisterSchema } from '@sentinel/shared/schema';
import { AuthService } from './auth.service';
import { LogsService } from '../../general/logs/logs.service';

// ----------------------------------------------------------------------------
// Route Definitions
// ----------------------------------------------------------------------------

export const loginRoute = createRoute({
    method: 'post',
    path: '/login',
    tags: ['Auth'],
    summary: 'Login Proxy',
    description: 'Proxy login requests to Supabase with rate limiting.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: LoginSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Successful login' },
        400: { description: 'Invalid credentials or request' },
        429: { description: 'Too many login attempts' },
    },
});

export const registerRoute = createRoute({
    method: 'post',
    path: '/register',
    tags: ['Auth'],
    summary: 'Register Proxy',
    description: 'Proxy registration requests to Supabase with rate limiting.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ApiRegisterSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Successful registration' },
        400: { description: 'Invalid data' },
        429: { description: 'Too many registration attempts' },
    },
});

export const logOauthRoute = createRoute({
    method: 'post',
    path: '/log-oauth',
    tags: ['Auth'],
    summary: 'Log Successful OAuth Login',
    description: 'Logs a successful OAuth provider login event.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: z.object({
                        provider: z.string().default('google_oauth'),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: 'Successful logging' },
        401: { description: 'Unauthorized' },
    },
});

// ----------------------------------------------------------------------------
// Route Handlers
// ----------------------------------------------------------------------------

export const loginHandler: AppRouteHandler<typeof loginRoute> = async (c) => {
    const credentials = c.req.valid('json');
    const dbClient = c.get('dbClient');
    try {
        const data = await AuthService.login(credentials);

        // Log successful login
        if (data.user) {
            try {
                const profile = await dbClient
                    .selectFrom('user_profiles')
                    .select(['institution_id'])
                    .where('user_id', '=', data.user.id)
                    .executeTakeFirst();

                if (profile?.institution_id) {
                    await LogsService.createLog(dbClient, {
                        userId: data.user.id,
                        action: 'auth.login',
                        resourceType: 'auth',
                        resourceId: data.user.id,
                        activeInstitutionId: profile.institution_id,
                        details: { email: credentials.email, success: true, method: 'credentials' },
                        ipAddress:
                            c.req.header('x-forwarded-for') ||
                            c.req.header('cf-connecting-ip') ||
                            null,
                    });
                }
            } catch (logErr) {
                console.error('Failed to log auth.login success:', logErr);
            }
        }

        return c.json(data);
    } catch (error: any) {
        // Log failed login
        try {
            const profile = await dbClient
                .selectFrom('auth.users as u')
                .innerJoin('user_profiles as up', 'up.user_id', 'u.id')
                .select(['up.user_id', 'up.institution_id'])
                .where('u.email', '=', credentials.email)
                .executeTakeFirst();

            if (profile?.institution_id) {
                await LogsService.createLog(dbClient, {
                    userId: profile.user_id,
                    action: 'auth.failed_login',
                    resourceType: 'auth',
                    resourceId: profile.user_id,
                    activeInstitutionId: profile.institution_id,
                    details: {
                        email: credentials.email,
                        success: false,
                        reason: error.message || 'invalid_credentials',
                    },
                    ipAddress:
                        c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || null,
                });
            }
        } catch (logErr) {
            console.error('Failed to log auth.login failure:', logErr);
        }

        return c.json({ error: error.message }, (error.status as any) || 400);
    }
};

export const registerHandler: AppRouteHandler<typeof registerRoute> = async (c) => {
    const dbClient = c.get('dbClient');
    try {
        const body = c.req.valid('json');
        const data = await AuthService.register(body);

        // Log successful registration
        if (data.user) {
            try {
                await LogsService.createLog(dbClient, {
                    userId: data.user.id,
                    action: 'auth.register',
                    resourceType: 'auth',
                    resourceId: data.user.id,
                    activeInstitutionId: '00000000-0000-0000-0000-000000000000', // System default placeholder for new signups
                    details: {
                        email: body.email,
                        role: 'student',
                        firstName: body.firstName,
                        lastName: body.lastName,
                    },
                    ipAddress:
                        c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || null,
                });
            } catch (logErr) {
                console.error('Failed to log auth.register success:', logErr);
            }
        }

        return c.json(data);
    } catch (error: any) {
        return c.json({ error: error.message }, (error.status as any) || 400);
    }
};

export const logOauthHandler: AppRouteHandler<typeof logOauthRoute> = async (c) => {
    const { provider } = c.req.valid('json');
    const dbClient = c.get('dbClient');
    const user = c.get('user');
    const institutionId = c.get('institutionId');

    if (user && institutionId) {
        try {
            await LogsService.createLog(dbClient, {
                userId: user.id,
                action: 'auth.login',
                resourceType: 'auth',
                resourceId: user.id,
                activeInstitutionId: institutionId,
                details: { email: user.email, success: true, method: provider },
                ipAddress:
                    c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || null,
            });
        } catch (logErr) {
            console.error('Failed to log auth.login oauth success:', logErr);
        }
    }

    return c.json({ success: true });
};
