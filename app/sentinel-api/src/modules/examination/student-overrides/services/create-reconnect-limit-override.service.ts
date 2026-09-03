import type { DbClient } from '@sentinel/db';
import type { StudentExamAccessOverride } from '../student-overrides.dto';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import { parseDateValue } from './student-overrides-helpers';
import { createStudentExamAccessOverride } from './create-student-exam-access-override.service';

/**
 * Grants a one-time reconnect-limit override for the student's latest
 * active attempt when the configured limit has been exhausted.
 */
export async function createReconnectLimitOverride(args: {
    dbClient: DbClient;
    examId: string;
    studentId: string;
    reason?: string | null;
    grantedBy?: string | null;
    now?: Date;
    createOverrideFn?: typeof createStudentExamAccessOverride;
}): Promise<StudentExamAccessOverride> {
    const now = args.now ?? new Date();
    const latestAttempt = await StudentOverridesRepository.findLatestAttemptForReconnect(
        args.dbClient,
        args.examId,
        args.studentId,
    );

    if (!latestAttempt || latestAttempt.status !== 'IN_PROGRESS') {
        throw new Error('Reconnect override requires an active in-progress attempt.');
    }

    const reconnectCount = Number(latestAttempt.reconnect_attempt_count ?? 0);
    const maxReconnectAttempts = Number(latestAttempt.max_reconnect_attempts ?? 0);

    if (reconnectCount < maxReconnectAttempts) {
        throw new Error('Reconnect limit has not been reached for this student.');
    }

    const endDateTime = parseDateValue(latestAttempt.end_date_time);
    const fallbackUntil = new Date(now.getTime() + 30 * 60_000);
    const availableUntil =
        endDateTime && endDateTime.getTime() > now.getTime() ? endDateTime : fallbackUntil;

    const createFn = args.createOverrideFn ?? createStudentExamAccessOverride;

    return createFn({
        dbClient: args.dbClient,
        examId: args.examId,
        body: {
            studentId: args.studentId,
            overrideType: 'REOPEN',
            availableFrom: now.toISOString(),
            availableUntil: availableUntil.toISOString(),
            allowedAttempts: 1,
            sourceAttemptId: latestAttempt.attempt_id,
            notes: args.reason?.trim() || 'Reconnect limit override granted by instructor.',
        },
        grantedBy: args.grantedBy ?? null,
    });
}
