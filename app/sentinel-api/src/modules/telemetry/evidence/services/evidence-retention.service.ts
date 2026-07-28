import { type DbClient } from '@sentinel/db';
import { getEvidenceRetentionDays } from '../evidence.constants';

type EvidenceRetentionInputs = {
    capturedAt: Date;
    examEndsAt?: Date | null;
    attemptStartedAt?: Date | null;
    attemptCompletedAt?: Date | null;
};

export function computeEvidenceExpiresAt({
    capturedAt,
    examEndsAt,
    attemptStartedAt,
    attemptCompletedAt,
}: EvidenceRetentionInputs) {
    const candidates = [
        capturedAt,
        examEndsAt ?? null,
        attemptStartedAt ?? null,
        attemptCompletedAt ?? null,
    ].filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));

    const baseDate = new Date(Math.max(...candidates.map((value) => value.getTime())));

    return new Date(baseDate.getTime() + getEvidenceRetentionDays() * 24 * 60 * 60 * 1000);
}

export async function loadEvidenceRetentionContext(
    db: DbClient,
    attemptId: string,
): Promise<{
    examEndsAt: Date | null;
    attemptStartedAt: Date | null;
    attemptCompletedAt: Date | null;
}> {
    const row = await db
        .selectFrom('exam_attempts as ea')
        .innerJoin('exams as e', 'e.exam_id', 'ea.exam_id')
        .select(['e.end_date_time', 'ea.started_at', 'ea.completed_at'])
        .where('ea.attempt_id', '=', attemptId)
        .executeTakeFirst();

    return {
        examEndsAt: row?.end_date_time ? new Date(row.end_date_time) : null,
        attemptStartedAt: row?.started_at ? new Date(row.started_at) : null,
        attemptCompletedAt: row?.completed_at ? new Date(row.completed_at) : null,
    };
}
