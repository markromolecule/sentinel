import '../global.css';
import { LogBox } from 'react-native';
import React, { useEffect, useState } from 'react';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, ApiProvider, type SentinelSupabaseClient } from '@sentinel/hooks';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { logApiConfiguration } from '@/lib/config/api-config';

export default function RootLayout() {
    useEffect(() => {
        logApiConfiguration();
    }, []);

    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                    },
                },
            }),
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider supabase={supabase as unknown as SentinelSupabaseClient}>
                        <ApiProvider apiClient={apiClient}>
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" />
                                <Stack.Screen name="auth/callback" />
                                <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
                                <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
                                <Stack.Screen
                                    name="exam/[id]"
                                    options={{
                                        animation: 'slide_from_right',
                                        gestureEnabled: false,
                                        fullScreenGestureEnabled: false,
                                    }}
                                />
                            </Stack>
                        </ApiProvider>
                    </AuthProvider>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
