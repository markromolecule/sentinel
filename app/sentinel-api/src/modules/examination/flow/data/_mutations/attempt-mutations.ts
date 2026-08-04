import { type DbClient } from '@sentinel/db';
import type { AttemptAssessmentSnapshot, AttemptScoreSnapshot } from '@sentinel/shared';
import type { ExamAttemptAnswers } from '@sentinel/shared/types';

// ---------------------------------------------------------------------------
// Insert
// ---------------------------------------------------------------------------

/**
 * Inserts a brand-new IN_PROGRESS attempt row for a student.
 * Returns the generated attempt_id or undefined if the insert fails.
 */
export async function insertNewAttempt(db: DbClient, examId: string, studentId: string) {
    return await db
        .insertInto('exam_attempts')
        .values({
            exam_id: examId,
            student_id: studentId,
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            started_at: new Date(),
            created_at: new Date(),
            time_spent_minutes: 0,
            reconnect_attempt_count: 0,
            is_verified: false,
        })
        .returning('attempt_id')
        .executeTakeFirst();
}

// ---------------------------------------------------------------------------
// Update – resume
// ---------------------------------------------------------------------------

/**
 * Updates reconnect counters and lifecycle state when a student resumes an existing attempt.
 */
export async function updateResumedAttempt(
    db: DbClient,
    attemptId: string,
    nextReconnectCount: number,
    resumeRequestId: string | null | undefined,
    existingReconnectRequestId: string | null | undefined,
) {
    return await db
        .updateTable('exam_attempts')
        .set({
            reconnect_attempt_count: nextReconnectCount,
            last_reconnect_request_id: resumeRequestId ?? existingReconnectRequestId,
            lifecycle_state: 'IN_PROGRESS',
        })
        .where('attempt_id', '=', attemptId)
        .execute();
}

// ---------------------------------------------------------------------------
// Update – complete
// ---------------------------------------------------------------------------

/**
 * Marks an attempt as fully completed, writing the final score and answer snapshot.
 */
export async function completeAttempt(
    db: DbClient,
    args: {
        sessionId: string;
        score: number;
        initialScore: number;
        totalScore: number;
        timeSpentMinutes: number;
        answeredCount: number;
        answers: ExamAttemptAnswers;
        scoreSnapshot: AttemptScoreSnapshot;
        scoringVersion: string;
    },
) {
    return await db
        .updateTable('exam_attempts')
        .set({
            score: args.score,
            initial_score: args.initialScore,
            total_score: args.totalScore,
            time_spent_minutes: args.timeSpentMinutes,
            answered_question_count: args.answeredCount,
            answer_snapshot: args.answers as unknown,
            score_snapshot: args.scoreSnapshot as unknown,
            scoring_version: args.scoringVersion,
            last_synced_at: new Date(),
            completed_at: new Date(),
            status: 'COMPLETED',
            lifecycle_state: 'SUBMITTED',
            score_state: 'DRAFT',
        })
        .where('attempt_id', '=', args.sessionId)
        .where('status', '=', 'IN_PROGRESS')
        .where('completed_at', 'is', null)
        .where('score_snapshot', 'is', null)
        .returning(['attempt_id', 'completed_at'])
        .executeTakeFirst();
}

export async function persistAttemptAssessmentSnapshot(
    db: DbClient,
    args: {
        attemptId: string;
        snapshot: AttemptAssessmentSnapshot;
    },
) {
    return await db
        .updateTable('exam_attempts')
        .set({
            assessment_snapshot: args.snapshot as unknown,
        })
        .where('attempt_id', '=', args.attemptId)
        .where('assessment_snapshot', 'is', null)
        .execute();
}

// ---------------------------------------------------------------------------
// Update – sync progress
// ---------------------------------------------------------------------------

/**
 * Persists in-progress answer/time sync without marking the attempt as complete.
 *
 * Guards with `status = IN_PROGRESS`, `completed_at IS NULL`, and
 * `lifecycle_state = IN_PROGRESS` so a concurrent closure or submission cannot
 * be followed by a successful progress overwrite.
 *
 * @returns The number of rows actually updated.  A value of `0` means the
 *   attempt was already closed/submitted and the write was silently skipped.
 */
export async function syncAttemptProgress(
    db: DbClient,
    args: {
        sessionId: string;
        answeredCount: number;
        timeSpentMinutes: number;
        answers?: ExamAttemptAnswers;
    },
) {
    const updateValues: {
        answered_question_count: number;
        time_spent_minutes: number;
        answer_snapshot?: unknown;
        last_synced_at: Date;
    } = {
        answered_question_count: args.answeredCount,
        time_spent_minutes: args.timeSpentMinutes,
        last_synced_at: new Date(),
    };

    if (args.answers) {
        updateValues.answer_snapshot = args.answers as unknown;
    }

    const result = await db
        .updateTable('exam_attempts')
        .set(updateValues)
        .where('attempt_id', '=', args.sessionId)
        .where('status', '=', 'IN_PROGRESS')
        .where('completed_at', 'is', null)
        .where('lifecycle_state', '=', 'IN_PROGRESS')
        .executeTakeFirst();

    return Number(result?.numUpdatedRows ?? 0);
}
