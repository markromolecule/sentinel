import { createApiClient } from '@sentinel/services';
import { supabase } from './supabase';
import { getApiBaseUrl } from './config/api-config';

let cachedToken: string | undefined = undefined;

export const apiClient = createApiClient({
    baseUrl: getApiBaseUrl(),
    getToken: async () => {
        if (cachedToken) return cachedToken;

        const {
            data: { session },
        } = await supabase.auth.getSession();
        return session?.access_token;
    },
});

// Update cache when auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
    cachedToken = session?.access_token;
});
