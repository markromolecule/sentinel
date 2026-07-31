import { Schema } from '@sentinel/shared';

export type QuestionType = (typeof Schema.QUESTION_TYPES)[number];

export interface QuestionTypeDefinition {
    label: string;
    instructions: string;
    schema: object;
}

export const QUESTION_TYPE_DEFINITIONS: Record<QuestionType, QuestionTypeDefinition> = {
    MULTIPLE_CHOICE: {
        label: 'multiple choice',
        instructions:
            'Each question must have exactly four distinct options and exactly one correct answer. Store the correct answer in "correctAnswerText" by copying the complete matching option string verbatim. Never return an option letter, number, index, shortened answer, or paraphrase. Do not prefix options with letters or numbering because the exam UI renders display labels separately.',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correctAnswerText: { type: 'string' },
            },
            required: ['prompt', 'options', 'correctAnswerText'],
        },
    },
    MULTIPLE_RESPONSE: {
        label: 'multiple response',
        instructions:
            'Each question must have four to six options and at least two correct answers. Store each correct answer in "correctAnswerList" by copying the complete matching option string verbatim. Never return option letters, numbers, indexes, shortened answers, or paraphrases. Do not prefix options with letters or numbering because the exam UI renders display labels separately.',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correctAnswerList: { type: 'array', items: { type: 'string' } },
            },
            required: ['prompt', 'options', 'correctAnswerList'],
        },
    },
    TRUE_FALSE: {
        label: 'true or false',
        instructions:
            'Each prompt must be a clear statement, and the correct answers should be balanced between true and false when possible. Store the boolean in "isTrue".',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                isTrue: { type: 'boolean' },
            },
            required: ['prompt', 'isTrue'],
        },
    },
    IDENTIFICATION: {
        label: 'identification',
        instructions:
            'Each question should expect a short factual answer, with one to three accepted answers for spelling or phrasing variants.',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                acceptedAnswers: {
                    type: 'array',
                    items: { type: 'string' },
                },
                caseSensitive: { type: 'boolean' },
            },
            required: ['prompt', 'acceptedAnswers'],
        },
    },
    MATCHING: {
        label: 'matching',
        instructions:
            'Each question must include three to six matching pairs that belong to the same lesson segment.',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                pairs: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            left: { type: 'string' },
                            right: { type: 'string' },
                        },
                        required: ['left', 'right'],
                    },
                },
            },
            required: ['prompt', 'pairs'],
        },
    },
    ESSAY: {
        label: 'essay',
        instructions:
            "Each question should have a realistic maxLength. Note that evaluations will follow the exam's active effective rubric containing custom weights and performance levels. Do not write a custom rubric.",
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                rubric: { type: 'string' },
                maxLength: { type: 'integer' },
            },
            required: ['prompt'],
        },
    },

    FILL_BLANK: {
        label: 'fill in the blank',
        instructions:
            'Each prompt should contain a meaningful blank that can be answered directly from the lesson, with one or more valid blank answers.',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                blanks: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
            required: ['prompt', 'blanks'],
        },
    },
    ENUMERATION: {
        label: 'enumeration',
        instructions:
            'Each question should ask for a list of related items, and acceptedAnswers should contain all expected core items.',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string' },
                acceptedAnswers: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
            required: ['prompt', 'acceptedAnswers'],
        },
    },
};

/**
 * Derived label record for backward compatibility.
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = Object.values(
    Schema.QUESTION_TYPES,
).reduce(
    (acc, type) => {
        acc[type] = QUESTION_TYPE_DEFINITIONS[type].label;
        return acc;
    },
    {} as Record<QuestionType, string>,
);

export const QUESTION_DIFFICULTIES = [...Schema.QUESTION_DIFFICULTIES];
