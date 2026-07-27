'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioSettingsQuery } from '@sentinel/hooks';
import { DEFAULT_AUDIO_ANOMALY_CONFIG } from '@sentinel/shared';
import { getRuntimePassageDetails, hasAnswer } from '@/features/exams/_components/engine';
import { useStudentExamData } from '@/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data';
import { useExamSession } from '@/app/(protected)/student/exam/[id]/_hooks/use-exam-session';
import { useExamInterruption } from '@/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption';
import { useTurnedInExamRedirect } from '@/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect';
import { resolveStudentExamMediaPipeSandbox } from '@/app/(protected)/student/exam/[id]/_lib/student-exam-flow';
import {
    readStoredLobbyEntry,
    readStoredExamSession,
} from '@/app/(protected)/student/exam/[id]/_lib/exam-session-storage';
import { useAttemptNavigation } from './use-attempt-navigation';
import { useAttemptAnswers } from './use-attempt-answers';
import { useAttemptSync } from './use-attempt-sync';
import { useAttemptUIState } from './use-attempt-ui-state';
import { useAttemptMonitoring } from './use-attempt-monitoring';
import { useAttemptSubmission } from './use-attempt-submission';

import { useStudentExamStageGuard } from '@/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard';

export function useStudentExamAttempt() {
    const { replace } = useRouter();
    const stageGuard = useStudentExamStageGuard('attempt');
    const {
        examId,
        exam,
        blockedState,
        configuration,
        mediaPipeSandbox,
        questions,
        isResolving,
        isResolving: isLoading,
    } = stageGuard;

    const [localBlockedMessage, setLocalBlockedMessage] = useState<string | null>(null);

    const effectiveBlockedState = useMemo(() => {
        if (localBlockedMessage) {
            const isSuperseded = /reset|replaced|superseded/i.test(localBlockedMessage);
            return {
                isBlocked: true,
                code: isSuperseded ? 'SUPERSEDED' : ('LOCKED' as const),
                title: isSuperseded ? 'Attempt Replaced' : 'Exam Locked',
                message: localBlockedMessage,
            };
        }

        return (
            blockedState ?? {
                isBlocked: false,
                code: null,
                title: null,
                message: null,
            }
        );
    }, [blockedState, localBlockedMessage]);

    const answersHook = useAttemptAnswers();
    const uiHook = useAttemptUIState();

    const {
        examSession,
        isInitializingSession,
        elapsedSeconds,
        secondsRemaining,
        saveAnswerDraft,
        syncProgress,
    } = useExamSession({
        examId,
        examDurationMinutes: exam?.duration,
        runtimeAccess: exam?.runtimeAccess,
        isLoadingData: isLoading,
        isSessionStartBlocked:
            exam?.status === 'turned_in' ||
            effectiveBlockedState.isBlocked ||
            (Boolean(exam?.runtimeAccess) &&
                !exam?.runtimeAccess?.canStart &&
                !exam?.runtimeAccess?.canResume),
        onInitializeAnswers: (fn) => answersHook.setSelectedAnswers(fn),
        onLifecycleBlocked: (msg) => setLocalBlockedMessage(msg),
    });

    useAttemptSync({
        isInitializingSession,
        sessionId: examSession?.sessionId,
        elapsedSeconds,
        selectedAnswers: answersHook.selectedAnswers,
        saveAnswerDraft,
        syncProgress,
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
        isEnabled: !effectiveBlockedState.isBlocked && !uiHook.isRedirectingToTurnIn,
        isNavigationCommitted:
            uiHook.isRedirectingToTurnIn ||
            isRedirectingToHistory ||
            effectiveBlockedState.isBlocked,
        onBeforeInterruption: () => saveAnswerDraft(answersHook.selectedAnswers, elapsedSeconds),
    });

    const effectiveConfiguration = useMemo(
        () => examSession?.configSnapshot?.configuration ?? configuration,
        [configuration, examSession?.configSnapshot?.configuration],
    );

    const effectiveMediaPipeSandbox = useMemo(
        () =>
            resolveStudentExamMediaPipeSandbox({
                configuration: effectiveConfiguration,
                mediaPipeSandbox,
            }),
        [effectiveConfiguration, mediaPipeSandbox],
    );
    const canonicalAttemptId = examSession?.attemptId ?? exam?.attemptId ?? null;
    const effectiveCameraRequired = Boolean(effectiveConfiguration?.cameraRequired);
    const isLiveInspectionEligible =
        Boolean(examSession?.sessionId) &&
        Boolean(canonicalAttemptId) &&
        effectiveCameraRequired &&
        !effectiveBlockedState.isBlocked &&
        !uiHook.isRedirectingToTurnIn &&
        !isRedirectingToHistory;
    const audioSettingsQuery = useAudioSettingsQuery();
    const effectiveAudioSettings = useMemo(() => {
        if (!effectiveConfiguration?.aiRules?.audio_anomaly_detection) {
            return null;
        }

        if (audioSettingsQuery.data?.value) {
            return audioSettingsQuery.data.value;
        }

        if (audioSettingsQuery.isLoading) {
            return null;
        }

        return DEFAULT_AUDIO_ANOMALY_CONFIG;
    }, [
        audioSettingsQuery.data?.value,
        audioSettingsQuery.isLoading,
        effectiveConfiguration?.aiRules?.audio_anomaly_detection,
    ]);

    const navigationHook = useAttemptNavigation({
        totalQuestions: questions.length,
    });

    const monitoringHook = useAttemptMonitoring({
        examId,
        attemptId: canonicalAttemptId ?? undefined,
        audioSettings: effectiveAudioSettings,
        configuration: effectiveConfiguration,
        examSessionId: examSession?.sessionId,
        isRedirectingToTurnIn: uiHook.isRedirectingToTurnIn,
        mediaPipeSandbox: effectiveMediaPipeSandbox,
        runtimeAccess: exam?.runtimeAccess,
        monitoringPhase: uiHook.monitoringPhase,
    });

    const unansweredQuestions = questions.filter(
        (question) => !hasAnswer(answersHook.selectedAnswers[question.id]),
    );
    const unansweredCount = unansweredQuestions.length;
    const unansweredQuestionLabels = unansweredQuestions.slice(0, 8).map((question, index) => {
        const qIndex = questions.findIndex((q) => q.id === question.id);
        return `Q${qIndex >= 0 ? qIndex + 1 : index + 1}`;
    });

    const submissionHook = useAttemptSubmission({
        examId,
        sessionId: examSession?.sessionId,
        releaseScoreMode: effectiveConfiguration.releaseScoreMode ?? 'AUTO_RELEASE',
        questions,
        selectedAnswers: answersHook.selectedAnswers,
        elapsedSeconds,
        unansweredCount,
        isRedirectingToTurnIn: uiHook.isRedirectingToTurnIn,
        setIsRedirectingToTurnIn: uiHook.setIsRedirectingToTurnIn,
        setIsSubmitDialogOpen: uiHook.setIsSubmitDialogOpen,
        suspendSecurityMonitoring: monitoringHook.suspendSecurityMonitoring,
        isBlocked: effectiveBlockedState.isBlocked,
        setMonitoringPhase: uiHook.setMonitoringPhase,
    });

    const safeQuestionIndex = navigationHook.currentQuestionIndex;
    const currentQuestion = questions[safeQuestionIndex] ?? null;
    const progress = questions.length
        ? Math.round((answersHook.answeredCount / questions.length) * 100)
        : 0;

    const isCurrentQuestionFlagged = currentQuestion
        ? uiHook.reviewQuestionIds.includes(currentQuestion.id)
        : false;

    // Close the compact passage sheet on question change
    const currentQuestionId = currentQuestion?.id;
    useEffect(() => {
        uiHook.setIsCompactPassageOpen(false);
    }, [currentQuestionId]);

    const currentContext = getRuntimePassageDetails({
        questionPassageContent: currentQuestion?.passageContent,
        questionPassageType: currentQuestion?.passageType,
    });

    return {
        // Data
        examId,
        examSessionId: examSession?.sessionId ?? null,
        attemptId: canonicalAttemptId,
        effectiveCameraRequired,
        isLiveInspectionEligible,
        exam,
        questions,
        isLoading: isResolving,
        isInitializingSession,
        isRedirectingHistory: isRedirectingToHistory,
        blockedState: effectiveBlockedState,
        currentQuestion,
        safeQuestionIndex,
        answeredCount: answersHook.answeredCount,
        answeredQuestionIds: answersHook.answeredQuestionIds,
        progress,
        unansweredCount,
        unansweredQuestionLabels,
        isCurrentQuestionFlagged,
        currentContext,
        secondsRemaining,
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
