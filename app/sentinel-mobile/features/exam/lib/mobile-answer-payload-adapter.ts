import { scoreExamAttempt } from '@sentinel/shared';
import type {
    ExamAttemptAnswers,
    ExamAttemptScoreSummary,
    ExamQuestion,
} from '@sentinel/shared/types';
import type { MobileSessionQuestion } from './mobile-exam-adapter.types';

/**
 * Builds the answer payload for the API submission from the current in-session
 * answer state. Supports single-value (string option ID/text), multi-select
 * (JSON arrays), arrays (fill blanks/enumeration), objects (matching), and text.
 */
export function buildSessionAnswerPayload(
    questions: MobileSessionQuestion[],
    selectedOptionIds: Record<string, any>,
): ExamAttemptAnswers {
    const answerEntries = questions.flatMap((question) => {
        const raw = selectedOptionIds[question.id];

        if (raw === undefined || raw === null || raw === '') {
            return [];
        }

        // Multi-select answers (MULTIPLE_RESPONSE) or Array answers (FILL_BLANK / ENUMERATION)
        if (Array.isArray(raw)) {
            if (raw.length === 0) return [];
            if (question.type === 'MULTIPLE_RESPONSE' && question.options.length > 0) {
                const texts = raw
                    .map((id) => question.options.find((o) => o.id === id || o.text === id)?.text ?? id)
                    .filter(Boolean) as string[];
                return [[question.id, JSON.stringify(texts)] as const];
            }
            return [[question.id, JSON.stringify(raw)] as const];
        }

        // Object answers (MATCHING)
        if (typeof raw === 'object') {
            return [[question.id, JSON.stringify(raw)] as const];
        }

        // TRUE_FALSE: stored as literal 'true' / 'false' id
        if (question.type === 'TRUE_FALSE') {
            return [[question.id, String(raw).toLowerCase()] as const];
        }

        // Text-based answers (ESSAY, IDENTIFICATION, etc.) are stored verbatim.
        if (question.options.length === 0) {
            return [[question.id, String(raw)] as const];
        }

        // Single-choice: resolve option id → text
        const selectedOption = question.options.find((option) => option.id === raw || option.text === raw);

        if (!selectedOption) {
            return [[question.id, String(raw)] as const];
        }

        return [[question.id, selectedOption.text] as const];
    });

    return Object.fromEntries(answerEntries);
}

export function buildExamResultPreview(args: {
    questions: MobileSessionQuestion[];
    answers: Record<string, any>;
    elapsedSeconds: number;
    sessionId: string;
}): {
    summary: ExamAttemptScoreSummary;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
    sessionId: string;
} {
    const answerPayload = buildSessionAnswerPayload(args.questions, args.answers);

    // Use shared scoring logic
    const summary = scoreExamAttempt({
        questions: args.questions.map((q) => ({
            id: q.id,
            type: q.type,
            points: q.points,
            content: q.originalContent,
        })) as unknown as ExamQuestion[],
        answers: answerPayload,
    });

    return {
        summary,
        answers: answerPayload,
        elapsedSeconds: args.elapsedSeconds,
        sessionId: args.sessionId,
    };
}
