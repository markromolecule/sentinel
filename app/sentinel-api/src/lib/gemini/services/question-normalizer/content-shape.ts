import { Schema } from '@sentinel/shared';
import { z } from 'zod';
import { coerceBoolean, coerceString, coerceStringArray } from './coercion';

const CHOICE_LABEL_PREFIX_REGEX = /^\s*\(?([A-Z])\)?(?:\s*[\.\):-]|\s+-)\s*/i;

/**
 * Removes a generated leading choice label such as `A.`, `B)`, `(C)`, or `D -`.
 */
export function stripChoiceLabelPrefix(value: string): string {
    return value.replace(CHOICE_LABEL_PREFIX_REGEX, '').trim();
}

function extractChoiceLabel(value: string): string | null {
    const match = value.match(CHOICE_LABEL_PREFIX_REGEX);
    return match?.[1]?.toUpperCase() ?? null;
}

function normalizeChoiceOption(option: string): string {
    return stripChoiceLabelPrefix(option).trim();
}

function normalizeChoiceComparison(value: string): string {
    return normalizeChoiceOption(value)
        .normalize('NFKC')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, ' ')
        .replace(/^(['"])(.*)\1$/, '$2')
        .replace(/[.!?]+$/, '')
        .trim()
        .toLocaleLowerCase();
}

function resolveExplicitChoiceIndex(answer: string, optionCount: number): number | null {
    const normalizedAnswer = answer.trim();
    const letterMatch =
        normalizedAnswer.match(/^(?:option|choice|answer)\s+([A-Z])(?:\b|[\s.):-])/i) ??
        normalizedAnswer.match(/^\(?([A-Z])\)?(?:\s*[.):-])?\s*$/i);

    if (letterMatch) {
        const optionIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        return optionIndex >= 0 && optionIndex < optionCount ? optionIndex : null;
    }

    const numberMatch = normalizedAnswer.match(
        /^(?:option|choice|answer)\s+#?\s*(\d+)(?:\b|[\s.):-])/i,
    );
    if (numberMatch) {
        const optionIndex = Number(numberMatch[1]) - 1;
        return optionIndex >= 0 && optionIndex < optionCount ? optionIndex : null;
    }

    return null;
}

function resolveChoiceAnswerValue(answer: string, options?: string[]): string {
    const normalizedAnswer = normalizeChoiceOption(answer);

    if (!options?.length) {
        return normalizedAnswer;
    }

    const normalizedComparison = normalizeChoiceComparison(normalizedAnswer);
    const directMatch = options.find(
        (option) => normalizeChoiceComparison(option) === normalizedComparison,
    );
    if (directMatch) {
        return directMatch;
    }

    const explicitOptionIndex = resolveExplicitChoiceIndex(answer, options.length);
    if (explicitOptionIndex !== null) {
        return options[explicitOptionIndex];
    }

    const answerLabel = extractChoiceLabel(answer);
    if (answerLabel) {
        const optionIndex = answerLabel.charCodeAt(0) - 65;
        return options[optionIndex] ?? normalizedAnswer;
    }

    return normalizedAnswer;
}

/**
 * Normalizes the internal structure of a question's content based on its type.
 * Maps Gemini-provided field names (e.g., 'stem', 'answer') to internal ones (e.g., 'prompt', 'correctAnswer').
 */
export function normalizeQuestionContentShape(
    type: z.infer<typeof Schema.questionTypeSchema>,
    content: unknown,
) {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
        return content;
    }

    const contentRecord = { ...(content as Record<string, unknown>) };
    const prompt =
        coerceString(contentRecord.prompt) ??
        coerceString(contentRecord.stem) ??
        coerceString(contentRecord.question) ??
        coerceString(contentRecord.statement) ??
        coerceString(contentRecord.text);

    if (prompt) {
        contentRecord.prompt = prompt;
    }

    switch (type) {
        case 'MULTIPLE_CHOICE': {
            const options = coerceStringArray(contentRecord.options)?.map(normalizeChoiceOption);
            if (options) {
                contentRecord.options = options;
            }

            const correctAnswer =
                coerceString(contentRecord.correctAnswerText) ??
                coerceString(contentRecord.correctAnswer) ??
                coerceString(contentRecord.answer);

            if (correctAnswer) {
                if (options) {
                    contentRecord.correctAnswer = resolveChoiceAnswerValue(correctAnswer, options);
                } else {
                    contentRecord.correctAnswer = normalizeChoiceOption(correctAnswer);
                }
            }
            break;
        }
        case 'MULTIPLE_RESPONSE': {
            const options = coerceStringArray(contentRecord.options)?.map(normalizeChoiceOption);
            if (options) {
                contentRecord.options = options;
            }

            const correctAnswerList =
                coerceStringArray(contentRecord.correctAnswerList) ??
                coerceStringArray(contentRecord.correctAnswer) ??
                coerceStringArray(contentRecord.answers);

            if (correctAnswerList) {
                if (options) {
                    contentRecord.correctAnswer = correctAnswerList.map((answer) =>
                        resolveChoiceAnswerValue(answer, options),
                    );
                } else {
                    contentRecord.correctAnswer = correctAnswerList.map(normalizeChoiceOption);
                }
            }
            break;
        }
        case 'TRUE_FALSE': {
            const correctAnswer =
                coerceBoolean(contentRecord.isTrue) ??
                coerceBoolean(contentRecord.correctAnswer) ??
                coerceBoolean(contentRecord.answer);

            if (typeof correctAnswer === 'boolean') {
                contentRecord.correctAnswer = correctAnswer;
            }
            break;
        }
        case 'IDENTIFICATION':
        case 'ENUMERATION': {
            const acceptedAnswers =
                coerceStringArray(contentRecord.acceptedAnswers) ??
                coerceStringArray(contentRecord.correctAnswer) ??
                coerceStringArray(contentRecord.answers) ??
                coerceStringArray(contentRecord.items);

            if (acceptedAnswers) {
                contentRecord.acceptedAnswers = acceptedAnswers;
            }
            break;
        }
        case 'FILL_BLANK': {
            const blanks =
                coerceStringArray(contentRecord.blanks) ??
                coerceStringArray(contentRecord.acceptedAnswers) ??
                coerceStringArray(contentRecord.correctAnswer) ??
                coerceStringArray(contentRecord.answers);

            if (blanks) {
                contentRecord.blanks = blanks;
            }
            break;
        }
        case 'MATCHING': {
            const pairs = contentRecord.pairs;
            if (Array.isArray(pairs)) {
                contentRecord.pairs = pairs
                    .map((pair: any) => ({
                        left:
                            coerceString(pair.left) ??
                            coerceString(pair.key) ??
                            coerceString(pair.question),
                        right:
                            coerceString(pair.right) ??
                            coerceString(pair.value) ??
                            coerceString(pair.answer),
                    }))
                    .filter((p: any) => p.left && p.right);
            }
            break;
        }
        case 'ESSAY': {
            const rubric = coerceString(contentRecord.rubric) ?? coerceString(contentRecord.guide);
            if (rubric) {
                contentRecord.rubric = rubric;
            }
            break;
        }
    }

    return contentRecord;
}
