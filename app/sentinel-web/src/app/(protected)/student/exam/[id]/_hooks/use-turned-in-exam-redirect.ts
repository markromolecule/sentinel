'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ExamRuntimeAccess } from '@sentinel/shared/types';
import { clearStoredExamSession, clearStoredReconnectIntent } from '../_lib/exam-session-storage';
import { clearStoredExamTurnInPreview } from '../_lib/exam-turn-in-storage';
import { buildStudentHistoryAttemptHref } from '@/lib/routes/student-history-routes';

import { resolveStudentExamStage } from '../_lib/student-exam-flow';

type UseTurnedInExamRedirectArgs = {
    examId: string;
    status?: string | null;
    attemptId?: string | null;
    runtimeAccess?: ExamRuntimeAccess | null;
    disabled?: boolean;
};

export function useTurnedInExamRedirect({
    examId,
    status,
    attemptId,
    runtimeAccess,
    disabled = false,
}: UseTurnedInExamRedirectArgs) {
    const router = useRouter();
    const resolution = resolveStudentExamStage({
        requestedStage: 'instruction',
        privacyAccepted: true,
        checkupCompleted: true,
        mediaPipeStatus: 'ready',
        admissionMode: 'AUTOMATIC',
        admissionState: null,
        runtimeAccess: {
            isTurnedIn: status === 'turned_in',
            canStart: runtimeAccess?.canStart,
            canResume: runtimeAccess?.canResume,
        },
    });

    const isRedirecting = !disabled && resolution.targetStage === 'result' && Boolean(attemptId);

    useEffect(() => {
        if (!isRedirecting || !attemptId) {
            return;
        }

        clearStoredExamTurnInPreview(examId);
        clearStoredExamSession(examId);
        clearStoredReconnectIntent(examId);
        router.replace(buildStudentHistoryAttemptHref(attemptId));
    }, [attemptId, examId, isRedirecting, router]);

    return isRedirecting;
}
