import { useEffect, useRef, useCallback, type MutableRefObject } from 'react';
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
}: UseExamSessionSyncOptions) {
    const isSyncingRef = useRef(false);

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

    // 1. Debounced sync on answer state change (1200ms after user action)
    useEffect(() => {
        if (!sessionId) return;

        const timer = setTimeout(() => {
            void syncProgressNow();
        }, 1200);

        return () => clearTimeout(timer);
    }, [answers, sessionId, syncProgressNow]);

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

    return {
        syncProgressNow,
        isSyncingRef,
    };
}
