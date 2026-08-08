import { executeTransaction, type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { ExamAttemptAnswers } from '@sentinel/shared/types';
import type { StudentExamAccessOverride } from '../../../student-overrides/student-overrides.dto';
import { StudentOverridesService } from '../../../student-overrides/student-overrides.service';
import { findExistingAttempt, countAttempts } from '../_queries/attempt-queries';
import { findRemediationSchedule } from '../_queries/remediation-queries';
import { insertNewAttempt, updateResumedAttempt } from '../_mutations/attempt-mutations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateSessionArgs = {
    studentId: string;
    examId: string;
    maxReconnectAttempts: number;
    accessOverride?: StudentExamAccessOverride | null;
    updatedBy?: string | null;
    resumeRequestId?: string | null;
};

export type CreateSessionResult =
    | {
          sessionId: string;
          isResumed: false;
          reconnectAttemptCount: number;
          maxReconnectAttempts: number;
      }
    | {
          sessionId: string;
          isResumed: true;
          answers: ExamAttemptAnswers;
          elapsedSeconds: number;
          reconnectAttemptCount: number;
          maxReconnectAttempts: number;
      }
    | {
          attemptId: string;
          error: string;
          errorCode: 'ATTEMPT_ALREADY_COMPLETED';
      };

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full create-or-resume session flow:
 *   1. Detects whether the exam is a remediation type (to allow overrides).
 *   2. Looks for an existing in-progress or locked attempt.
 *   3. If resumable → bumps reconnect counters and returns the saved answers.
 *   4. If already completed → returns a typed error (no exception).
 *   5. Otherwise → creates a fresh attempt row.
 *
 * Throws an HTTPException(403) when reconnect limits are exceeded without a valid override.
 */
export async function executeCreateSession(
    db: DbClient,
    args: CreateSessionArgs,
): Promise<CreateSessionResult> {
    const { studentId, examId, maxReconnectAttempts, accessOverride, resumeRequestId } = args;

    // ── Determine attempt override policy ─────────────────────────────────────
    const remediationSchedule = await findRemediationSchedule(db, examId);
    const isRemediationExam = Boolean(remediationSchedule);
    const isFreshAttemptOverride =
        !isRemediationExam &&
        (accessOverride?.overrideType === 'MAKEUP' || accessOverride?.overrideType === 'RETAKE');

    // ── Find existing attempt ─────────────────────────────────────────────────
    const existingAttempt = await findExistingAttempt(db, examId, studentId);

    if (
        (existingAttempt?.completed_at || existingAttempt?.status === 'COMPLETED') &&
        !isFreshAttemptOverride
    ) {
        return {
            attemptId: existingAttempt.attempt_id,
            error: 'This exam has already been turned in.',
            errorCode: 'ATTEMPT_ALREADY_COMPLETED',
        };
    }

    // ── Evaluate resume eligibility ───────────────────────────────────────────
    const reopenedUntil = existingAttempt?.reopened_until
        ? new Date(existingAttempt.reopened_until)
        : null;
    const hasActiveReopenWindow = Boolean(
        reopenedUntil && !Number.isNaN(reopenedUntil.getTime()) && reopenedUntil >= new Date(),
    );
    const canResumeLockedAttempt =
        (existingAttempt?.lifecycle_state === 'LOCKED' ||
            existingAttempt?.lifecycle_state === 'CLOSED') &&
        (hasActiveReopenWindow ||
            (accessOverride?.overrideType === 'REOPEN' &&
                accessOverride.sourceAttemptId === existingAttempt.attempt_id));
    const canResumeSameAttempt =
        existingAttempt?.status === 'IN_PROGRESS' &&
        (existingAttempt.lifecycle_state === 'IN_PROGRESS' || canResumeLockedAttempt);

    if (canResumeSameAttempt) {
        return await handleResume(db, {
            studentId,
            examId,
            existingAttempt,
            maxReconnectAttempts,
            accessOverride,
            updatedBy: args.updatedBy,
            resumeRequestId,
        });
    }

    // ── Create fresh attempt ──────────────────────────────────────────────────
    return await handleFreshAttempt(db, {
        examId,
        studentId,
        maxReconnectAttempts,
        isFreshAttemptOverride,
        accessOverride,
        updatedBy: args.updatedBy,
    });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function handleResume(
    db: DbClient,
    args: {
        studentId: string;
        examId: string;
        existingAttempt: NonNullable<Awaited<ReturnType<typeof findExistingAttempt>>>;
        maxReconnectAttempts: number;
        accessOverride?: StudentExamAccessOverride | null;
        updatedBy?: string | null;
        resumeRequestId?: string | null;
    },
): Promise<CreateSessionResult> {
    const { studentId, examId, maxReconnectAttempts, accessOverride, resumeRequestId } = args;

    if (!resumeRequestId) {
        throw new HTTPException(400, {
            message: 'A resume request ID is required to resume an active exam session.',
        });
    }

    // The fallback keeps lightweight repository mocks usable. Production uses
    // Prisma's transaction bridge because prisma-extension-kysely does not
    // support native Kysely transactions.
    if (typeof db.transaction !== 'function') {
        return resumeLockedAttempt(db, {
            existingAttempt: args.existingAttempt,
            maxReconnectAttempts,
            accessOverride,
            updatedBy: args.updatedBy,
            resumeRequestId,
        });
    }

    return await executeTransaction(async (tx) => {
        const existingAttempt = await findExistingAttempt(tx, examId, studentId, true);

        if (!existingAttempt) {
            throw new HTTPException(409, {
                message: 'The active exam session is no longer available to resume.',
            });
        }

        return resumeLockedAttempt(tx, {
            existingAttempt,
            maxReconnectAttempts,
            accessOverride,
            updatedBy: args.updatedBy,
            resumeRequestId,
        });
    });
}

/**
 * Validates and executes the resume of an existing attempt, handling reconnect
 * counting, idempotency checks, and override marking.
 *
 * Allows resumption when the attempt's `lifecycle_state` is `IN_PROGRESS`,
 * `LOCKED`, or `CLOSED` (the latter two only when a valid `REOPEN` override or
 * an active `reopened_until` window is present).
 *
 * Throws HTTP 409 if the attempt is already completed, or HTTP 403 if the
 * session is no longer resumable or reconnect limits are exceeded.
 *
 * @param db - Kysely database client.
 * @param args - Resume parameters including existing attempt, reconnect limit,
 *   access override, and the idempotency resume request ID.
 * @returns A `CreateSessionResult` with `isResumed: true` on success.
 */
async function resumeLockedAttempt(
    db: DbClient,
    args: {
        existingAttempt: NonNullable<Awaited<ReturnType<typeof findExistingAttempt>>>;
        maxReconnectAttempts: number;
        accessOverride?: StudentExamAccessOverride | null;
        updatedBy?: string | null;
        resumeRequestId: string;
    },
): Promise<CreateSessionResult> {
    const { existingAttempt, maxReconnectAttempts, accessOverride, resumeRequestId } = args;

    if (existingAttempt.completed_at || existingAttempt.status === 'COMPLETED') {
        throw new HTTPException(409, {
            message: 'This exam has already been turned in.',
        });
    }

    const reopenedUntil = existingAttempt.reopened_until
        ? new Date(existingAttempt.reopened_until)
        : null;
    const hasActiveReopenWindow = Boolean(
        reopenedUntil && !Number.isNaN(reopenedUntil.getTime()) && reopenedUntil >= new Date(),
    );
    const canResumeLockedAttempt =
        (existingAttempt.lifecycle_state === 'LOCKED' ||
            existingAttempt.lifecycle_state === 'CLOSED') &&
        (hasActiveReopenWindow ||
            (accessOverride?.overrideType === 'REOPEN' &&
                accessOverride.sourceAttemptId === existingAttempt.attempt_id));
    const canResumeAttempt =
        existingAttempt.status === 'IN_PROGRESS' &&
        (existingAttempt.lifecycle_state === 'IN_PROGRESS' || canResumeLockedAttempt);

    if (!canResumeAttempt) {
        throw new HTTPException(403, {
            message: 'This exam session is no longer available to resume.',
        });
    }

    const reconnectAttemptCount = Number(existingAttempt.reconnect_attempt_count ?? 0);

    const isIdempotentResume = existingAttempt.last_reconnect_request_id === resumeRequestId;

    if (!accessOverride && !isIdempotentResume && reconnectAttemptCount >= maxReconnectAttempts) {
        throw new HTTPException(403, {
            message: 'Maximum reconnect attempts reached for this exam session.',
        });
    }

    const nextReconnectAttemptCount =
        accessOverride || isIdempotentResume ? reconnectAttemptCount : reconnectAttemptCount + 1;

    if (!isIdempotentResume) {
        await updateResumedAttempt(
            db,
            existingAttempt.attempt_id,
            nextReconnectAttemptCount,
            resumeRequestId,
            existingAttempt.last_reconnect_request_id,
        );
    }

    if (accessOverride && !isIdempotentResume) {
        await StudentOverridesService.markOverrideUsed({
            dbClient: db,
            accessOverride,
            attemptId: existingAttempt.attempt_id,
            updatedBy: args.updatedBy ?? null,
        });
    }

    return {
        sessionId: existingAttempt.attempt_id,
        isResumed: true,
        answers: (existingAttempt.answer_snapshot ?? {}) as ExamAttemptAnswers,
        elapsedSeconds: Math.max(0, Number(existingAttempt.time_spent_minutes ?? 0) * 60),
        reconnectAttemptCount: nextReconnectAttemptCount,
        maxReconnectAttempts,
    };
}

async function handleFreshAttempt(
    db: DbClient,
    args: {
        examId: string;
        studentId: string;
        maxReconnectAttempts: number;
        isFreshAttemptOverride: boolean;
        accessOverride?: StudentExamAccessOverride | null;
        updatedBy?: string | null;
    },
): Promise<CreateSessionResult> {
    const { examId, studentId, maxReconnectAttempts, isFreshAttemptOverride, accessOverride } =
        args;

    const attemptCount = await countAttempts(db, examId, studentId);
    const maxSessionsAllowed = Math.max(1, maxReconnectAttempts + 1);

    if (!isFreshAttemptOverride && attemptCount >= maxSessionsAllowed) {
        throw new HTTPException(403, {
            message: 'Maximum reconnect attempts reached for this exam session.',
        });
    }

    const createdAttempt = await insertNewAttempt(db, examId, studentId);

    if (!createdAttempt) {
        throw new Error('Failed to initialize exam session.');
    }

    if (accessOverride) {
        await StudentOverridesService.markOverrideUsed({
            dbClient: db,
            accessOverride,
            attemptId: createdAttempt.attempt_id,
            updatedBy: args.updatedBy ?? null,
        });
    }

    return {
        sessionId: createdAttempt.attempt_id,
        isResumed: false,
        reconnectAttemptCount: 0,
        maxReconnectAttempts,
    };
}
