import { useState } from 'react';
import { toast } from 'sonner';
import {
    useCloseExamAttemptMutation,
    useGrantMakeupExamWindowMutation,
    useGrantRetakeExamWindowMutation,
    useLockExamAttemptMutation,
    useOverrideReconnectLimitMutation,
    useReopenExamAttemptMutation,
    useResetExamAttemptMutation,
    useAuthorizeStudentReentryMutation,
} from '@sentinel/hooks';
import type { MonitoringLifecycleAction, StudentSession } from '@sentinel/shared/types';

type UseLifecycleProps = {
    examId: string;
    refetch: () => Promise<unknown>;
};

/**
 * useLifecycle manages mutations and states related to individual student attempt lifecycles
 * (lock, reopen, reset, close, makeup, retake) and reconnect override actions.
 *
 * @param props - Hook options including examId and query refetch function.
 */
export function useLifecycle({ examId, refetch }: UseLifecycleProps) {
    const [overridingStudentId, setOverridingStudentId] = useState<string | null>(null);
    const [activeLifecycleActionId, setActiveLifecycleActionId] = useState<string | null>(null);

    const overrideReconnectLimitMutation = useOverrideReconnectLimitMutation({
        onSuccess: async () => {
            toast.success('Reconnect override granted successfully.');
            await refetch();
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const authorizeStudentReentryMutation = useAuthorizeStudentReentryMutation({
        onSuccess: async () => {
            toast.success('Re-entry authorized and reconnects reset successfully.');
            await refetch();
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const lockAttemptMutation = useLockExamAttemptMutation();
    const reopenAttemptMutation = useReopenExamAttemptMutation();
    const resetAttemptMutation = useResetExamAttemptMutation();
    const closeAttemptMutation = useCloseExamAttemptMutation();
    const grantMakeupMutation = useGrantMakeupExamWindowMutation();
    const grantRetakeMutation = useGrantRetakeExamWindowMutation();

    const handleOverrideReconnect = async (studentId: string, recordId?: string | null) => {
        setOverridingStudentId(studentId);
        try {
            await overrideReconnectLimitMutation.mutateAsync({
                id: examId,
                studentId: recordId ?? studentId,
                reason: 'Instructor granted a one-time reconnect override from monitoring.',
            });
        } finally {
            setOverridingStudentId(null);
        }
    };

    const handleAuthorizeReentry = async (studentId: string, recordId?: string | null) => {
        setOverridingStudentId(studentId);
        try {
            await authorizeStudentReentryMutation.mutateAsync({
                id: examId,
                studentId: recordId ?? studentId,
                reason: 'Instructor authorized student re-entry from monitoring.',
            });
        } finally {
            setOverridingStudentId(null);
        }
    };

    const handleLifecycleAction = async (
        student: StudentSession,
        action: MonitoringLifecycleAction,
    ) => {
        const actionId = `${student.attemptId}:${action}`;
        setActiveLifecycleActionId(actionId);

        const now = new Date();
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        try {
            if (action === 'lock') {
                await lockAttemptMutation.mutateAsync({
                    id: examId,
                    attemptId: student.attemptId,
                    reasonCode: 'MANUAL_MONITORING_LOCK',
                    notes: 'Locked from instructor monitoring.',
                });
                return;
            }

            if (action === 'reopen') {
                await reopenAttemptMutation.mutateAsync({
                    id: examId,
                    attemptId: student.attemptId,
                    reopenedUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
                    reasonCode: 'MANUAL_MONITORING_REOPEN',
                    notes: 'Reopened from instructor monitoring for 30 minutes.',
                });
                return;
            }

            if (action === 'reset') {
                await resetAttemptMutation.mutateAsync({
                    id: examId,
                    attemptId: student.attemptId,
                    reasonCode: 'MANUAL_MONITORING_RESET',
                    notes: 'Reset from instructor monitoring.',
                });
                return;
            }

            if (action === 'close') {
                await closeAttemptMutation.mutateAsync({
                    id: examId,
                    attemptId: student.attemptId,
                    reasonCode: 'MANUAL_MONITORING_CLOSE',
                    notes: 'Closed from instructor monitoring.',
                });
                return;
            }

            if (action === 'makeup') {
                await grantMakeupMutation.mutateAsync({
                    id: examId,
                    studentId: student.studentRecordId ?? student.id,
                    availableFrom: now.toISOString(),
                    availableUntil: twentyFourHoursFromNow.toISOString(),
                    allowedAttempts: 1,
                    notes: 'Granted from instructor monitoring.',
                });
                return;
            }

            await grantRetakeMutation.mutateAsync({
                id: examId,
                studentId: student.studentRecordId ?? student.id,
                attemptId: student.attemptId,
                availableFrom: now.toISOString(),
                availableUntil: twentyFourHoursFromNow.toISOString(),
                allowedAttempts: 1,
                notes: 'Granted from instructor monitoring.',
            });
        } finally {
            setActiveLifecycleActionId(null);
        }
    };

    return {
        overridingStudentId,
        activeLifecycleActionId,
        handleOverrideReconnect,
        handleAuthorizeReentry,
        handleLifecycleAction,
    };
}
export type UseLifecycleReturn = ReturnType<typeof useLifecycle>;
