import type { DbClient } from '@sentinel/db';
import type { StudentExamAccessOverride } from '../student-overrides.dto';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import { listStudentExamOverrides } from './list-student-exam-overrides.service';

/**
 * Marks an override as used by the supplied attempt.
 */
export async function markOverrideUsed(args: {
    dbClient: DbClient;
    accessOverride: StudentExamAccessOverride;
    attemptId: string;
    updatedBy?: string | null;
}): Promise<StudentExamAccessOverride | null> {
    const overrides = await listStudentExamOverrides({
        dbClient: args.dbClient,
        examId: args.accessOverride.examId,
        studentId: args.accessOverride.studentId,
    });
    const storedOverride = overrides.find((override) => override.id === args.accessOverride.id);

    if (!storedOverride) {
        return null;
    }

    const now = new Date().toISOString();
    const { settingKey, ...persistedValue } = storedOverride;
    const hasUsedAttemptId = storedOverride.usedAttemptIds.includes(args.attemptId);
    const shouldIncrementAttempts =
        storedOverride.overrideType !== 'REOPEN' || !hasUsedAttemptId;
    const nextValue: StudentExamAccessOverride = {
        ...persistedValue,
        usedAttempts: shouldIncrementAttempts
            ? storedOverride.usedAttempts + 1
            : storedOverride.usedAttempts,
        usedAttemptIds: hasUsedAttemptId
            ? storedOverride.usedAttemptIds
            : [...storedOverride.usedAttemptIds, args.attemptId],
        updatedAt: now,
    };

    await StudentOverridesRepository.updateExamOverrideRecord({
        dbClient: args.dbClient,
        settingKey: storedOverride.settingKey,
        payload: nextValue,
        updatedAt: new Date(now),
        updatedBy: args.updatedBy ?? null,
    });

    return nextValue;
}
