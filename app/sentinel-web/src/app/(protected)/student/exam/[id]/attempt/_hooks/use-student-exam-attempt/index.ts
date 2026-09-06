'use client';

import { useCallback } from 'react';
import { useAuth } from '@sentinel/hooks';
import { useExamSession } from '@/app/(protected)/student/exam/[id]/_hooks/use-exam-session';
import { useExamInterruption } from '@/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption';
import { useTurnedInExamRedirect } from '@/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect';
import { useStudentExamStageGuard } from '@/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard';

import { useAttemptNavigation } from './use-attempt-navigation';
import { useAttemptAnswers } from './use-attempt-answers';
import { useAttemptSync } from './use-attempt-sync';
import { useAttemptUIState } from './use-attempt-ui-state';
import { useAttemptMonitoring } from './use-attempt-monitoring';
import { useAttemptSubmission } from './use-attempt-submission';
import { useActiveAttemptLifecycle } from '../use-active-attempt-lifecycle';
import { useAttemptBlockedState } from './use-attempt-blocked-state';
import { useAttemptEffectiveConfig } from './use-attempt-effective-config';
import { useAttemptQuestionContext } from './use-attempt-question-context';

export function useStudentExamAttempt() {
    const stageGuard = useStudentExamStageGuard('attempt');
    const {
        examId,
        exam,
        blockedState,
        configuration,
        mediaPipeSandbox,
        questions,
        isResolving,
    } = stageGuard;

    const {
        setLocalBlockedMessage,
        terminalAttemptSuspended,
        setTerminalAttemptSuspended,
        effectiveBlockedState,
    } = useAttemptBlockedState(blockedState);

    const answersHook = useAttemptAnswers();
    const uiHook = useAttemptUIState();

    const {
        examSession,
        isInitializingSession,
        elapsedSeconds,
        elapsedSecondsRef,
        secondsRemaining,
        saveAnswerDraft,
        syncProgress,
    } = useExamSession({
        examId,
        examDurationMinutes: exam?.duration,
        runtimeAccess: exam?.runtimeAccess,
        isLoadingData: isResolving,
        isSessionStartBlocked:
            exam?.status === 'turned_in' ||
            terminalAttemptSuspended ||
            effectiveBlockedState.isBlocked ||
            (Boolean(exam?.runtimeAccess) &&
                !exam?.runtimeAccess?.canStart &&
                !exam?.runtimeAccess?.canResume),
        isTerminalAttempt: terminalAttemptSuspended,
        // Stop timer, draft writes, and remote sync once the attempt is terminal.
        // Note: we don't include examSession?.sessionId here — that would be a
        // temporal dead zone (examSession is the return value of this same call).
        // The session-presence guard already exists inside useExamSession itself.
        isAttemptActive:
            !terminalAttemptSuspended &&
            !effectiveBlockedState.isBlocked &&
            !uiHook.isRedirectingToTurnIn,
        onInitializeAnswers: (fn) => answersHook.setSelectedAnswers(fn),
        onLifecycleBlocked: (msg) => setLocalBlockedMessage(msg),
    });

    const { setMonitoringPhase } = uiHook;
    const handleTerminalAttempt = useCallback(() => {
        setTerminalAttemptSuspended(true);
        setMonitoringPhase('suspended');
    }, [setMonitoringPhase, setTerminalAttemptSuspended]);

    const { user } = useAuth();
    const terminalLifecycle = useActiveAttemptLifecycle({
        examId,
        sessionId: examSession?.sessionId,
        isAttemptActive:
            Boolean(examSession?.sessionId) &&
            !terminalAttemptSuspended &&
            !effectiveBlockedState.isBlocked &&
            !uiHook.isRedirectingToTurnIn,
        onTerminate: handleTerminalAttempt,
    });
    const isTerminalAttempt = terminalAttemptSuspended || terminalLifecycle.isTerminal;
    const renderedBlockedState = terminalLifecycle.blockedState ?? effectiveBlockedState;

    const { flushPendingProgress, broadcastSubmitted } = useAttemptSync({
        isInitializingSession,
        sessionId: examSession?.sessionId,
        elapsedSecondsRef,
        selectedAnswers: answersHook.selectedAnswers,
        saveAnswerDraft,
        syncProgress,
        onLifecycleBlocked: (msg) => setLocalBlockedMessage(msg),
        isSuspended: isTerminalAttempt,
        examId,
        studentId: user?.id,
        totalQuestions: questions.length,
    });

    const isRedirectingToHistory = useTurnedInExamRedirect({
        examId,
        status: exam?.status,
        attemptId: exam?.attemptId,
        runtimeAccess: exam?.runtimeAccess,
    });

    useExamInterruption({
        examId,
        sessionId: examSession?.sessionId,
        isEnabled:
            !renderedBlockedState.isBlocked && !uiHook.isRedirectingToTurnIn && !isTerminalAttempt,
        isNavigationCommitted:
            uiHook.isRedirectingToTurnIn ||
            isRedirectingToHistory ||
            renderedBlockedState.isBlocked ||
            isTerminalAttempt,
        onBeforeInterruption: () => saveAnswerDraft(answersHook.selectedAnswers, elapsedSeconds),
    });

    const configHook = useAttemptEffectiveConfig({
        configuration,
        sessionConfiguration: examSession?.configSnapshot?.configuration,
        mediaPipeSandbox,
        examAttemptId: exam?.attemptId,
        sessionAttemptId: examSession?.attemptId,
        sessionId: examSession?.sessionId,
        isBlocked: renderedBlockedState.isBlocked,
        isRedirectingToTurnIn: uiHook.isRedirectingToTurnIn,
        isRedirectingToHistory,
        isTerminalAttempt,
    });

    const navigationHook = useAttemptNavigation({
        totalQuestions: questions.length,
    });

    const monitoringHook = useAttemptMonitoring({
        examId,
        attemptId: configHook.canonicalAttemptId ?? undefined,
        audioSettings: configHook.effectiveAudioSettings,
        configuration: configHook.effectiveConfiguration,
        examSessionId: examSession?.sessionId,
        isRedirectingToTurnIn: uiHook.isRedirectingToTurnIn,
        mediaPipeSandbox: configHook.effectiveMediaPipeSandbox,
        runtimeAccess: exam?.runtimeAccess,
        monitoringPhase: uiHook.monitoringPhase,
        isTerminalAttempt,
    });

    const questionContext = useAttemptQuestionContext({
        questions,
        currentQuestionIndex: navigationHook.currentQuestionIndex,
        selectedAnswers: answersHook.selectedAnswers,
        answeredCount: answersHook.answeredCount,
        reviewQuestionIds: uiHook.reviewQuestionIds,
        setIsCompactPassageOpen: uiHook.setIsCompactPassageOpen,
    });

    const submissionHook = useAttemptSubmission({
        examId,
        sessionId: examSession?.sessionId,
        releaseScoreMode: configHook.effectiveConfiguration?.releaseScoreMode ?? 'AUTO_RELEASE',
        questions,
        selectedAnswers: answersHook.selectedAnswers,
        elapsedSeconds,
        unansweredCount: questionContext.unansweredCount,
        isRedirectingToTurnIn: uiHook.isRedirectingToTurnIn,
        setIsRedirectingToTurnIn: uiHook.setIsRedirectingToTurnIn,
        setIsSubmitDialogOpen: uiHook.setIsSubmitDialogOpen,
        suspendSecurityMonitoring: monitoringHook.suspendSecurityMonitoring,
        isBlocked: renderedBlockedState.isBlocked || isTerminalAttempt,
        setMonitoringPhase: uiHook.setMonitoringPhase,
        flushPendingProgress,
        broadcastSubmitted,
    });

    return {
        // Data
        examId,
        examSessionId: examSession?.sessionId ?? null,
        attemptId: configHook.canonicalAttemptId,
        effectiveCameraRequired: configHook.effectiveCameraRequired,
        isLiveInspectionEligible: configHook.isLiveInspectionEligible,
        exam,
        questions,
        isLoading: isResolving,
        isInitializingSession,
        isRedirectingHistory: isRedirectingToHistory || terminalLifecycle.isNavigatingToHistory,
        isTerminalAttempt,
        blockedState: renderedBlockedState,
        currentQuestion: questionContext.currentQuestion,
        safeQuestionIndex: questionContext.safeQuestionIndex,
        answeredCount: answersHook.answeredCount,
        answeredQuestionIds: answersHook.answeredQuestionIds,
        progress: questionContext.progress,
        unansweredCount: questionContext.unansweredCount,
        unansweredQuestionLabels: questionContext.unansweredQuestionLabels,
        isCurrentQuestionFlagged: questionContext.isCurrentQuestionFlagged,
        currentContext: questionContext.currentContext,
        secondsRemaining,
        flushPendingProgress,
        // State
        selectedAnswers: answersHook.selectedAnswers,
        reviewQuestionIds: uiHook.reviewQuestionIds,
        showPassagePanel: uiHook.showPassagePanel,
        setShowPassagePanel: uiHook.setShowPassagePanel,
        isCompactPassageOpen: uiHook.isCompactPassageOpen,
        setIsCompactPassageOpen: uiHook.setIsCompactPassageOpen,
        crossOutEnabled: uiHook.crossOutEnabled,
        setCrossOutEnabled: uiHook.setCrossOutEnabled,
        crossedOutOptions: uiHook.crossedOutOptions,
        isSubmitDialogOpen: uiHook.isSubmitDialogOpen,
        setIsSubmitDialogOpen: uiHook.setIsSubmitDialogOpen,
        isRedirectingToTurnIn: uiHook.isRedirectingToTurnIn,
        // MediaPipe
        mediaPipeVideoRef: monitoringHook.mediaPipeVideoRef,
        mediaPipeAnalysis: monitoringHook.mediaPipeAnalysis,
        mediaPipePhase: monitoringHook.mediaPipePhase,
        mediaPipeErrorMessage: monitoringHook.mediaPipeErrorMessage,
        mediaPipeIncident: monitoringHook.mediaPipeIncident,
        dismissMediaPipeIncident: monitoringHook.dismissMediaPipeIncident,
        isMediaPipeEnabled: monitoringHook.isMediaPipeEnabled,
        audioErrorMessage: monitoringHook.audioErrorMessage,
        audioMonitoringPhase: monitoringHook.audioMonitoringPhase,
        isAudioMonitoringEnabled: monitoringHook.isAudioMonitoringEnabled,
        // Security
        securityLockReason: monitoringHook.securityLockReason,
        isResumingExam: monitoringHook.isResumingExam,
        resumeSecuredExam: monitoringHook.resumeSecuredExam,
        fullScreenContainerRef: monitoringHook.fullScreenContainerRef,
        // Handlers
        handleAnswerChange: answersHook.handleAnswerChange,
        handleToggleReview: uiHook.handleToggleReview,
        handleToggleCrossOutOption: uiHook.handleToggleCrossOutOption,
        moveQuestionIndex: navigationHook.moveQuestionIndex,
        handleSubmit: submissionHook.handleSubmit,
        proceedToTurnInReview: submissionHook.proceedToTurnInReview,
        setCurrentQuestionIndex: navigationHook.setCurrentQuestionIndex,
    };
}

