'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './auth-provider';

type UseNotificationRealtimeArgs = {
    queryKey: readonly unknown[];
    enabled?: boolean;
};

function buildChannelName(userId: string, queryKey: readonly unknown[]) {
    return `notifications:${userId}:${queryKey.join(':')}`;
}

export function useNotificationRealtime(args: UseNotificationRealtimeArgs) {
    const { queryKey, enabled = true } = args;
    const queryClient = useQueryClient();
    const { supabase, user } = useAuth();
    const queryKeyRef = useRef(queryKey);

    useEffect(() => {
        queryKeyRef.current = queryKey;
    }, [queryKey]);

    useEffect(() => {
        if (!enabled || !supabase || !user?.id) {
            return;
        }

        if (!supabase.channel || !supabase.removeChannel) {
            return;
        }

        const channelName = buildChannelName(user.id, queryKey);
        const channel: RealtimeChannel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_user_id=eq.${user.id}`,
                },
                () => {
                    void queryClient.invalidateQueries({
                        queryKey: [...queryKeyRef.current],
                    });
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled, queryClient, queryKey, supabase, user?.id]);
}
