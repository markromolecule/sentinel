import { type MutationOptions, useMutation } from '@tanstack/react-query'
import { createSupabaseClient } from '@/data/supabase/client'
import type { SignInWithPasswordCredentials, AuthError, User, Session } from '@supabase/supabase-js'

export interface LoginResponse {
    user: User | null
    session: Session | null
}

export class LoginError extends Error {
    code: string

    constructor(message: string, code: string) {
        super(message)
        this.code = code
        this.name = 'LoginError'
    }
}

export type UseLoginMutationArgs = MutationOptions<
    LoginResponse,
    LoginError,
    SignInWithPasswordCredentials
>

export function useLoginMutation(args: UseLoginMutationArgs = {}) {
    const supabase = createSupabaseClient()

    return useMutation({
        ...args,
        mutationFn: async (credentials) => {
            const { data, error } = await supabase.auth.signInWithPassword(credentials)

            if (error) {
                // Handle specific Supabase auth errors
                if (error.message.includes('Invalid login credentials')) {
                    throw new LoginError('No account found with this email or incorrect password', 'invalid_credentials')
                }
                if (error.message.includes('Email not confirmed')) {
                    throw new LoginError('Please verify your email address before signing in', 'email_not_confirmed')
                }
                // Generic error
                throw new LoginError(error.message, error.name || 'unknown_error')
            }

            return data
        },
    })
}
