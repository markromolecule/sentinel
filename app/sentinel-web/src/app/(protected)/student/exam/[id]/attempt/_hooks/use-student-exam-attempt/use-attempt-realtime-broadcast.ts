import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@sentinel/hooks';
import type { AttemptRealtimeChannel } from './use-attempt-sync.types';

export type UseAttemptRealtimeBroadcastArgs = {
    examId?: string;
    studentId?: string;
    isSuspended?: boolean;
    monitoringChannel?: AttemptRealtimeChannel | null;
};

/**
 * Manages proctoring monitoring channel subscription and real-time student signaling.
 */
export function useAttemptRealtimeBroadcast({
    examId,
    studentId,
    isSuspended = false,
    monitoringChannel,
}: UseAttemptRealtimeBroadcastArgs) {
    const { supabase } = useAuth();
    const activeChannelRef = useRef<AttemptRealtimeChannel | null>(monitoringChannel ?? null);

    useEffect(() => {
        if (monitoringChannel) {
            activeChannelRef.current = monitoringChannel;
            return () => { };
        }

        if (!supabase || !examId || isSuspended || !supabase.channel || !supabase.removeChannel) {
            return () => { };
        }

        const channel = supabase.channel(`exam:${examId}:monitoring`);
        activeChannelRef.current = channel;
        channel.subscribe?.();

        return () => {
            activeChannelRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [examId, isSuspended, monitoringChannel, supabase]);

    const broadcastProgress = useCallback(
        (answeredCount: number, totalQuestions?: number) => {
            if (!studentId || !activeChannelRef.current) return;
            const progress =
                totalQuestions && totalQuestions > 0
                    ? Math.round((answeredCount / totalQuestions) * 100)
                    : 0;

            activeChannelRef.current.send({
                type: 'broadcast',
                event: 'student:progress',
                payload: {
                    studentId,
                    answeredCount,
                    totalQuestions: totalQuestions ?? 0,
                    progress,
                },
            });
        },
        [studentId],
    );

    const broadcastSubmitted = useCallback(() => {
        if (!studentId || !activeChannelRef.current) return;
        activeChannelRef.current.send({
            type: 'broadcast',
            event: 'student:submitted',
            payload: {
                studentId,
                submittedAt: new Date().toISOString(),
            },
        });
    }, [studentId]);

    return {
        broadcastProgress,
        broadcastSubmitted,
    };
}
