'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import type { PresenceState } from '@sentinel/shared/types';
import { useAuth } from './auth-provider';

export type UseLobbyRealtimeArgs = {
    examId: string;
    studentId?: string;
    onAdmissionChange?: (payload: Record<string, any>) => void;
    enabled?: boolean;
    trackPresence?: boolean;
};

export function useLobbyRealtime(args: UseLobbyRealtimeArgs) {
    const {
        examId,
        studentId,
        onAdmissionChange,
        enabled = true,
        trackPresence = true,
    } = args;
    const queryClient = useQueryClient();
    const { supabase, session } = useAuth();
    const [presenceCount, setPresenceCount] = useState(0);
    const callbackRef = useRef(onAdmissionChange);

    useEffect(() => {
        callbackRef.current = onAdmissionChange;
    }, [onAdmissionChange]);

    useEffect(() => {
        if (
            !enabled ||
            !supabase ||
            !session?.user ||
            !examId ||
            !supabase.channel ||
            !supabase.removeChannel
        ) {
            setPresenceCount(0);
            return () => {};
        }

        let isEffectActive = true;
        const channelName = `lobby:${examId}`;
        const presenceKey = studentId || session.user.id;

        const channel: RealtimeChannel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: presenceKey,
                },
            },
        });

        const handleAdmissionChange = (
            status: string,
            checkedInAt?: string | null,
            decidedAt?: string | null,
        ) => {
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
            // 1. Unified Presence Sync on the single lobby channel
            .on('presence', { event: 'sync' }, () => {
                if (!isEffectActive) return;

                const state = channel.presenceState<PresenceState>() ?? {};
                const uniqueUserIds = new Set<string>();

                Object.values(state).forEach((presences) => {
                    (presences ?? []).forEach((p: any) => {
                        if (p?.user_id) uniqueUserIds.add(p.user_id);
                    });
                });

                setPresenceCount(uniqueUserIds.size);
            })
            // 2. Direct Realtime Broadcast (< 50ms fast path for single or batch admissions)
            .on(
                'broadcast',
                { event: 'admission:updated' },
                (res: { payload?: Record<string, any> }) => {
                    const payload = res?.payload;
                    const isInstructor = !studentId;
                    const isTargetStudent =
                        isInstructor ||
                        !payload ||
                        (Array.isArray(payload.studentIds) && payload.studentIds.includes(studentId)) ||
                        payload.studentId === studentId;

                    if (isTargetStudent && payload?.status) {
                        handleAdmissionChange(
                            payload.status,
                            payload.checkedInAt ? String(payload.checkedInAt) : null,
                            payload.decidedAt ? String(payload.decidedAt) : null,
                        );
                        callbackRef.current?.(res as any);
                    } else if (isInstructor) {
                        // Invalidate instructor waiting list and counter if event was for another student
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
                        });
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
                        });
                        callbackRef.current?.(res as any);
                    }
                },
            )
            // 3. Realtime Broadcast for student check-ins (updates instructor queue instantly)
            .on(
                'broadcast',
                { event: 'student:checked_in' },
                (res: { payload?: Record<string, any> }) => {
                    const isInstructor = !studentId;
                    if (isInstructor) {
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
                        });
                        void queryClient.invalidateQueries({
                            queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
                        });
                        callbackRef.current?.(res as any);
                    }
                },
            )
            .subscribe(async (status, err) => {
                if (status === 'SUBSCRIBED' && isEffectActive && trackPresence) {
                    try {
                        await channel.track({
                            user_id: presenceKey,
                            online_at: new Date().toISOString(),
                        });
                    } catch {
                        // ignore track errors if unmounted or channel closed
                    }
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn(`[useLobbyRealtime] Channel ${channelName} subscription issue: ${status}`, err);
                }
            });

        return () => {
            isEffectActive = false;
            supabase.removeChannel(channel);
        };
    }, [enabled, examId, queryClient, session?.user, studentId, supabase, trackPresence]);

    return { presenceCount };
}
