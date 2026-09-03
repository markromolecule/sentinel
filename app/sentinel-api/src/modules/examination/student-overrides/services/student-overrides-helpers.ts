import { Schema } from '@sentinel/shared';
import type { StudentExamAccessOverride } from '../student-overrides.dto';

export type StoredStudentExamAccessOverride = StudentExamAccessOverride & {
    settingKey: string;
};

export function parseOverrideRecord(record: {
    setting_key: string;
    setting_value: unknown;
    created_at?: Date | string | null;
    updated_at?: Date | string | null;
}): StoredStudentExamAccessOverride | null {
    const parsed = Schema.studentExamAccessOverrideSchema.safeParse(record.setting_value);

    if (!parsed.success) {
        return null;
    }

    return {
        ...parsed.data,
        createdAt: parsed.data.createdAt ?? record.created_at ?? null,
        updatedAt: parsed.data.updatedAt ?? record.updated_at ?? null,
        settingKey: record.setting_key,
    } as StoredStudentExamAccessOverride;
}

export function parseDateValue(value?: string | Date | null): Date | null {
    if (!value) {
        return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(value?: string | Date | null): string | null {
    const parsed = parseDateValue(value);
    return parsed ? parsed.toISOString() : null;
}

export function compareOverrideFreshness(
    left: Pick<StoredStudentExamAccessOverride, 'updatedAt' | 'createdAt' | 'availableUntil'>,
    right: Pick<StoredStudentExamAccessOverride, 'updatedAt' | 'createdAt' | 'availableUntil'>,
): number {
    const leftUpdatedAt =
        parseDateValue(left.updatedAt)?.getTime() ??
        parseDateValue(left.createdAt)?.getTime() ??
        parseDateValue(left.availableUntil)?.getTime() ??
        0;
    const rightUpdatedAt =
        parseDateValue(right.updatedAt)?.getTime() ??
        parseDateValue(right.createdAt)?.getTime() ??
        parseDateValue(right.availableUntil)?.getTime() ??
        0;

    return rightUpdatedAt - leftUpdatedAt;
}

export function isActiveOverride(override: StudentExamAccessOverride, now: Date): boolean {
    const availableFrom = parseDateValue(override.availableFrom);
    const availableUntil = parseDateValue(override.availableUntil);

    if (!availableFrom || !availableUntil) {
        return false;
    }

    if (override.usedAttempts >= override.allowedAttempts) {
        return false;
    }

    return availableFrom.getTime() <= now.getTime() && availableUntil.getTime() >= now.getTime();
}

export function isPendingOrActiveOverride(override: StudentExamAccessOverride, now: Date): boolean {
    const availableUntil = parseDateValue(override.availableUntil);

    if (!availableUntil) {
        return false;
    }

    if (override.usedAttempts >= override.allowedAttempts) {
        return false;
    }

    return availableUntil.getTime() >= now.getTime();
}

export function normalizeSourceAttemptId(args: {
    overrideType: StudentExamAccessOverride['overrideType'];
    sourceAttemptId?: string | null;
}): string | null {
    if (
        (args.overrideType === 'RETAKE' || args.overrideType === 'REOPEN') &&
        args.sourceAttemptId
    ) {
        return args.sourceAttemptId;
    }

    return null;
}
