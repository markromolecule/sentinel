'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './auth-provider';

export type StudentProgressPayload = {
    studentId: string;
    answeredCount: number;
    totalQuestions: number;
    progress: number;
};

export type StudentSubmittedPayload = {
    studentId: string;
    submittedAt: string;
};

export type UseMonitoringRealtimeArgs = {
    examId?: string;
    onProgressUpdate?: (payload: StudentProgressPayload) => void;
    onStudentSubmitted?: (payload: StudentSubmittedPayload) => void;
    enabled?: boolean;
};

/**
 * Subscribes to the ephemeral Supabase Realtime broadcast channel `exam:${examId}:monitoring`.
 * Listens for live student answer progress and immediate turn-in events with <50ms latency
 * without issuing any database queries or causing WAL overhead.
 */
export function useMonitoringRealtime(args: UseMonitoringRealtimeArgs) {
    const { examId, onProgressUpdate, onStudentSubmitted, enabled = true } = args;
    const { supabase } = useAuth();
    const onProgressUpdateRef = useRef(onProgressUpdate);
    const onStudentSubmittedRef = useRef(onStudentSubmitted);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        onProgressUpdateRef.current = onProgressUpdate;
    }, [onProgressUpdate]);

    useEffect(() => {
        onStudentSubmittedRef.current = onStudentSubmitted;
    }, [onStudentSubmitted]);

    useEffect(() => {
        if (!enabled || !supabase || !examId || !supabase.channel || !supabase.removeChannel) {
            return () => {};
        }

        const channelName = `exam:${examId}:monitoring`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
            .on(
                'broadcast',
                { event: 'student:progress' },
                (res: { payload?: StudentProgressPayload }) => {
                    if (res?.payload?.studentId) {
                        onProgressUpdateRef.current?.(res.payload);
                    }
                },
            )
            .on(
                'broadcast',
                { event: 'student:submitted' },
                (res: { payload?: StudentSubmittedPayload }) => {
                    if (res?.payload?.studentId) {
                        onStudentSubmittedRef.current?.(res.payload);
                    }
                },
            )
            .subscribe();

        return () => {
            channelRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [enabled, examId, supabase]);

    const broadcastProgress = useCallback((payload: StudentProgressPayload) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'student:progress',
            payload,
        });
    }, []);

    const broadcastSubmitted = useCallback((payload: StudentSubmittedPayload) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'student:submitted',
            payload,
        });
    }, []);

    return {
        broadcastProgress,
        broadcastSubmitted,
    };
}
