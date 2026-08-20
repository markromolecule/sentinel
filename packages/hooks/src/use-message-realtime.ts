'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './auth-provider';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';
import { applyMessageRealtimePayload } from './query/messages/message-cache';

type UseMessageRealtimeArgs = {
    conversationId?: string;
    enabled?: boolean;
    invalidateList?: boolean;
};

/**
 * Reusable React hook for subscribing to Supabase Realtime updates for the messages module.
 * Automatically invalidates relevant React Query caches when messages or participant states change.
 *
 * @param args Hook configuration arguments.
 */
export function useMessageRealtime(args: UseMessageRealtimeArgs = {}) {
    const { conversationId, enabled = true, invalidateList = true } = args;
    const queryClient = useQueryClient();
    const { supabase, user } = useAuth();

    useEffect(() => {
        if (!enabled || !supabase || !user?.id) {
            return;
        }

        if (!supabase.channel || !supabase.removeChannel) {
            return;
        }

        // Setup unique channel names to avoid collisions
        const channelName = conversationId
            ? `messages:${conversationId}:${user.id}`
            : `messages:all:${user.id}`;

        let channel: RealtimeChannel;

        if (conversationId) {
            channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${conversationId}`,
                    },
                    (payload) => {
                        applyMessageRealtimePayload({
                            queryClient,
                            payload,
                            currentUserId: user.id,
                            conversationId,
                            invalidateList,
                        });
                    },
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'conversation_participants',
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => {
                        if (invalidateList) {
                            void queryClient.invalidateQueries({
                                queryKey: MESSAGES_QUERY_KEYS.conversations(),
                            });
                        }
                    },
                )
                .subscribe();
        } else {
            channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'messages',
                    },
                    (payload) => {
                        applyMessageRealtimePayload({
                            queryClient,
                            payload,
                            currentUserId: user.id,
                            invalidateList,
                        });
                    },
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'conversation_participants',
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => {
                        if (invalidateList) {
                            void queryClient.invalidateQueries({
                                queryKey: MESSAGES_QUERY_KEYS.conversations(),
                            });
                        }
                    },
                )
                .subscribe();
        }

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, enabled, invalidateList, queryClient, supabase, user?.id]);
}
