import { HTTPException } from 'hono/http-exception';
import type { CompleteSessionAttemptContext, OwnedSessionAttempt } from './complete-session.types';

function resolveSubmissionLifecycleConflictMessage(lifecycleState?: string | null) {
    if (lifecycleState === 'LOCKED') {
        return 'This exam attempt is locked and cannot be submitted right now.';
    }

    if (lifecycleState === 'SUPERSEDED') {
        return 'This exam attempt was replaced by a newer attempt and can no longer be submitted.';
    }

    return 'This exam attempt has been closed and can no longer be submitted.';
}

export function assertCompletableAttempt(
    attempt: OwnedSessionAttempt | undefined,
): CompleteSessionAttemptContext {
    if (!attempt?.exam_id) {
        throw new HTTPException(404, {
            message: 'Exam session not found for the authenticated student.',
        });
    }

    if (!attempt.student_id) {
        throw new HTTPException(404, {
            message: 'Exam session student record not found.',
        });
    }

    if (attempt.completed_at || attempt.status === 'COMPLETED') {
        throw new HTTPException(409, {
            message: 'This exam session has already been submitted.',
        });
    }

    if (attempt.status !== 'IN_PROGRESS') {
        throw new HTTPException(409, {
            message: 'This exam session is not active anymore.',
        });
    }

    if (
        attempt.lifecycle_state === 'LOCKED' ||
        attempt.lifecycle_state === 'CLOSED' ||
        attempt.lifecycle_state === 'SUPERSEDED'
    ) {
        throw new HTTPException(409, {
            message: resolveSubmissionLifecycleConflictMessage(attempt.lifecycle_state),
        });
    }

    return {
        attempt,
        examId: attempt.exam_id,
        studentId: attempt.student_id,
    };
}

export function assertCompletedAttemptTimestamp(completedAt: Date | string | null): Date | string {
    if (!completedAt) {
        throw new HTTPException(500, {
            message: 'Completed exam attempt is missing its completion timestamp.',
        });
    }

    return completedAt;
}
