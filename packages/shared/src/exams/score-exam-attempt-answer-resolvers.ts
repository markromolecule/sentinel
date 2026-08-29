import type { ExamAttemptAnswerValue, ExamQuestion } from '../types';
import type { ExamQuestionReportCorrectAnswer } from './score-exam-attempt.types';
import { normalizeText } from './score-exam-attempt-utils';

// ─── Shared Utilities ────────────────────────────────────────────────────────

const CHOICE_LABEL_PREFIX_REGEX = /^\s*\(?([A-Z0-9])\)?(?:\s*[\.\):-]|\s+-)\s*/i;

function toBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;

    if (typeof value === 'string') {
        const normalized = value.toLowerCase().trim();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }

    return null;
}

/**
 * Resolves a choice value (index or text) to its normalized text equivalent.
 * Returns null for unresolvable types.
 */
function resolveOptionToText(value: unknown, options: string[]): string | null {
    if (typeof value === 'number') return normalizeText(options[value] ?? '');
    if (typeof value === 'string') {
        const normalizedValue = normalizeText(value);
        const strippedValue = normalizeText(value.replace(CHOICE_LABEL_PREFIX_REGEX, '').trim());
        const normalizedOptions = options.map((option) => ({
            raw: option,
            normalized: normalizeText(option),
            stripped: normalizeText(option.replace(CHOICE_LABEL_PREFIX_REGEX, '').trim()),
        }));

        // 1. Direct match on normalized text or stripped option text
        const directMatch = normalizedOptions.find(
            (option) =>
                option.normalized === normalizedValue ||
                option.stripped === normalizedValue ||
                (strippedValue.length > 0 && (option.normalized === strippedValue || option.stripped === strippedValue)),
        );
        if (directMatch) return directMatch.stripped;

        // 2. Letter prefix match as fallback for legacy index-like answers
        const labelMatch = value.match(CHOICE_LABEL_PREFIX_REGEX);
        if (labelMatch?.[1] && /^[A-Z]$/i.test(labelMatch[1])) {
            const optionIndex = labelMatch[1].toUpperCase().charCodeAt(0) - 65;
            const option = normalizedOptions[optionIndex];
            if (option) return option.stripped;
        }

        return strippedValue.length > 0 ? strippedValue : normalizedValue;
    }
    return null;
}

function resolveOptionToDisplayText(value: unknown, options: string[]): string | number | null {
    if (typeof value === 'number') {
        return options[value] ?? value;
    }

    if (typeof value === 'string') {
        const normalizedValue = normalizeText(value);
        const strippedValue = normalizeText(value.replace(CHOICE_LABEL_PREFIX_REGEX, '').trim());
        const normalizedOptions = options.map((option) => ({
            raw: option,
            normalized: normalizeText(option),
            stripped: normalizeText(option.replace(CHOICE_LABEL_PREFIX_REGEX, '').trim()),
        }));

        // 1. Direct match on normalized or stripped content
        const directMatch = normalizedOptions.find(
            (option) =>
                option.normalized === normalizedValue ||
                option.stripped === normalizedValue ||
                (strippedValue.length > 0 && (option.normalized === strippedValue || option.stripped === strippedValue)),
        );

        if (directMatch) {
            return directMatch.raw;
        }

        // 2. Letter prefix match as fallback
        const labelMatch = value.match(CHOICE_LABEL_PREFIX_REGEX);
        if (labelMatch?.[1] && /^[A-Z]$/i.test(labelMatch[1])) {
            const optionIndex = labelMatch[1].toUpperCase().charCodeAt(0) - 65;
            const option = options[optionIndex];
            if (option) {
                return option;
            }
        }
    }

    return null;
}

function resolveTokenizedOptionToText(value: unknown, question: ExamQuestion): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const options = question.content.options ?? [];
    const optionTokens = question.content.optionTokens ?? [];

    const tokenIndex = optionTokens.indexOf(value);

    if (tokenIndex < 0) {
        return null;
    }

    return normalizeText(options[tokenIndex] ?? '');
}

function resolveTokenizedOptionIndex(value: unknown, question: ExamQuestion): number | null {
    if (typeof value !== 'string') {
        return null;
    }

    const optionTokens = question.content.optionTokens ?? [];
    const tokenIndex = optionTokens.indexOf(value);

    return tokenIndex >= 0 ? tokenIndex : null;
}

function resolveTokenizedOptionToDisplayText(
    value: unknown,
    question: ExamQuestion,
): string | number | null {
    if (typeof value !== 'string') {
        return null;
    }

    const options = question.content.options ?? [];
    const optionTokens = question.content.optionTokens ?? [];
    const tokenIndex = optionTokens.indexOf(value);

    if (tokenIndex < 0) {
        return null;
    }

    return options[tokenIndex] ?? value;
}

/**
 * Resolves the TRUE_FALSE expected answer with consistent priority:
 * correctBoolean > correctAnswer — used by both scoring and display.
 */
function resolveTrueFalseExpected(question: ExamQuestion): boolean | null {
    return toBoolean(question.content.correctBoolean) ?? toBoolean(question.content.correctAnswer);
}

// ─── Answer Resolvers ─────────────────────────────────────────────────────────

function resolveSingleChoiceAnswer(question: ExamQuestion, value: ExamAttemptAnswerValue): boolean {
    const options = question.content.options ?? [];
    const expectedIndex =
        typeof question.content.correctAnswer === 'number' ? question.content.correctAnswer : null;
    const receivedTokenIndex = resolveTokenizedOptionIndex(value, question);

    if (expectedIndex !== null && receivedTokenIndex !== null) {
        return expectedIndex === receivedTokenIndex;
    }

    const expected = resolveOptionToText(question.content.correctAnswer, options);
    const received =
        resolveTokenizedOptionToText(value, question) ?? resolveOptionToText(value, options);
    return expected !== null && received !== null && expected === received;
}

function resolveMultiChoiceAnswers(question: ExamQuestion, value: ExamAttemptAnswerValue): boolean {
    if (!Array.isArray(value)) return false;

    const options = question.content.options ?? [];
    const answerKey = Array.isArray(question.content.correctAnswer)
        ? question.content.correctAnswer
        : [];

    // Guard: empty answer key should never be treated as correct
    if (answerKey.length === 0) return false;

    const hasTokenizedSubmission = value.some(
        (item) => resolveTokenizedOptionIndex(item, question) !== null,
    );
    const hasNumericAnswerKey = answerKey.every((item) => typeof item === 'number');

    if (hasTokenizedSubmission && hasNumericAnswerKey) {
        const expectedIndexes = new Set(
            answerKey.filter((item): item is number => typeof item === 'number'),
        );
        const receivedIndexes = new Set(
            value
                .map((item) => resolveTokenizedOptionIndex(item, question))
                .filter((item): item is number => item !== null),
        );

        if (expectedIndexes.size === receivedIndexes.size) {
            return Array.from(expectedIndexes).every((item) => receivedIndexes.has(item));
        }
    }

    // Always normalize to text for consistent cross-type comparison.
    // This fixes the bug where index-keyed answers silently dropped string submissions.
    const toTextSet = (items: unknown[]): Set<string> =>
        new Set(
            items
                .map(
                    (item) =>
                        resolveTokenizedOptionToText(item, question) ??
                        resolveOptionToText(item, options),
                )
                .filter((item): item is string => item !== null && item.length > 0),
        );

    const expected = toTextSet(answerKey);
    const received = toTextSet(value);

    if (expected.size !== received.size) return false;
    return Array.from(expected).every((item) => received.has(item));
}

function resolveIdentificationAnswer(
    question: ExamQuestion,
    value: ExamAttemptAnswerValue,
): boolean {
    if (typeof value !== 'string') return false;

    const caseSensitive = question.content.caseSensitive ?? false;
    const acceptedAnswers = question.content.acceptedAnswers?.length
        ? question.content.acceptedAnswers
        : typeof question.content.correctAnswer === 'string'
          ? [question.content.correctAnswer]
          : [];

    const normalizedValue = normalizeText(value, caseSensitive);
    return acceptedAnswers.some(
        (answer) => normalizeText(answer, caseSensitive) === normalizedValue,
    );
}

function resolveFillBlankAnswer(question: ExamQuestion, value: ExamAttemptAnswerValue): boolean {
    if (!Array.isArray(value)) return false;

    const caseSensitive = question.content.caseSensitive ?? false;
    const expectedBlanks = question.content.blanks ?? [];

    if (expectedBlanks.length === 0) return false;
    if (value.length < expectedBlanks.length) return false;

    return expectedBlanks.every((blank, index) => {
        const submittedValue = value[index];
        return (
            typeof submittedValue === 'string' &&
            normalizeText(submittedValue, caseSensitive) === normalizeText(blank, caseSensitive)
        );
    });
}

function resolveMatchingAnswer(question: ExamQuestion, value: ExamAttemptAnswerValue): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    const submittedAnswers = value as Record<string, unknown>;
    const pairs = question.content.pairs ?? [];
    // Fixed: now respects caseSensitive, consistent with IDENTIFICATION and FILL_BLANK
    const caseSensitive = question.content.caseSensitive ?? false;

    if (pairs.length === 0) return false;

    return pairs.every((pair) => {
        const submittedValue = submittedAnswers[pair.left];
        return (
            typeof submittedValue === 'string' &&
            normalizeText(submittedValue, caseSensitive) ===
                normalizeText(pair.right, caseSensitive)
        );
    });
}

function resolveEnumerationAnswer(question: ExamQuestion, value: ExamAttemptAnswerValue): boolean {
    if (!Array.isArray(value)) return false;

    const acceptedAnswers = question.content.acceptedAnswers ?? question.content.blanks ?? [];

    if (acceptedAnswers.length === 0) return false;

    const expected = acceptedAnswers.map((answer) => normalizeText(answer)).sort();
    const received = value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => normalizeText(item))
        .sort();

    if (expected.length !== received.length) return false;
    return expected.every((item, index) => item === received[index]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isCorrectAnswer(
    question: ExamQuestion,
    value: ExamAttemptAnswerValue,
): boolean | null {
    switch (question.type) {
        case 'MULTIPLE_CHOICE':
            return resolveSingleChoiceAnswer(question, value);
        case 'MULTIPLE_RESPONSE':
            return resolveMultiChoiceAnswers(question, value);
        case 'TRUE_FALSE': {
            const submitted = toBoolean(value);
            const expected = resolveTrueFalseExpected(question);
            if (submitted === null || expected === null) return false;
            return submitted === expected;
        }
        case 'IDENTIFICATION':
            return resolveIdentificationAnswer(question, value);
        case 'FILL_BLANK':
            return resolveFillBlankAnswer(question, value);
        case 'MATCHING':
            return resolveMatchingAnswer(question, value);
        case 'ENUMERATION':
            return resolveEnumerationAnswer(question, value);
        case 'ESSAY':
            return null;
        default:
            return false;
    }
}

export function resolveQuestionAnswerForDisplay(
    question: ExamQuestion,
    value: ExamAttemptAnswerValue,
): ExamAttemptAnswerValue {
    if (question.type === 'MULTIPLE_CHOICE') {
        return (
            resolveTokenizedOptionToDisplayText(value, question) ??
            resolveOptionToDisplayText(value, question.content.options ?? []) ??
            value
        );
    }

    if (question.type === 'MULTIPLE_RESPONSE' && Array.isArray(value)) {
        const options = question.content.options ?? [];

        return value.map((item) => {
            const resolvedDisplayValue =
                resolveTokenizedOptionToDisplayText(item, question) ??
                resolveOptionToDisplayText(item, options) ??
                item;

            return typeof resolvedDisplayValue === 'string'
                ? resolvedDisplayValue
                : String(resolvedDisplayValue);
        });
    }

    return value;
}

export function resolveQuestionCorrectAnswer(
    question: ExamQuestion,
): ExamQuestionReportCorrectAnswer {
    switch (question.type) {
        case 'MULTIPLE_CHOICE': {
            const answerKey = question.content.correctAnswer;
            const options = question.content.options ?? [];
            if (typeof answerKey === 'number') return options[answerKey] ?? answerKey;
            return typeof answerKey === 'string' ? answerKey : null;
        }
        case 'MULTIPLE_RESPONSE': {
            const answerKey = Array.isArray(question.content.correctAnswer)
                ? question.content.correctAnswer
                : [];
            const options = question.content.options ?? [];
            return answerKey.map((item) =>
                typeof item === 'number' ? (options[item] ?? item) : item,
            );
        }
        case 'TRUE_FALSE':
            return resolveTrueFalseExpected(question);
        case 'IDENTIFICATION':
            return question.content.acceptedAnswers?.length
                ? question.content.acceptedAnswers
                : typeof question.content.correctAnswer === 'string'
                  ? [question.content.correctAnswer]
                  : null;
        case 'FILL_BLANK':
            return question.content.blanks ?? null;
        case 'MATCHING':
            return (question.content.pairs ?? []).reduce<Record<string, string>>((acc, pair) => {
                acc[pair.left] = pair.right;
                return acc;
            }, {});
        case 'ENUMERATION':
            return question.content.acceptedAnswers ?? question.content.blanks ?? null;
        case 'ESSAY':
            return null;
        default:
            return null;
    }
}
