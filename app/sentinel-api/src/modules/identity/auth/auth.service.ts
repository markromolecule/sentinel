import { supabaseAdmin } from '../../../lib/supabase-admin';
import { supabaseAnon } from '../../../lib/supabase-anon';
import { LoginSchemaType, ApiRegisterSchemaType } from '@sentinel/shared/schema';

export class AuthService {
    /**
     * Authenticate a user with email and password via Supabase.
     */
    static async login(credentials: LoginSchemaType) {
        const { data, error } = await supabaseAnon.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
        });

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Register a new user via Supabase.
     */
    static async register(body: ApiRegisterSchemaType) {
        // 1. Create the user using the admin client to auto-confirm the email
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: body.password,
            email_confirm: true,
            user_metadata: {
                first_name: body.firstName,
                last_name: body.lastName,
                role: 'student', // Default role for portal signups
            },
            app_metadata: {
                role: 'student',
            },
        });

        if (createError || !createData?.user) {
            throw createError || new Error('Failed to create user');
        }

        // 2. Sign in the user immediately to generate a session
        const { data: sessionData, error: loginError } = await supabaseAnon.auth.signInWithPassword(
            {
                email: body.email,
                password: body.password,
            },
        );

        if (loginError) {
            throw loginError;
        }

        return sessionData;
    }
}
