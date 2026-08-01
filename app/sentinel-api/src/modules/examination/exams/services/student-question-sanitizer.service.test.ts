import { describe, expect, it } from 'vitest';
import { type ExamQuestion } from '@sentinel/shared';
import { sanitizeQuestionForStudentAttempt } from './student-question-sanitizer.service';

describe('student-question-sanitizer.service', () => {
    const baseQuestion: Omit<ExamQuestion, 'type' | 'content'> = {
        id: 'q-1',
        examId: 'exam-1',
        points: 5,
        orderIndex: 0,
        tags: [],
    };

    it('should sanitize MULTIPLE_CHOICE question (remove correctAnswer)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'MULTIPLE_CHOICE',
            content: {
                prompt: 'What is 1 + 1?',
                options: ['1', '2', '3'],
                correctAnswer: '2',
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
        expect(sanitized.content.options).toEqual(['1', '2', '3']);
    });

    it('should sanitize MULTIPLE_RESPONSE question (remove correctAnswer)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'MULTIPLE_RESPONSE',
            content: {
                prompt: 'Select prime numbers',
                options: ['2', '3', '4', '5'],
                correctAnswer: ['2', '3', '5'],
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
        expect(sanitized.content.options).toEqual(['2', '3', '4', '5']);
    });

    it('should sanitize TRUE_FALSE question (remove correctAnswer and correctBoolean)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'TRUE_FALSE',
            content: {
                prompt: 'The earth is round.',
                correctBoolean: true,
                correctAnswer: true,
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
        expect(sanitized.content.correctBoolean).toBeUndefined();
    });

    it('should sanitize IDENTIFICATION question (remove correctAnswer)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'IDENTIFICATION',
            content: {
                prompt: 'Name the first president of the US.',
                correctAnswer: 'George Washington',
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
    });

    it('should sanitize FILL_BLANK question (remove correctAnswer and convert blanks to empty strings)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'FILL_BLANK',
            content: {
                prompt: 'Roses are [blank1], violets are [blank2].',
                blanks: ['red', 'blue'],
                correctAnswer: ['red', 'blue'],
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
        expect(sanitized.content.blanks).toEqual(['', '']);
    });

    it('should sanitize MATCHING question (remove right side of pairs and correctAnswer)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'MATCHING',
            content: {
                prompt: 'Match countries to capitals',
                pairs: [
                    { left: 'France', right: 'Paris' },
                    { left: 'Japan', right: 'Tokyo' },
                ],
                correctAnswer: { France: 'Paris', Japan: 'Tokyo' },
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
        expect(sanitized.content.pairs).toEqual([
            { left: 'France', right: '' },
            { left: 'Japan', right: '' },
        ]);
    });

    it('should sanitize ENUMERATION question (remove acceptedAnswers and convert blanks/acceptedAnswers to count-only)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'ENUMERATION',
            content: {
                prompt: 'List the primary colors.',
                acceptedAnswers: ['red', 'green', 'blue'],
                correctAnswer: ['red', 'green', 'blue'],
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
        expect(sanitized.content.acceptedAnswers).toEqual(['', '', '']);
        expect(sanitized.content.blanks).toEqual(['', '', '']);
    });

    it('should sanitize ESSAY question (remove correctAnswer)', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'ESSAY',
            content: {
                prompt: 'Discuss the impact of climate change.',
                correctAnswer:
                    'An acceptable essay should mention greenhouse gases, rising sea levels, etc.',
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);
        expect(sanitized.content.correctAnswer).toBeUndefined();
    });

    it('removes answer guidance fields from unauthorized/student payloads', () => {
        const question: ExamQuestion = {
            ...baseQuestion,
            type: 'ESSAY',
            content: {
                prompt: 'Explain the release gate.',
                correctAnswer: 'Mention private downloads.',
                acceptedAnswers: ['Private artifacts'],
                blanks: ['Private artifacts'],
                pairs: [{ left: 'READY', right: 'Download' }],
                rubric: 'Award points for naming private storage.',
                answerGuidance: 'Look for retry/delete lifecycle.',
                guidance: 'Do not leak this guidance.',
            },
        };
        const sanitized = sanitizeQuestionForStudentAttempt(question);

        expect(sanitized.content.correctAnswer).toBeUndefined();
        expect(sanitized.content.acceptedAnswers).toBeUndefined();
        expect(sanitized.content.rubric).toBeUndefined();
        expect(sanitized.content.answerGuidance).toBeUndefined();
        expect(sanitized.content.guidance).toBeUndefined();
        expect(JSON.stringify(sanitized)).not.toContain('private storage');
        expect(JSON.stringify(sanitized)).not.toContain('retry/delete lifecycle');
    });
});
