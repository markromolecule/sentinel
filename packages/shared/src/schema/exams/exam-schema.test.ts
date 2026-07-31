import { describe, expect, it } from 'vitest';
import {
    createExamBodySchema,
    updateExamBodySchema,
    examSectionSchema,
    examSectionInputSchema,
} from './exam-schema';

describe('exam-schema inheritance contracts', () => {
    const validCreateBody = {
        title: 'Quarterly Assessment',
        description:
            'Comprehensive quarterly assessment covering the first half of the curriculum.',
        subjectId: 'c7dca7b8-8cfb-4b8a-b0f4-68ed2b4cf3a1',
        sectionId: 'd3b07384-d113-4956-a5a0-b423366cae66',
        startDateTime: '2026-06-14T08:00:00.000Z',
        endDateTime: '2026-06-14T09:00:00.000Z',
        durationMinutes: 60,
    };

    it('allows inherited passing score and general settings to be omitted on create', () => {
        const result = createExamBodySchema.safeParse(validCreateBody);

        expect(result.success).toBe(true);
        expect(result.data?.passingScore).toBeUndefined();
        expect(result.data?.shuffleQuestions).toBeUndefined();
        expect(result.data?.configuration).toBeUndefined();
    });

    it('allows update payloads to revert inherited settings with explicit nulls', () => {
        const result = updateExamBodySchema.safeParse({
            passingScore: null,
            shuffleQuestions: null,
            settings: {
                showCorrectAnswers: null,
            },
            configuration: {
                strictMode: null,
                webSecurity: null,
            },
        });

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
            passingScore: null,
            shuffleQuestions: null,
            settings: {
                showCorrectAnswers: null,
            },
            configuration: {
                strictMode: null,
                webSecurity: null,
            },
        });
    });
});

describe('examSectionSchema and examSectionInputSchema questionType contracts', () => {
    const validSection = {
        id: 'd3b07384-d113-4956-a5a0-b423366cae66',
        title: 'Multiple Choice Section',
        description: 'Select the best answer from the choices provided.',
        orderIndex: 0,
    };

    it('allows questionType to be a valid QuestionType, null, or omitted', () => {
        // Valid QuestionType
        const result1 = examSectionSchema.safeParse({
            ...validSection,
            questionType: 'MULTIPLE_CHOICE',
        });
        expect(result1.success).toBe(true);
        expect(result1.data?.questionType).toBe('MULTIPLE_CHOICE');

        // Null questionType (legacy/empty/mixed sections)
        const result2 = examSectionSchema.safeParse({
            ...validSection,
            questionType: null,
        });
        expect(result2.success).toBe(true);
        expect(result2.data?.questionType).toBeNull();

        // Omitted questionType
        const result3 = examSectionSchema.safeParse(validSection);
        expect(result3.success).toBe(true);
        expect(result3.data?.questionType).toBeUndefined();
    });

    it('allows questionType to be null or omitted on input schema', () => {
        const resultInput1 = examSectionInputSchema.safeParse({
            title: 'Multiple Choice Section',
            orderIndex: 0,
            questionType: 'MULTIPLE_CHOICE',
        });
        expect(resultInput1.success).toBe(true);
        expect(resultInput1.data?.questionType).toBe('MULTIPLE_CHOICE');

        const resultInput2 = examSectionInputSchema.safeParse({
            title: 'Legacy Section',
            orderIndex: 0,
            questionType: null,
        });
        expect(resultInput2.success).toBe(true);
        expect(resultInput2.data?.questionType).toBeNull();

        const resultInput3 = examSectionInputSchema.safeParse({
            title: 'Legacy Section',
            orderIndex: 0,
        });
        expect(resultInput3.success).toBe(true);
        expect(resultInput3.data?.questionType).toBeUndefined();
    });

    it('rejects invalid questionType values', () => {
        const result = examSectionSchema.safeParse({
            ...validSection,
            questionType: 'INVALID_TYPE',
        });
        expect(result.success).toBe(false);
    });
});
