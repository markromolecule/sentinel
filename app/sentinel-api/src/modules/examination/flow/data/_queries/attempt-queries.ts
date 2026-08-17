import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';

/**
 * Finds the latest non-superseded exam attempt for a student in an exam.
 * Used to determine whether to resume or create a fresh session.
 */
export async function findExistingAttempt(
    db: DbClient,
    examId: string,
    studentId: string,
    lockForUpdate = false,
) {
    const query = db
        .selectFrom('exam_attempts as ea')
        .innerJoin('exams as e', 'e.exam_id', 'ea.exam_id')
        .select([
            'ea.attempt_id',
            'ea.completed_at',
            'ea.status',
            'ea.created_at',
            'ea.answer_snapshot',
            'ea.assessment_snapshot',
            'ea.time_spent_minutes',
            'ea.reconnect_attempt_count',
            'ea.last_reconnect_request_id',
            'ea.last_synced_at',
            'ea.lifecycle_state',
            'ea.reopened_until',
        ])
        .where('ea.exam_id', '=', examId)
        .where('ea.student_id', '=', studentId)
        .where((eb) =>
            eb.or([
                eb('e.published_at', 'is', null),
                sql<boolean>`coalesce(ea.started_at, ea.created_at) >= e.published_at`,
            ]),
        )
        .where((eb) =>
            eb.or([
                eb('ea.lifecycle_state', 'is', null),
                eb('ea.lifecycle_state', '!=', 'SUPERSEDED'),
            ]),
        )
        .orderBy('ea.created_at', 'desc');

    return await (lockForUpdate ? query.forUpdate('ea') : query).executeTakeFirst();
}

/**
 * Counts all attempts a student has submitted for an exam (across the published window).
 * Used to enforce the per-session cap before creating a new attempt row.
 */
export async function countAttempts(db: DbClient, examId: string, studentId: string) {
    const row = await db
        .selectFrom('exam_attempts as ea')
        .innerJoin('exams as e', 'e.exam_id', 'ea.exam_id')
        .select((eb) => eb.fn.countAll<string>().as('attempt_count'))
        .where('ea.exam_id', '=', examId)
        .where('ea.student_id', '=', studentId)
        .where((eb) =>
            eb.or([
                eb('e.published_at', 'is', null),
                sql<boolean>`coalesce(ea.started_at, ea.created_at) >= e.published_at`,
            ]),
        )
        .executeTakeFirst();

    return Number(row?.attempt_count ?? 0);
}

/**
 * Fetches a single attempt row that is owned by the given student user.
 * Used by the session access guard to verify the student owns the session being requested.
 */
export async function findOwnedAttempt(db: DbClient, sessionId: string, studentUserId: string) {
    return await db
        .selectFrom('exam_attempts as ea')
        .innerJoin('students as st', 'st.student_id', 'ea.student_id')
        .select([
            'ea.attempt_id',
            'ea.exam_id',
            'ea.student_id',
            'ea.completed_at',
            'ea.status',
            'ea.started_at',
            'ea.lifecycle_state',
            'ea.closed_reason',
            'ea.closed_at',
            'ea.lifecycle_reason',
            'ea.initial_score',
            'ea.assessment_snapshot',
            'ea.score_snapshot',
            'ea.scoring_version',
            'st.institution_id',
        ])
        .where('ea.attempt_id', '=', sessionId)
        .where('st.user_id', '=', studentUserId)
        .executeTakeFirst();
}
