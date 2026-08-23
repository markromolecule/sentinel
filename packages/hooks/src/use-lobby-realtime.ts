'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useAuth } from './auth-provider';

export type UseLobbyRealtimeArgs = {
    examId: string;
    onAdmissionChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
    enabled?: boolean;
};

export function useLobbyRealtime(args: UseLobbyRealtimeArgs) {
    const { examId, onAdmissionChange, enabled = true } = args;
    const queryClient = useQueryClient();
    const { supabase, session } = useAuth();
    const callbackRef = useRef(onAdmissionChange);

    useEffect(() => {
        callbackRef.current = onAdmissionChange;
    }, [onAdmissionChange]);

    useEffect(() => {
        if (!enabled || !supabase || !session?.user || !examId || !supabase.channel || !supabase.removeChannel) {
            return () => {};
        }

        const channelName = `lobby:admissions:${examId}`;
        const channel: RealtimeChannel = supabase.channel(channelName);

        channel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'exam_lobby_admissions',
                    filter: `exam_id=eq.${examId}`,
                },
                (payload) => {
                    if (payload.new && typeof payload.new === 'object' && 'status' in payload.new) {
                        const newRow = payload.new as Record<string, any>;
                        if (newRow.status) {
                            queryClient.setQueryData(
                                EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId),
                                {
                                    status: newRow.status,
                                    checkedInAt: newRow.checked_in_at ? String(newRow.checked_in_at) : null,
                                    decidedAt: newRow.decided_at ? String(newRow.decided_at) : null,
                                },
                            );
                        }
                    }

                    void queryClient.invalidateQueries({
                        queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
                    });
                    void queryClient.invalidateQueries({
                        queryKey: EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId),
                    });
                    void queryClient.invalidateQueries({
                        queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
                    });
                    void queryClient.invalidateQueries({
                        queryKey: EXAM_QUERY_KEYS.details(examId),
                    });

                    callbackRef.current?.(payload);
                },
            )
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn(`[useLobbyRealtime] Channel ${channelName} subscription issue: ${status}`, err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled, examId, queryClient, session?.user, supabase]);
}
