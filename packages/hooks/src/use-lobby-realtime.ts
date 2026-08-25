'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useAuth } from './auth-provider';

export type UseLobbyRealtimeArgs = {
    examId: string;
    studentId?: string;
    onAdmissionChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>> | Record<string, any>) => void;
    enabled?: boolean;
};

export function useLobbyRealtime(args: UseLobbyRealtimeArgs) {
    const { examId, studentId, onAdmissionChange, enabled = true } = args;
    const queryClient = useQueryClient();
    const { supabase, session } = useAuth();
    const callbackRef = useRef(onAdmissionChange);

    useEffect(() => {
        callbackRef.current = onAdmissionChange;
    }, [onAdmissionChange]);

    useEffect(() => {
        if (!enabled || !supabase || !session?.user || !examId || !supabase.channel || !supabase.removeChannel) {
            return () => { };
        }

        const channelName = `lobby:admissions:${examId}`;
        const channel: RealtimeChannel = supabase.channel(channelName);

        const handleAdmissionChange = (status: string, checkedInAt?: string | null, decidedAt?: string | null) => {
            queryClient.setQueryData(
                EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId),
                {
                    status,
                    checkedInAt: checkedInAt ?? null,
                    decidedAt: decidedAt ?? null,
                },
            );

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
        };

        channel
            // 1. Direct Realtime Broadcast (< 50ms fast path for single or batch admissions)
            .on(
                'broadcast',
                { event: 'admission:updated' },
                (res: { payload?: Record<string, any> }) => {
                    const payload = res?.payload;
                    const isTargetStudent =
                        !studentId ||
                        !payload ||
                        (Array.isArray(payload.studentIds) && payload.studentIds.includes(studentId)) ||
                        payload.studentId === studentId;

                    if (isTargetStudent && payload?.status) {
                        handleAdmissionChange(
                            payload.status,
                            payload.checkedInAt ? String(payload.checkedInAt) : null,
                            payload.decidedAt ? String(payload.decidedAt) : null,
                        );
                    } else {
                        // Invalidate instructor waiting list and counter if event was for another student
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
                        });
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
                        });
                    }

                    callbackRef.current?.(res as any);
                },
            )
            // 2. Realtime Broadcast for student check-ins (updates instructor queue instantly)
            .on(
                'broadcast',
                { event: 'student:checked_in' },
                (res: { payload?: Record<string, any> }) => {
                    void queryClient.invalidateQueries({
                        queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
                    });
                    void queryClient.invalidateQueries({
                        queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
                    });

                    callbackRef.current?.(res as any);
                },
            )
            // 3. PostgreSQL CDC Change Data Capture (Reliable Database WAL Backup)
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
                        const isTargetStudent = !studentId || newRow.student_id === studentId;

                        if (isTargetStudent && newRow.status) {
                            handleAdmissionChange(
                                newRow.status,
                                newRow.checked_in_at ? String(newRow.checked_in_at) : null,
                                newRow.decided_at ? String(newRow.decided_at) : null,
                            );
                        } else {
                            void queryClient.invalidateQueries({
                                queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
                            });
                            void queryClient.invalidateQueries({
                                queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
                            });
                        }
                    } else {
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
                        });
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
                        });
                    }

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
    }, [enabled, examId, queryClient, session?.user, studentId, supabase]);
}
