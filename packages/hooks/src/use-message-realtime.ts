'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './auth-provider';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';
import {
    applyMessageRealtimePayload,
} from './query/messages/message-cache';

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

        const channel: RealtimeChannel = supabase.channel(channelName);

        // 1. Subscribe to new/updated messages
        if (conversationId) {
            channel.on(
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
            );
        } else {
            // Listen to any message events to refresh the conversations preview list.
            // NOTE: We do NOT invalidate individual conversation messages here.
            // Invalidating message queries for arbitrary conversation IDs from Postgres payloads
            // would trigger unauthorized API requests (403) for rooms the user does not participate in.
            // Message-level query invalidation is handled in the conversation-specific channel subscription above.
            channel.on(
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
            );
        }

        // 2. Subscribe to participant updates for the current user (e.g. read status change)
        channel.on(
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
        );

        channel.subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [conversationId, enabled, invalidateList, queryClient, supabase, user?.id]);
}
