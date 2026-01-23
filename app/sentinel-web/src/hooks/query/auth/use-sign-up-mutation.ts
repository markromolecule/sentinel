import { type MutationOptions, useMutation } from '@tanstack/react-query'
import { createSupabaseClient } from '@/data/supabase/client'
import type { SignUpWithPasswordCredentials, User, Session } from '@supabase/supabase-js'

export interface SignUpResponse {
    user: User | null
    session: Session | null
}

export class SignUpError extends Error {
    code: string

    constructor(message: string, code: string) {
        super(message)
        this.code = code
        this.name = 'SignUpError'
    }
}

export type UseSignUpMutationArgs = MutationOptions<
    SignUpResponse,
    SignUpError,
    SignUpWithPasswordCredentials
>

export function useSignUpMutation(args: UseSignUpMutationArgs = {}) {
    const supabase = createSupabaseClient()

    return useMutation({
        ...args,
        mutationFn: async (credentials) => {
            const { data, error } = await supabase.auth.signUp(credentials)

            if (error) {
                throw new SignUpError(error.message, error.name || 'unknown_error')
            }

            // Supabase returns a fake success if user already exists but is unconfirmed
            // Check if identities array is empty - this indicates the user already exists
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                throw new SignUpError('An account with this email already exists', 'user_already_exists')
            }

            return data
        },
    })
}
