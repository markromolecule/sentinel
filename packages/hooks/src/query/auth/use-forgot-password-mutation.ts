import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '../../auth-provider';

export interface ForgotPasswordArgs {
    email: string;
    redirectTo?: string;
}

export function useForgotPasswordMutation(
    args: UseMutationOptions<{ data: {} | null; error: any }, Error, ForgotPasswordArgs> = {},
) {
    const { supabase } = useAuth();

    return useMutation({
        ...args,
        mutationFn: async ({ email, redirectTo }) => {
            if (!supabase) throw new Error('Supabase client not initialized');
            const response = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });
            if (response.error) throw response.error;
            return response;
        },
    });
}
