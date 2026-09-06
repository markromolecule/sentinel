import { useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { useAuth } from '@sentinel/hooks';
import { syncExamProgress } from '@sentinel/services';
import {
    buildSessionAnswerPayload,
    isQuestionAnswered,
} from '@/features/exam/lib/mobile-exam-adapter';
import type { MobileExamDisplay, MobileSessionQuestion } from '@/features/exam/lib/mobile-exam-adapter.types';
import type { MobileExamReconnection } from '@/features/exam/lib/mobile-exam-reconnection';

interface UseExamSessionSyncOptions {
    apiClient: any;
    exam?: MobileExamDisplay;
    sessionId?: string;
    questions: MobileSessionQuestion[];
    answers: Record<string, any>;
    answersRef: MutableRefObject<Record<string, any>>;
    timeLeftRef: MutableRefObject<number>;
    reconRef?: MutableRefObject<MobileExamReconnection | null>;
    studentId?: string;
    monitoringChannel?: { send: (msg: any) => void } | null;
}

export function useExamSessionSync({
    apiClient,
    exam,
    sessionId,
    questions,
    answers,
    answersRef,
    timeLeftRef,
    reconRef,
    studentId,
    monitoringChannel,
}: UseExamSessionSyncOptions) {
    const isSyncingRef = useRef(false);
    const { supabase, session } = useAuth();
    const resolvedStudentId = studentId ?? session?.user?.id;
    const activeChannelRef = useRef<any>(monitoringChannel ?? null);

    useEffect(() => {
        if (monitoringChannel) {
            activeChannelRef.current = monitoringChannel;
            return () => {};
        }

        const examId = exam?.id;
        if (!supabase || !examId || !supabase.channel || !supabase.removeChannel) {
            return () => {};
        }

        const channel = supabase.channel(`exam:${examId}:monitoring`);
        activeChannelRef.current = channel;
        channel.subscribe?.();

        return () => {
            activeChannelRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [exam?.id, monitoringChannel, supabase]);

    // Core progress sync execution function (reads latest refs, guarded against concurrent races)
    const syncProgressNow = useCallback(async () => {
        if (!sessionId || !exam || isSyncingRef.current) return;

        isSyncingRef.current = true;
        const currentAnswers = answersRef.current;
        const currentElapsed = Math.max(0, (exam.duration || 60) * 60 - timeLeftRef.current);
        const answeredCount = Object.values(currentAnswers).filter(isQuestionAnswered).length;
        const answerPayload = buildSessionAnswerPayload(questions, currentAnswers);

        try {
            await syncExamProgress(apiClient, {
                sessionId,
                answeredCount,
                elapsedSeconds: currentElapsed,
                answers: answerPayload,
            });
        } catch {
            reconRef?.current?.triggerNetworkDisruption();
        } finally {
            isSyncingRef.current = false;
        }
    }, [apiClient, exam, questions, sessionId, answersRef, timeLeftRef, reconRef]);

    // 1. Debounced sync on answer state change (1200ms after user action) + immediate realtime broadcast
    useEffect(() => {
        if (!sessionId) return;

        // Broadcast progress event (<50ms, zero DB load)
        const currentAnswers = answersRef.current;
        const answeredCount = Object.values(currentAnswers).filter(isQuestionAnswered).length;
        const totalQuestions = questions.length;
        const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

        if (resolvedStudentId && activeChannelRef.current) {
            activeChannelRef.current.send({
                type: 'broadcast',
                event: 'student:progress',
                payload: {
                    studentId: resolvedStudentId,
                    answeredCount,
                    totalQuestions,
                    progress,
                },
            });
        }

        const timer = setTimeout(() => {
            void syncProgressNow();
        }, 1200);

        return () => clearTimeout(timer);
    }, [answers, sessionId, syncProgressNow, questions.length, resolvedStudentId, answersRef]);

    // 2. Periodic background heartbeat with randomized jitter (15s–25s)
    useEffect(() => {
        if (!sessionId) return;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let isMounted = true;

        const scheduleNextHeartbeat = () => {
            if (!isMounted) return;
            const jitterMs = 15_000 + Math.floor(Math.random() * 10_000);
            timeoutId = setTimeout(async () => {
                await syncProgressNow();
                if (isMounted) {
                    scheduleNextHeartbeat();
                }
            }, jitterMs);
        };

        scheduleNextHeartbeat();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [sessionId, syncProgressNow]);

    const broadcastSubmitted = useCallback(() => {
        if (!resolvedStudentId || !activeChannelRef.current) return;
        activeChannelRef.current.send({
            type: 'broadcast',
            event: 'student:submitted',
            payload: {
                studentId: resolvedStudentId,
                submittedAt: new Date().toISOString(),
            },
        });
    }, [resolvedStudentId]);

    return {
        syncProgressNow,
        isSyncingRef,
        broadcastSubmitted,
    };
}
