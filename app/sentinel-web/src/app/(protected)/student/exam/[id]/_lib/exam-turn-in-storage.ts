import type {
    ExamAttemptAnswers,
    ExamConfiguration,
    ExamAttemptScoreSummary,
} from '@sentinel/shared/types';

const EXAM_TURN_IN_STORAGE_PREFIX = 'sentinel-web:exam-turn-in-preview';

export type StoredExamTurnInPreviewSummary = Omit<
    ExamAttemptScoreSummary,
    'score' | 'totalScore' | 'percentage'
> & {
    score: number | null;
    totalScore: number | null;
    percentage: number | null;
};

export type StoredExamTurnInPreview = {
    examId: string;
    sessionId: string;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
    preparationToken?: string;
    releaseScoreMode: NonNullable<ExamConfiguration['releaseScoreMode']>;
    scoreVisible: boolean;
    summary: StoredExamTurnInPreviewSummary;
    storedAt: string;
};

function buildExamTurnInStorageKey(examId: string) {
    return `${EXAM_TURN_IN_STORAGE_PREFIX}:${examId}`;
}

function isPreviewSummary(value: unknown): value is StoredExamTurnInPreviewSummary {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const summary = value as Record<string, unknown>;

    return (
        typeof summary.answeredCount === 'number' &&
        typeof summary.autoGradableQuestionCount === 'number' &&
        typeof summary.manualReviewQuestionCount === 'number' &&
        typeof summary.requiresManualReview === 'boolean'
    );
}

export function readStoredExamTurnInPreview(examId: string): StoredExamTurnInPreview | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const rawValue = window.sessionStorage.getItem(buildExamTurnInStorageKey(examId));

    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue) as unknown;

        if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
            window.sessionStorage.removeItem(buildExamTurnInStorageKey(examId));
            return null;
        }

        const record = parsedValue as Record<string, unknown>;

        if (
            typeof record.examId !== 'string' ||
            typeof record.sessionId !== 'string' ||
            typeof record.elapsedSeconds !== 'number' ||
            !isPreviewSummary(record.summary)
        ) {
            window.sessionStorage.removeItem(buildExamTurnInStorageKey(examId));
            return null;
        }

        const legacySummary = record.summary as Record<string, unknown>;

        return {
            examId: record.examId,
            sessionId: record.sessionId,
            answers: (record.answers as ExamAttemptAnswers) ?? {},
            elapsedSeconds: record.elapsedSeconds,
            preparationToken:
                typeof record.preparationToken === 'string' ? record.preparationToken : undefined,
            releaseScoreMode:
                record.releaseScoreMode === 'MANUAL_RELEASE' ? 'MANUAL_RELEASE' : 'AUTO_RELEASE',
            scoreVisible:
                typeof record.scoreVisible === 'boolean'
                    ? record.scoreVisible
                    : typeof legacySummary.score === 'number' &&
                      typeof legacySummary.totalScore === 'number',
            summary: {
                score: typeof legacySummary.score === 'number' ? legacySummary.score : null,
                totalScore:
                    typeof legacySummary.totalScore === 'number' ? legacySummary.totalScore : null,
                percentage:
                    typeof legacySummary.percentage === 'number' ? legacySummary.percentage : null,
                answeredCount: legacySummary.answeredCount as number,
                autoGradableQuestionCount: legacySummary.autoGradableQuestionCount as number,
                manualReviewQuestionCount: legacySummary.manualReviewQuestionCount as number,
                requiresManualReview: legacySummary.requiresManualReview as boolean,
            },
            storedAt:
                typeof record.storedAt === 'string' ? record.storedAt : new Date().toISOString(),
        };
    } catch {
        window.sessionStorage.removeItem(buildExamTurnInStorageKey(examId));
        return null;
    }
}

export function writeStoredExamTurnInPreview(preview: StoredExamTurnInPreview) {
    if (typeof window === 'undefined') {
        return preview;
    }

    window.sessionStorage.setItem(
        buildExamTurnInStorageKey(preview.examId),
        JSON.stringify(preview),
    );

    return preview;
}

export function clearStoredExamTurnInPreview(examId: string) {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(buildExamTurnInStorageKey(examId));
}
