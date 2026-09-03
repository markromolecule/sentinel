import { describe, expect, it } from 'vitest';
import { buildExamAttemptQuestionReports, scoreExamAttempt } from './score-exam-attempt';
import { randomizeQuestionChoices, shuffleExamQuestions } from './shuffle-exam';
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

    it('scores randomized choices with baked-in prefix labels accurately across different seeds', () => {
        const rawQuestion: ExamQuestion = {
            id: 'baked-label-mc',
            examId: 'exam-1',
            type: 'MULTIPLE_CHOICE',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'What is the capital of France?',
                options: ['A. Berlin', 'B. Paris', 'C. Madrid', 'D. Rome'],
                correctAnswer: 1, // 'B. Paris' -> 'Paris'
            },
        };

        // Seed 1
        const randomized1 = randomizeQuestionChoices(rawQuestion, 'student-seed-1');
        // Seed 2
        const randomized2 = randomizeQuestionChoices(rawQuestion, 'student-seed-2');

        // Check options were stripped of prefixes
        expect(randomized1.content.options).toContain('Paris');
        expect(randomized1.content.options).not.toContain('B. Paris');
        expect(randomized2.content.options).toContain('Paris');

        // The correctAnswer index must point to 'Paris' in both shuffled options
        const correctIndex1 = randomized1.content.correctAnswer as number;
        expect(randomized1.content.options?.[correctIndex1]).toBe('Paris');

        const correctIndex2 = randomized2.content.correctAnswer as number;
        expect(randomized2.content.options?.[correctIndex2]).toBe('Paris');

        // Scoring text answer 'Paris' or 'B. Paris' on both variants
        expect(
            scoreExamAttempt({
                questions: [randomized1],
                answers: { 'baked-label-mc': 'Paris' },
            }).score,
        ).toBe(5);

        expect(
            scoreExamAttempt({
                questions: [randomized2],
                answers: { 'baked-label-mc': 'Paris' },
            }).score,
        ).toBe(5);

        // Submitting by option index in the presented snapshot
        expect(
            scoreExamAttempt({
                questions: [randomized1],
                answers: { 'baked-label-mc': correctIndex1 },
            }).score,
        ).toBe(5);

        expect(
            scoreExamAttempt({
                questions: [randomized2],
                answers: { 'baked-label-mc': correctIndex2 },
            }).score,
        ).toBe(5);
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

    it('faithfully scores and reports all 8 question types end-to-end with shuffle and choice randomization', () => {
        const rawQuestions: ExamQuestion[] = [
            {
                id: 'q-mc',
                examId: 'exam-all-8',
                type: 'MULTIPLE_CHOICE',
                points: 5,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'What is the capital of France?',
                    options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
                    correctAnswer: 2, // 'Paris'
                },
            },
            {
                id: 'q-mr',
                examId: 'exam-all-8',
                type: 'MULTIPLE_RESPONSE',
                points: 6,
                orderIndex: 1,
                tags: [],
                content: {
                    prompt: 'Select all primary colors',
                    options: ['Red', 'Green', 'Blue', 'Yellow'],
                    correctAnswer: [0, 2, 3], // Red, Blue, Yellow
                },
            },
            {
                id: 'q-tf',
                examId: 'exam-all-8',
                type: 'TRUE_FALSE',
                points: 3,
                orderIndex: 2,
                tags: [],
                content: {
                    prompt: 'The earth orbits the sun.',
                    correctAnswer: true,
                },
            },
            {
                id: 'q-id',
                examId: 'exam-all-8',
                type: 'IDENTIFICATION',
                points: 4,
                orderIndex: 3,
                tags: [],
                content: {
                    prompt: 'What is the powerhouse of the cell?',
                    acceptedAnswers: ['Mitochondria', 'mitochondrion'],
                    caseSensitive: false,
                },
            },
            {
                id: 'q-fb',
                examId: 'exam-all-8',
                type: 'FILL_BLANK',
                points: 6,
                orderIndex: 4,
                tags: [],
                content: {
                    prompt: 'Roses are [blank1] and violets are [blank2].',
                    blanks: ['red', 'blue'],
                    caseSensitive: false,
                },
            },
            {
                id: 'q-match',
                examId: 'exam-all-8',
                type: 'MATCHING',
                points: 4,
                orderIndex: 5,
                tags: [],
                content: {
                    prompt: 'Match countries to capitals',
                    pairs: [
                        { left: 'Japan', right: 'Tokyo' },
                        { left: 'Italy', right: 'Rome' },
                    ],
                },
            },
            {
                id: 'q-enum',
                examId: 'exam-all-8',
                type: 'ENUMERATION',
                points: 6,
                orderIndex: 6,
                tags: [],
                content: {
                    prompt: 'Name three states of matter',
                    acceptedAnswers: ['Solid', 'Liquid', 'Gas'],
                    caseSensitive: false,
                },
            },
            {
                id: 'q-essay',
                examId: 'exam-all-8',
                type: 'ESSAY',
                points: 10,
                orderIndex: 7,
                tags: [],
                content: {
                    prompt: 'Explain the single responsibility principle.',
                },
            },
        ];

        // Apply choice randomization with option tokens to MC and MR
        const processedQuestions = rawQuestions.map((q) => {
            if (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_RESPONSE') {
                const randomized = randomizeQuestionChoices(q, `test-seed-${q.id}`);
                const options = randomized.content.options ?? [];
                const optionTokens = options.map((opt, idx) => `token-${q.id}-${idx}-${opt.toLowerCase()}`);
                return {
                    ...randomized,
                    content: {
                        ...randomized.content,
                        optionTokens,
                    },
                };
            }
            return q;
        });

        // Apply question shuffling
        const presentedQuestions = shuffleExamQuestions(processedQuestions, 'student-attempt-seed-999');

        // Find the randomized token for the correct answer of MC
        const mcQuestion = presentedQuestions.find((q) => q.id === 'q-mc')!;
        const mcCorrectIndex = mcQuestion.content.correctAnswer as number;
        const mcCorrectToken = mcQuestion.content.optionTokens![mcCorrectIndex]!;

        // Find the randomized tokens for MR correct answers
        const mrQuestion = presentedQuestions.find((q) => q.id === 'q-mr')!;
        const mrCorrectIndices = mrQuestion.content.correctAnswer as number[];
        const mrCorrectTokens = mrCorrectIndices.map((idx) => mrQuestion.content.optionTokens![idx]!);

        // Prepare student answers
        const studentAnswers: ExamAttemptAnswers = {
            'q-mc': mcCorrectToken,
            'q-mr': mrCorrectTokens,
            'q-tf': 'true', // string boolean coercion test
            'q-id': 'mitochondria',
            'q-fb': ['red', 'blue'],
            'q-match': {
                Japan: 'Tokyo',
                Italy: 'Rome',
            },
            'q-enum': ['gas', 'solid', 'liquid'], // order-independent
            'q-essay': 'A module should have only one reason to change.',
        };

        // Score the attempt
        const scoreResult = scoreExamAttempt({
            questions: presentedQuestions,
            answers: studentAnswers,
        });

        // Sum of objective questions: 5 + 6 + 3 + 4 + 6 + 4 + 6 = 34
        expect(scoreResult.score).toBe(34);
        expect(scoreResult.totalScore).toBe(44); // 34 + 10 for essay
        expect(scoreResult.requiresManualReview).toBe(true);
        expect(scoreResult.manualReviewQuestionCount).toBe(1);
        expect(scoreResult.autoGradableQuestionCount).toBe(7);
        expect(scoreResult.answeredCount).toBe(8);

        // Build question reports with essay evaluation
        const essayEvaluation: EssayQuestionEvaluation = {
            scores: {
                contentSubstance: 4,
                structureOrganization: 4,
                argumentationSupport: 3,
                styleTone: 3,
                grammarConventions: 4,
            },
            score: 9,
            feedback: 'Excellent breakdown.',
        };

        const reports = buildExamAttemptQuestionReports({
            questions: presentedQuestions,
            answers: studentAnswers,
            evaluations: {
                'q-essay': essayEvaluation,
            },
        });

        expect(reports).toHaveLength(8);

        // Map reports by questionId to assert 1:1 question association
        const reportMap = new Map(reports.map((r) => [r.questionId, r]));

        // Check MC
        const mcReport = reportMap.get('q-mc')!;
        expect(mcReport.isCorrect).toBe(true);
        expect(mcReport.awardedScore).toBe(5);
        expect(mcReport.answer).toBe('Paris'); // human-readable display
        expect(mcReport.correctAnswer).toBe('Paris');

        // Check MR
        const mrReport = reportMap.get('q-mr')!;
        expect(mrReport.isCorrect).toBe(true);
        expect(mrReport.awardedScore).toBe(6);
        expect((mrReport.answer as string[]).sort()).toEqual(['Blue', 'Red', 'Yellow']);

        // Check TF
        const tfReport = reportMap.get('q-tf')!;
        expect(tfReport.isCorrect).toBe(true);
        expect(tfReport.awardedScore).toBe(3);
        expect(tfReport.answer).toBe('true');
        expect(tfReport.correctAnswer).toBe(true);

        // Check ID
        const idReport = reportMap.get('q-id')!;
        expect(idReport.isCorrect).toBe(true);
        expect(idReport.awardedScore).toBe(4);
        expect(idReport.submittedAnswer).toBe('mitochondria');

        // Check FB
        const fbReport = reportMap.get('q-fb')!;
        expect(fbReport.isCorrect).toBe(true);
        expect(fbReport.awardedScore).toBe(6);
        expect(fbReport.answer).toEqual(['red', 'blue']);

        // Check Match
        const matchReport = reportMap.get('q-match')!;
        expect(matchReport.isCorrect).toBe(true);
        expect(matchReport.awardedScore).toBe(4);
        expect(matchReport.answer).toEqual({ Japan: 'Tokyo', Italy: 'Rome' });

        // Check Enum
        const enumReport = reportMap.get('q-enum')!;
        expect(enumReport.isCorrect).toBe(true);
        expect(enumReport.awardedScore).toBe(6);
        expect((enumReport.answer as string[]).sort()).toEqual(['gas', 'liquid', 'solid']);

        // Check Essay
        const essayReport = reportMap.get('q-essay')!;
        expect(essayReport.manualReviewState).toBe('REVIEWED');
        expect(essayReport.awardedScore).toBe(9);
        expect(essayReport.maxScore).toBe(10);
        expect(essayReport.answer).toBe('A module should have only one reason to change.');

        // Total score across all reports
        const totalAwarded = reports.reduce((sum, r) => sum + (r.awardedScore ?? 0), 0);
        expect(totalAwarded).toBe(43); // 34 + 9
    });
});
