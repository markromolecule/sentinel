import * as z from 'zod';
import type { ExamQuestionContent, QuestionType } from '../../../types';

const promptString = z
    .string()
    .trim()
    .min(1, {
        message: 'Prompt is required.',
    })
    .max(1000, {
        message: 'Prompt cannot exceed 1000 characters.',
    });

const answerString = z
    .string()
    .trim()
    .min(1, {
        message: 'This field cannot be empty.',
    })
    .max(250, {
        message: 'Response cannot exceed 250 characters.',
    });

const promptSchema = z.object({
    prompt: promptString,
});

const optionsSchema = z.array(answerString).min(2, {
    message: 'Provide at least two options.',
});

const acceptedAnswersSchema = z.array(answerString).min(1, {
    message: 'Provide at least one answer.',
});

const matchingPairSchema = z.object({
    left: answerString,
    right: answerString,
});

function findDuplicateValues(values: string[]) {
    const normalized = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of values) {
        const key = value.trim().toLocaleLowerCase();
        if (normalized.has(key)) {
            duplicates.add(key);
            continue;
        }
        normalized.add(key);
    }

    return duplicates.size;
}

export const multipleChoiceContentSchema = promptSchema
    .extend({
        options: optionsSchema,
        correctAnswer: answerString,
    })
    .superRefine((value, ctx) => {
        if (findDuplicateValues(value.options) > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Options must be unique.',
                path: ['options'],
            });
        }

        if (!value.options.includes(value.correctAnswer)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Correct answer must match one of the options.',
                path: ['correctAnswer'],
            });
        }
    });

export const multipleResponseContentSchema = promptSchema
    .extend({
        options: optionsSchema,
        correctAnswer: z.array(answerString).min(1, {
            message: 'Select at least one correct answer.',
        }),
    })
    .superRefine((value, ctx) => {
        if (findDuplicateValues(value.options) > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Options must be unique.',
                path: ['options'],
            });
        }

        const invalidAnswers = value.correctAnswer.filter(
            (answer) => !value.options.includes(answer),
        );
        if (invalidAnswers.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'All selected answers must match an option.',
                path: ['correctAnswer'],
            });
        }

        if (findDuplicateValues(value.correctAnswer) > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Correct answers must be unique.',
                path: ['correctAnswer'],
            });
        }
    });

export const trueFalseContentSchema = promptSchema.extend({
    correctAnswer: z.boolean(),
});

export const identificationContentSchema = promptSchema.extend({
    acceptedAnswers: acceptedAnswersSchema,
    caseSensitive: z.boolean().optional(),
});

export const enumerationContentSchema = promptSchema.extend({
    acceptedAnswers: acceptedAnswersSchema,
});

export const matchingContentSchema = promptSchema.extend({
    pairs: z.array(matchingPairSchema).min(1, {
        message: 'Provide at least one matching pair.',
    }),
});

export const fillBlankContentSchema = promptSchema.extend({
    blanks: acceptedAnswersSchema,
});

export const essayContentSchema = promptSchema.extend({
    rubric: z.string().optional(),
    maxLength: z.number().int().nonnegative().optional(),
});

export const questionContentSchemaByType: Record<QuestionType, z.ZodSchema<ExamQuestionContent>> = {
    MULTIPLE_CHOICE: multipleChoiceContentSchema,
    MULTIPLE_RESPONSE: multipleResponseContentSchema,
    TRUE_FALSE: trueFalseContentSchema,
    IDENTIFICATION: identificationContentSchema,
    ENUMERATION: enumerationContentSchema,
    MATCHING: matchingContentSchema,
    FILL_BLANK: fillBlankContentSchema,
    ESSAY: essayContentSchema,
};
