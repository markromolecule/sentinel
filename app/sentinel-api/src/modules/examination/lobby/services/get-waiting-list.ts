import { type DbClient } from '@sentinel/db';

/**
 * Returns the lobby waiting list with each student's latest attempt state and
 * the configured reconnect limit for instructor decisions.
 */
export const getWaitingList = async (dbClient: DbClient, examId: string) => {
    const examConfiguration = await dbClient
        .selectFrom('exam_configurations')
        .select('max_reconnect_attempts')
        .where('exam_id', '=', examId)
        .executeTakeFirst();
    const admissions = await dbClient
        .selectFrom('exam_lobby_admissions as ela')
        .leftJoin('students as s', 'ela.student_id', 's.student_id')
        .leftJoin('user_profiles as up', 's.user_id', 'up.user_id')
        .select([
            'ela.admission_id',
            'ela.student_id',
            'ela.status',
            'ela.checked_in_at',
            'ela.decided_at',
            's.student_number',
            'up.first_name',
            'up.last_name',
        ])
        .where('ela.exam_id', '=', examId)
        .orderBy('ela.checked_in_at', 'asc')
        .execute();

    const studentIds = admissions.map((a) => a.student_id);
    let attempts: any[] = [];
    if (studentIds.length > 0) {
        attempts = await dbClient
            .selectFrom('exam_attempts')
            .select(['student_id', 'status', 'created_at', 'reconnect_attempt_count'])
            .where('exam_id', '=', examId)
            .where('student_id', 'in', studentIds)
            .orderBy('created_at', 'desc')
            .execute();
    }

    const attemptByStudent = new Map<string, { status: string | null; reconnectCount: number }>();
    for (const attempt of attempts) {
        if (!attemptByStudent.has(attempt.student_id)) {
            attemptByStudent.set(attempt.student_id, {
                status: attempt.status,
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
            status: a.status ?? 'WAITING',
            checkedInAt: a.checked_in_at?.toISOString() ?? null,
            decidedAt: a.decided_at?.toISOString() ?? null,
            hasActiveAttempt: attemptStatus === 'IN_PROGRESS',
            attemptStatus: attemptStatus,
            reconnectCount: attempt?.reconnectCount ?? 0,
            maxReconnectAttempts: Number(examConfiguration?.max_reconnect_attempts ?? 0),
        };
    });
};
