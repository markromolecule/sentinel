import { useMemo, useRef } from 'react';
import { useApi, useAuth, useExamQuery } from '@sentinel/hooks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    adaptExamForMobile,
    adaptExamQuestionsForMobile,
} from '@/features/exam/lib/mobile-exam-adapter';
import { useExamSessionSecurity } from './use-exam-session-security';
import { useExamSessionTimer } from './use-exam-session-timer';
import { useExamSessionSubmission } from './use-exam-session-submission';
import { useExamSessionSync } from './use-exam-session-sync';
import { useExamSessionNavigation } from './use-exam-session-navigation';
import { useExamSessionLifecycle } from './use-exam-session-lifecycle';

export { useExamSessionSecurity } from './use-exam-session-security';
export { useExamSessionTimer } from './use-exam-session-timer';
export { useExamSessionSubmission } from './use-exam-session-submission';
export { useExamSessionSync } from './use-exam-session-sync';
export { useExamSessionNavigation } from './use-exam-session-navigation';
export { useExamSessionLifecycle } from './use-exam-session-lifecycle';

export const useExamSession = () => {
    const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
    const router = useRouter();
    const apiClient = useApi();
    const { user } = useAuth();
    const { data: rawExam, isLoading: isExamLoading } = useExamQuery(id, { viewer: 'student' });

    // Data Adaptation
    const exam = useMemo(() => (rawExam ? adaptExamForMobile(rawExam) : undefined), [rawExam]);
    const questions = useMemo(
        () => (rawExam ? adaptExamQuestionsForMobile(rawExam) : []),
        [rawExam],
    );

    // 1. Reconnection & Storage Lifecycle
    const { reconRef } = useExamSessionLifecycle({
        id,
        sessionId,
        router,
    });

    // 2. Mobile Security Policy & Telemetry Enforcers
    useExamSessionSecurity({
        exam,
        sessionId,
        user,
        apiClient,
    });

    // Mutable refs bridging execution callbacks across hooks
    const executeSubmissionRef = useRef<() => Promise<void>>(() => Promise.resolve());
    const syncProgressNowRef = useRef<() => Promise<void>>(() => Promise.resolve());

    // 3. Navigation, Selection, and Flagging State
    const navigation = useExamSessionNavigation({
        questions,
        onConfirmSubmit: () => {
            void executeSubmissionRef.current();
        },
        syncProgressNow: async () => {
            await syncProgressNowRef.current();
        },
    });

    // 4. Timer & Countdown State
    const timer = useExamSessionTimer({
        duration: exam?.duration,
        hasLoadedExam: Boolean(exam),
        isSubmitting: false,
        onExpire: () => {
            void executeSubmissionRef.current();
        },
    });

    // 5. Submission & Turn-In
    const submission = useExamSessionSubmission({
        id,
        sessionId,
        exam,
        questions,
        answersRef: navigation.answersRef,
        timeLeftRef: timer.timeLeftRef,
        apiClient,
        router,
    });
    executeSubmissionRef.current = submission.executeSubmission;

    // 6. Progress Synchronization & Heartbeat
    const sync = useExamSessionSync({
        apiClient,
        exam,
        sessionId,
        questions,
        answers: navigation.answers,
        answersRef: navigation.answersRef,
        timeLeftRef: timer.timeLeftRef,
        reconRef,
    });
    syncProgressNowRef.current = sync.syncProgressNow;

    return {
        exam,
        questions,
        currentQuestion: navigation.currentQuestion,
        currentIndex: navigation.currentIndex,
        setCurrentIndex: navigation.setCurrentIndex,
        isLastQuestion: navigation.isLastQuestion,
        answers: navigation.answers,
        flagged: navigation.flagged,
        isDrawerOpen: navigation.isDrawerOpen,
        setIsDrawerOpen: navigation.setIsDrawerOpen,
        timeLeft: timer.timeLeft,
        isLoading: isExamLoading,
        isSubmitting: submission.isSubmitting,
        formatTime: timer.formatTime,
        handleSelectOption: navigation.handleSelectOption,
        toggleFlag: navigation.toggleFlag,
        handleNext: navigation.handleNext,
        handlePrev: navigation.handlePrevious,
        handlePrevious: navigation.handlePrevious,
        handleSelectQuestion: navigation.handleSelectQuestion,
    };
};
