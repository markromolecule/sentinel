import type { AttemptGradingDetailType } from '@sentinel/shared';

export type AttemptReportOverrideDrafts = Record<
    string,
    {
        awardedScore: string;
        reason: string;
    }
>;

export function formatAnswerValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'No response';
    }

    if (Array.isArray(value)) {
        return value.join(', ');
    }

    if (typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, entryValue]) => `${key}: ${String(entryValue)}`)
            .join(' | ');
    }

    return String(value);
}

export function normalizeOverrideDrafts(
    itemOverrides: AttemptGradingDetailType['itemOverrides'],
): AttemptReportOverrideDrafts {
    return Object.fromEntries(
        Object.entries(itemOverrides ?? {}).map(([questionId, override]) => [
            questionId,
            {
                awardedScore: String(override.awardedScore),
                reason: override.reason ?? '',
            },
        ]),
    );
}
