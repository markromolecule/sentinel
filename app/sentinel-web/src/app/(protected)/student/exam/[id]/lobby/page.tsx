'use client';

import { useEffect } from 'react';
import { useExamLobbyCountQuery } from '@sentinel/hooks';
import { StudentExamLoadingState } from '../_components/student-exam-loading-state';
import { StudentFlowShell } from '../_components/student-flow-shell';
import { useStudentExamStageGuard } from '../_hooks/use-student-exam-stage-guard';
import { useLobbyState } from './_hooks/use-lobby-state';
import { useLobbyPresence } from './_hooks/use-lobby-presence';
import { LobbyHeader } from './_components/lobby-header';
import { LobbyLayout } from './_components/lobby-layout';
import { LobbyFooterActions } from './_components/lobby-footer-actions';
import { MonitoringPreloader } from '../_components/monitoring-preloader';

export default function StudentExamLobbyPage() {
    const {
        examId,
        exam,
        blockedState,
        configuration,
        mediaPipeSandbox,
        refetchExam,
        isResolving,
    } = useStudentExamStageGuard('lobby');
    const {
        data: lobbyCount,
        isLoading: isLobbyCountLoading,
        refetch: refetchLobbyCount,
    } = useExamLobbyCountQuery(examId);
    const { presenceCount } = useLobbyPresence(examId);

    const numericDbCount = typeof lobbyCount?.count === 'number' ? lobbyCount.count : 0;
    const effectiveCount = Math.max(numericDbCount, presenceCount);
    const displayCount =
        effectiveCount > 0 ? effectiveCount : isResolving || isLobbyCountLoading ? 'Syncing' : 0;

    const {
        countdownLabel,
        hasCompletedFlow,
        runtimeAccess,
        canEnterExam,
        reopenedUntil,
        storedSession,
        mediaPipeLobbyMessage,
        admissionStatus,
        isStartingSession,
        handleEnterExam,
    } = useLobbyState({
        examId,
        exam,
        configuration,
        mediaPipeSandbox,
        refetchExam,
    });

    useEffect(() => {
        if (!admissionStatus) {
            return;
        }

        void refetchLobbyCount();
    }, [admissionStatus, refetchLobbyCount]);

    if (isResolving) {
        return <StudentExamLoadingState />;
    }

    return (
        <StudentFlowShell>
            <div>
                <MonitoringPreloader configuration={configuration} />
                <LobbyHeader
                    duration={exam?.duration ?? 0}
                    presenceCount={displayCount}
                    maxReconnectAttempts={configuration.maxReconnectAttempts}
                    runtimeAccess={runtimeAccess}
                    hasCompletedFlow={hasCompletedFlow}
                />

                <LobbyLayout
                    hasCompletedFlow={hasCompletedFlow}
                    accessMessage={
                        blockedState.isBlocked ? blockedState.message : runtimeAccess?.message
                    }
                    countdownLabel={countdownLabel}
                    maxReconnectAttempts={configuration.maxReconnectAttempts}
                    mediaPipeLobbyMessage={mediaPipeLobbyMessage}
                    runtimeAccess={runtimeAccess}
                    reopenedUntil={reopenedUntil}
                />

                <LobbyFooterActions
                    examId={examId}
                    isStartingSession={isStartingSession}
                    runtimeAccess={runtimeAccess}
                    admissionStatus={admissionStatus}
                    storedSession={storedSession}
                    hasCompletedFlow={hasCompletedFlow}
                    canEnterExam={canEnterExam}
                    onEnterExam={handleEnterExam}
                />
            </div>
        </StudentFlowShell>
    );
}
