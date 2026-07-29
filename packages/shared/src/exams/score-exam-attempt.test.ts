import { describe, expect, it } from 'vitest';
import { buildExamAttemptQuestionReports, scoreExamAttempt } from './score-exam-attempt';
import type { ExamAttemptAnswers, ExamQuestion } from '../types';
import type { EssayQuestionEvaluation } from '../schema/exams/assessment-schema';

describe('scoreExamAttempt', () => {
    it('scores objective questions and tracks manual-review items', () => {
        const questions: ExamQuestion[] = [
            {
                id: '11111111-1111-1111-1111-111111111111',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 5,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'What is 2 + 2?',
                    options: ['3', '4', '5'],
                    correctAnswer: 1,
                },
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                examId: 'exam-1',
                type: 'ESSAY',
                points: 10,
                orderIndex: 1,
                tags: [],
                content: {
                    prompt: 'Explain your reasoning.',
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            '11111111-1111-1111-1111-111111111111': '4',
            '22222222-2222-2222-2222-222222222222': 'Because arithmetic.',
        };

        expect(
            scoreExamAttempt({
                questions,
                answers,
            }),
        ).toEqual({
            score: 5,
            totalScore: 15,
            percentage: 33,
            answeredCount: 2,
            autoGradableQuestionCount: 1,
            manualReviewQuestionCount: 1,
            requiresManualReview: true,
        });
    });

    it('scores legacy labeled choice data the same as normalized clean choice data', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'legacy-mc',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Select the capital of France.',
                    options: ['A. Paris', 'B. Rome', 'C. Madrid', 'D. Berlin'],
                    correctAnswer: 'A. Paris',
                },
            },
            {
                id: 'legacy-mr',
                examId: 'exam-1',
                type: 'MULTIPLE_RESPONSE',
                points: 3,
                orderIndex: 1,
                tags: [],
                content: {
                    prompt: 'Select the prime numbers.',
                    options: ['A. Two', 'B) Three', '(C) Four', 'D - Five'],
                    correctAnswer: ['A. Two', 'B) Three', 'D - Five'],
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            'legacy-mc': 'Paris',
            'legacy-mr': ['Two', 'Three', 'Five'],
        };

        expect(
            scoreExamAttempt({
                questions,
                answers,
            }),
        ).toEqual({
            score: 5,
            totalScore: 5,
            percentage: 100,
            answeredCount: 2,
            autoGradableQuestionCount: 2,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });
    });

    it('scores attempt-specific option tokens the same as their displayed options', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'token-mc',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Select the best answer.',
                    options: ['Mercury', 'Venus', 'Earth'],
                    optionTokens: ['tok-a', 'tok-b', 'tok-c'],
                    correctAnswer: 2,
                },
            },
            {
                id: 'token-mr',
                examId: 'exam-1',
                type: 'MULTIPLE_RESPONSE',
                points: 3,
                orderIndex: 1,
                tags: [],
                content: {
                    prompt: 'Select the valid colors.',
                    options: ['Red', 'Circle', 'Blue'],
                    optionTokens: ['mr-a', 'mr-b', 'mr-c'],
                    correctAnswer: [0, 2],
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            'token-mc': 'tok-c',
            'token-mr': ['mr-a', 'mr-c'],
        };

        expect(scoreExamAttempt({ questions, answers })).toEqual({
            score: 5,
            totalScore: 5,
            percentage: 100,
            answeredCount: 2,
            autoGradableQuestionCount: 2,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });
    });

    it('treats an invalid attempt-specific option token as incorrect', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'token-mc-invalid',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Select the best answer.',
                    options: ['Mercury', 'Venus', 'Earth'],
                    optionTokens: ['tok-a', 'tok-b', 'tok-c'],
                    correctAnswer: 2,
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            'token-mc-invalid': 'tok-z',
        };

        expect(scoreExamAttempt({ questions, answers })).toEqual({
            score: 0,
            totalScore: 2,
            percentage: 0,
            answeredCount: 1,
            autoGradableQuestionCount: 1,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });
    });

    it('scores shuffled multiple-choice and multiple-response tokens against presented order', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'shuffled-mc',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Select the correct planet.',
                    options: ['Earth', 'Mercury', 'Venus'],
                    optionTokens: ['tok-earth', 'tok-mercury', 'tok-venus'],
                    correctAnswer: 1,
                },
            },
            {
                id: 'shuffled-mr',
                examId: 'exam-1',
                type: 'MULTIPLE_RESPONSE',
                points: 3,
                orderIndex: 1,
                tags: [],
                content: {
                    prompt: 'Select the valid colors.',
                    options: ['Blue', 'Triangle', 'Red'],
                    optionTokens: ['tok-blue', 'tok-triangle', 'tok-red'],
                    correctAnswer: [0, 2],
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            'shuffled-mc': 'tok-mercury',
            'shuffled-mr': ['tok-blue', 'tok-red'],
        };

        expect(scoreExamAttempt({ questions, answers })).toEqual({
            score: 5,
            totalScore: 5,
            percentage: 100,
            answeredCount: 2,
            autoGradableQuestionCount: 2,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });
    });

    it('scores tokenized answers correctly even when duplicate option labels exist', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'duplicate-label-mc',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Choose the second repeated label.',
                    options: ['Same', 'Same', 'Different'],
                    optionTokens: ['dup-a', 'dup-b', 'dup-c'],
                    correctAnswer: 1,
                },
            },
        ];

        const correctAnswers: ExamAttemptAnswers = {
            'duplicate-label-mc': 'dup-b',
        };
        const incorrectAnswers: ExamAttemptAnswers = {
            'duplicate-label-mc': 'dup-a',
        };

        expect(scoreExamAttempt({ questions, answers: correctAnswers })?.score).toBe(2);
        expect(scoreExamAttempt({ questions, answers: incorrectAnswers })?.score).toBe(0);
    });

    it('does not let one attempt reuse another attempt’s tokens', () => {
        const questionsForAttemptA: ExamQuestion[] = [
            {
                id: 'attempt-a',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Select the best answer.',
                    options: ['Alpha', 'Beta', 'Gamma'],
                    optionTokens: ['attempt-a-1', 'attempt-a-2', 'attempt-a-3'],
                    correctAnswer: 1,
                },
            },
        ];
        const questionsForAttemptB: ExamQuestion[] = [
            {
                id: 'attempt-b',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Select the best answer.',
                    options: ['Alpha', 'Beta', 'Gamma'],
                    optionTokens: ['attempt-b-1', 'attempt-b-2', 'attempt-b-3'],
                    correctAnswer: 1,
                },
            },
        ];

        expect(
            scoreExamAttempt({
                questions: questionsForAttemptB,
                answers: {
                    'attempt-b': 'attempt-a-2',
                },
            }),
        ).toEqual({
            score: 0,
            totalScore: 2,
            percentage: 0,
            answeredCount: 1,
            autoGradableQuestionCount: 1,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });

        expect(
            scoreExamAttempt({
                questions: questionsForAttemptA,
                answers: {
                    'attempt-a': 'attempt-a-2',
                },
            }).score,
        ).toBe(2);
    });
});

describe('buildExamAttemptQuestionReports', () => {
    it('creates report rows with human-readable correct answers and essay evaluations', () => {
        const questions: ExamQuestion[] = [
            {
                id: '11111111-1111-1111-1111-111111111111',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 5,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'What is 2 + 2?',
                    options: ['3', '4', '5'],
                    correctAnswer: 1,
                },
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                examId: 'exam-1',
                type: 'ESSAY',
                points: 10,
                orderIndex: 1,
                tags: [],
                content: {
                    prompt: 'Explain your reasoning.',
                },
            },
            {
                id: '33333333-3333-3333-3333-333333333333',
                examId: 'exam-1',
                type: 'MATCHING',
                points: 4,
                orderIndex: 2,
                tags: [],
                content: {
                    prompt: 'Match the terms.',
                    pairs: [
                        { left: 'A', right: '1' },
                        { left: 'B', right: '2' },
                    ],
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            '11111111-1111-1111-1111-111111111111': '4',
            '22222222-2222-2222-2222-222222222222': 'Because arithmetic.',
            '33333333-3333-3333-3333-333333333333': {
                A: '1',
                B: '3',
            },
        };

        const evaluations: Record<string, EssayQuestionEvaluation> = {
            '22222222-2222-2222-2222-222222222222': {
                scores: {
                    contentSubstance: 4,
                    structureOrganization: 4,
                    argumentationSupport: 3,
                    styleTone: 3,
                    grammarConventions: 4,
                },
                score: 9,
                feedback: 'Strong explanation.',
            },
        };

        expect(
            buildExamAttemptQuestionReports({
                questions,
                answers,
                evaluations,
            }),
        ).toEqual([
            expect.objectContaining({
                questionId: '11111111-1111-1111-1111-111111111111',
                questionType: 'MULTIPLE_CHOICE',
                prompt: 'What is 2 + 2?',
                submittedAnswer: '4',
                displayAnswer: '4',
                answer: '4',
                correctAnswer: '4',
                isCorrect: true,
                objectiveAwardedScore: 5,
                awardedScore: 5,
                maxScore: 5,
                manualReviewState: 'NOT_REQUIRED',
                evaluation: null,
                override: null,
            }),
            expect.objectContaining({
                questionId: '22222222-2222-2222-2222-222222222222',
                questionType: 'ESSAY',
                prompt: 'Explain your reasoning.',
                submittedAnswer: 'Because arithmetic.',
                displayAnswer: 'Because arithmetic.',
                answer: 'Because arithmetic.',
                correctAnswer: null,
                isCorrect: null,
                objectiveAwardedScore: null,
                awardedScore: 9,
                maxScore: 10,
                manualReviewState: 'REVIEWED',
                evaluation: evaluations['22222222-2222-2222-2222-222222222222'],
                override: null,
            }),
            expect.objectContaining({
                questionId: '33333333-3333-3333-3333-333333333333',
                questionType: 'MATCHING',
                prompt: 'Match the terms.',
                submittedAnswer: {
                    A: '1',
                    B: '3',
                },
                displayAnswer: {
                    A: '1',
                    B: '3',
                },
                answer: {
                    A: '1',
                    B: '3',
                },
                correctAnswer: {
                    A: '1',
                    B: '2',
                },
                isCorrect: false,
                objectiveAwardedScore: 0,
                awardedScore: 0,
                maxScore: 4,
                manualReviewState: 'NOT_REQUIRED',
                evaluation: null,
                override: null,
            }),
        ]);
    });

    it('renders tokenized multiple-choice answers as display text in question reports', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'question-tokenized',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 1,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Choose one',
                    options: ['Alpha', 'Beta'],
                    optionTokens: ['opaque-a', 'opaque-b'],
                    correctAnswer: 1,
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            'question-tokenized': 'opaque-b',
        };

        expect(
            buildExamAttemptQuestionReports({
                questions,
                answers,
            }),
        ).toEqual([
            expect.objectContaining({
                questionId: 'question-tokenized',
                answer: 'Beta',
                correctAnswer: 'Beta',
                isCorrect: true,
            }),
        ]);
    });

    it('renders multiple-response display answers as a string array when tokens and indexes are mixed', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'question-multi-tokenized',
                examId: 'exam-1',
                type: 'MULTIPLE_RESPONSE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Choose two',
                    options: ['Alpha', 'Beta', 'Gamma'],
                    optionTokens: ['opaque-a', 'opaque-b', 'opaque-c'],
                    correctAnswer: [0, 1],
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            'question-multi-tokenized': ['opaque-a', 1],
        };

        expect(
            buildExamAttemptQuestionReports({
                questions,
                answers,
            }),
        ).toEqual([
            expect.objectContaining({
                questionId: 'question-multi-tokenized',
                answer: ['Alpha', 'Beta'],
                displayAnswer: ['Alpha', 'Beta'],
            }),
        ]);
    });
});
