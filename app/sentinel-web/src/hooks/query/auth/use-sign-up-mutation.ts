import { type MutationOptions, useMutation } from '@tanstack/react-query'
import { createSupabaseClient } from '@/data/supabase/client'
import type { SignUpWithPasswordCredentials } from '@supabase/supabase-js'

export type UseSignUpMutationArgs = MutationOptions<
    any,
    Error,
    SignUpWithPasswordCredentials
>

export function useSignUpMutation(args: UseSignUpMutationArgs = {}) {
    const supabase = createSupabaseClient()

    return useMutation({
        ...args,
        mutationFn: async (credentials) => {
            const { data, error } = await supabase.auth.signUp(credentials)
            if (error) throw error
            return data
        },
    })
}
