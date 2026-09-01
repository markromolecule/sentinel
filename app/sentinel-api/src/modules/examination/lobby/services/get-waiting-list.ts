import { type DbClient } from '@sentinel/db';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import { sql } from 'kysely';

type AttemptRecord = {
    student_id: string | null;
    status: string | null;
    lifecycle_state: string | null;
    reconnect_attempt_count: number | null;
};

/**
 * Returns the lobby waiting list for an exam, including each student's latest
 * attempt state and the effective reconnect limit for instructor decisions.
 *
 * When `exam_configurations.max_reconnect_attempts` is null or unconfigured,
 * falls back to the global default (`DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts`)
 * so the instructor sees the correct limit in the waiting list row.
 *
 * @param dbClient - Kysely database client.
 * @param examId - UUID of the exam whose lobby waiting list is requested.
 * @returns Ordered lobby admission list with attempt state and reconnect metadata.
 */
export const getWaitingList = async (dbClient: DbClient, examId: string) => {
    const [examConfiguration, admissions] = await Promise.all([
        dbClient
            .selectFrom('exam_configurations')
            .select('max_reconnect_attempts')
            .where('exam_id', '=', examId)
            .executeTakeFirst(),
        dbClient
            .selectFrom('exam_lobby_admissions as ela')
            .leftJoin('students as s', 'ela.student_id', 's.student_id')
            .leftJoin('user_profiles as up', 's.user_id', 'up.user_id')
            .leftJoin('auth.users as au', 's.user_id', 'au.id')
            .select([
                'ela.admission_id',
                'ela.student_id',
                'ela.status',
                'ela.checked_in_at',
                'ela.decided_at',
                's.student_number',
                'up.first_name',
                'up.last_name',
                sql<string | null>`coalesce(
                    up.avatar_url,
                    au.raw_user_meta_data->>'avatar_url',
                    au.raw_user_meta_data->>'picture'
                )`.as('avatarUrl'),
            ])
            .where('ela.exam_id', '=', examId)
            .orderBy('ela.checked_in_at', 'asc')
            .execute(),
    ]);

    const studentIds = admissions.map((a) => a.student_id);
    let attempts: AttemptRecord[] = [];
    if (studentIds.length > 0) {
        attempts = await dbClient
            .selectFrom('exam_attempts')
            .select([
                'student_id',
                'status',
                'lifecycle_state',
                'created_at',
                'reconnect_attempt_count',
            ])
            .where('exam_id', '=', examId)
            .where('student_id', 'in', studentIds)
            .orderBy('created_at', 'desc')
            .execute();
    }

    const attemptByStudent = new Map<string, { status: string | null; reconnectCount: number }>();
    for (const attempt of attempts) {
        if (attempt.student_id && !attemptByStudent.has(attempt.student_id)) {
            const isSubmitted =
                attempt.status === 'COMPLETED' || attempt.lifecycle_state === 'SUBMITTED';
            const normalizedStatus = isSubmitted ? 'SUBMITTED' : attempt.status;

            attemptByStudent.set(attempt.student_id, {
                status: normalizedStatus,
                reconnectCount: Number(attempt.reconnect_attempt_count ?? 0),
            });
        }
    }

    return admissions.map((a) => {
        const attempt = attemptByStudent.get(a.student_id);
        const attemptStatus = attempt?.status ?? null;
        return {
            admissionId: a.admission_id,
            studentId: a.student_id,
            studentName: `${a.first_name ?? 'Unknown'} ${a.last_name ?? 'Student'}`,
            studentNumber: a.student_number ?? null,
            avatarUrl: a.avatarUrl ?? null,
            status: a.status ?? 'WAITING',
            checkedInAt: a.checked_in_at?.toISOString() ?? null,
            decidedAt: a.decided_at?.toISOString() ?? null,
            hasActiveAttempt: attemptStatus === 'IN_PROGRESS',
            attemptStatus: attemptStatus,
            reconnectCount: attempt?.reconnectCount ?? 0,
            maxReconnectAttempts:
                examConfiguration?.max_reconnect_attempts ??
                DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts,
        };
    });
};
