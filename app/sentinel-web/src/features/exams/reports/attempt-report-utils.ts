import type { AttemptGradingDetailType, PassageType } from '@sentinel/shared';
import { renderPassage } from '@sentinel/shared';

export type AttemptReportOverrideDrafts = Record<
    string,
    {
        awardedScore: string;
        reason: string;
    }
>;

export function formatAnswerValue(value: unknown) {
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

export function formatCorrectAnswer(value: unknown) {
    if (value === null || value === undefined) {
        return 'Instructor-scored response';
    }

    return formatAnswerValue(value);
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

export function buildOverridePayload(overrideDrafts: AttemptReportOverrideDrafts) {
    return Object.entries(overrideDrafts).reduce<
        NonNullable<AttemptGradingDetailType['itemOverrides']>
    >((acc, [questionId, override]) => {
        const awardedScore = Number(override.awardedScore);

        if (!Number.isFinite(awardedScore)) {
            return acc;
        }

        acc[questionId] = {
            awardedScore,
            reason: override.reason && override.reason.trim() ? override.reason.trim() : null,
        };

        return acc;
    }, {});
}

export function getQuestionPassage(question?: {
    sourceEvidence?: string | null;
    passageContent?: string | null;
    passageType?: PassageType | null;
}) {
    if (!question) {
        return null;
    }

    return renderPassage({
        sourceEvidence: question.sourceEvidence ?? null,
        passageContent: question.passageContent ?? null,
        passageType: question.passageType ?? null,
        fallbackToSourceEvidence: false,
    });
}
