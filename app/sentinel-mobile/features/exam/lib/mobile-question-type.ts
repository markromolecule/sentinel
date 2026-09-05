import type { QuestionType } from '@sentinel/shared/types';

/**
 * Normalizes question type aliases and formatted strings into canonical QuestionType.
 */
export function normalizeQuestionType(rawType: unknown): QuestionType {
    const formatted = String(rawType || 'MULTIPLE_CHOICE')
        .toUpperCase()
        .replace(/[-\s]/g, '_');

    if (['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'MCQ'].includes(formatted)) {
        return 'MULTIPLE_CHOICE';
    }
    if (['MULTIPLE_RESPONSE', 'MULTI_SELECT', 'CHECKBOX', 'CHECKBOXES'].includes(formatted)) {
        return 'MULTIPLE_RESPONSE';
    }
    if (['TRUE_FALSE', 'BOOLEAN', 'TRUEFALSE', 'TF'].includes(formatted)) {
        return 'TRUE_FALSE';
    }
    if (['IDENTIFICATION', 'SHORT_ANSWER', 'IDENTIFY'].includes(formatted)) {
        return 'IDENTIFICATION';
    }
    if (['ENUMERATION', 'LIST'].includes(formatted)) {
        return 'ENUMERATION';
    }
    if (['FILL_BLANK', 'FILL_IN_THE_BLANK', 'FILL_IN_BLANK', 'CLOZE'].includes(formatted)) {
        return 'FILL_BLANK';
    }
    if (['MATCHING', 'MATCH'].includes(formatted)) {
        return 'MATCHING';
    }
    if (['ESSAY', 'LONG_ANSWER'].includes(formatted)) {
        return 'ESSAY';
    }

    return formatted as QuestionType;
}
