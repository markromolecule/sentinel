import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamSessionStatusQuery } from '@sentinel/hooks';
import type { ExamSessionStatusResult } from '@sentinel/services';
import { buildStudentHistoryAttemptHref } from '@/lib/routes/student-history-routes';
import { terminateStudentAttempt } from '@/app/(protected)/student/exam/[id]/_lib/terminate-student-attempt';

type TerminalLifecycleState = Extract<
    NonNullable<ExamSessionStatusResult['lifecycleState']>,
    'LOCKED' | 'CLOSED' | 'SUBMITTED' | 'SUPERSEDED'
>;

export type ActiveAttemptTerminalState = {
    sessionId: string;
    attemptId: string;
    examId: string;
    lifecycleState: TerminalLifecycleState | null;
    status: ExamSessionStatusResult['status'];
    message: string | null;
    historyHref: string | null;
    blockedState: {
        isBlocked: boolean;
        code: 'LOCKED' | 'CLOSED' | 'SUPERSEDED' | null;
        title: string | null;
        message: string | null;
    };
};

export type UseActiveAttemptLifecycleArgs = {
    examId: string;
    sessionId?: string | null;
    isAttemptActive: boolean;
    onTerminate?: () => void;
};

function isTerminalStatus(status?: ExamSessionStatusResult | null) {
    return Boolean(
        status &&
        (status.status === 'COMPLETED' ||
            status.lifecycleState === 'LOCKED' ||
            status.lifecycleState === 'CLOSED' ||
            status.lifecycleState === 'SUBMITTED' ||
            status.lifecycleState === 'SUPERSEDED'),
    );
}

function buildBlockedState(
    status: ExamSessionStatusResult,
): ActiveAttemptTerminalState['blockedState'] {
    if (status.lifecycleState === 'LOCKED') {
        return {
            isBlocked: true,
            code: 'LOCKED',
            title: 'Exam Locked',
            message:
                status.terminalMessage ??
                'This exam attempt is locked and cannot be continued right now.',
        };
    }

    if (status.lifecycleState === 'CLOSED') {
        return {
            isBlocked: true,
            code: 'CLOSED',
            title: 'Exam Closed',
            message: status.terminalMessage ?? 'This exam attempt has been closed.',
        };
    }

    if (status.lifecycleState === 'SUPERSEDED') {
        return {
            isBlocked: true,
            code: 'SUPERSEDED',
            title: 'Attempt Replaced',
            message:
                status.terminalMessage ??
                'This exam attempt was replaced by a newer attempt and can no longer be continued.',
        };
    }

    return {
        isBlocked: false,
        code: null,
        title: null,
        message: null,
    };
}

function buildTerminalState(status: ExamSessionStatusResult): ActiveAttemptTerminalState {
    const shouldNavigateToHistory =
        status.status === 'COMPLETED' || status.lifecycleState === 'SUBMITTED';

    return {
        sessionId: status.sessionId,
        attemptId: status.attemptId,
        examId: status.examId,
        lifecycleState: status.lifecycleState as TerminalLifecycleState | null,
        status: status.status,
        message: status.terminalMessage,
        historyHref: shouldNavigateToHistory
            ? buildStudentHistoryAttemptHref(status.attemptId)
            : null,
        blockedState: buildBlockedState(status),
    };
}

/**
 * Polls the owned session status and latches the first terminal response.
 *
 * Once terminal state is observed, later stale `IN_PROGRESS` responses are
 * ignored and cleanup/navigation runs at most once.
 */
export function useActiveAttemptLifecycle({
    examId,
    sessionId,
    isAttemptActive,
    onTerminate,
}: UseActiveAttemptLifecycleArgs) {
    const router = useRouter();
    const [terminalState, setTerminalState] = useState<ActiveAttemptTerminalState | null>(null);
    const didTerminateRef = useRef(false);

    const statusQuery = useExamSessionStatusQuery(sessionId, isAttemptActive && !terminalState);
    const observedTerminalState =
        terminalState ??
        (statusQuery.data && isTerminalStatus(statusQuery.data)
            ? buildTerminalState(statusQuery.data)
            : null);

    useEffect(() => {
        if (!statusQuery.data || !isTerminalStatus(statusQuery.data)) {
            return;
        }

        const nextTerminalState = buildTerminalState(statusQuery.data);

        void Promise.resolve().then(() => {
            setTerminalState((current) => current ?? nextTerminalState);
        });
    }, [statusQuery.data]);

    useEffect(() => {
        if (!observedTerminalState || didTerminateRef.current) {
            return;
        }

        didTerminateRef.current = true;
        onTerminate?.();
        terminateStudentAttempt({ examId });

        if (observedTerminalState.historyHref) {
            router.replace(observedTerminalState.historyHref);
        }
    }, [examId, observedTerminalState, onTerminate, router]);

    return useMemo(
        () => ({
            statusQuery,
            terminalState: observedTerminalState,
            isTerminal: Boolean(observedTerminalState),
            isNavigatingToHistory: Boolean(observedTerminalState?.historyHref),
            blockedState: observedTerminalState?.blockedState ?? null,
        }),
        [observedTerminalState, statusQuery],
    );
}
