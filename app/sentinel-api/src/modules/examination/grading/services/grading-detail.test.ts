import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { getGradingAttemptDetail } from './get-grading-attempt-detail.service';
import { updateGradingAttempt } from './update-grading-attempt.service';
import { calculateEssayWeightedScore, scoreExamAttempt } from '@sentinel/shared';

vi.mock('@sentinel/shared', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@sentinel/shared')>();
    return {
        ...actual,
        scoreExamAttempt: vi.fn(),
        calculateEssayWeightedScore: vi.fn(),
    };
});

vi.mock('../../lifecycle/services/lifecycle-event.service', () => ({
    appendExamAttemptLifecycleEvent: vi.fn().mockResolvedValue({}),
}));

describe('Grading attempt details and update services', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDb = {
            selectFrom: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            $if: vi.fn().mockImplementation(function (
                this: any,
                condition: boolean,
                callback: any,
            ) {
                if (condition) {
                    return callback(this);
                }
                return this;
            }),
            executeTakeFirst: vi.fn(),
            execute: vi.fn(),
            updateTable: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        };
    });

    describe('getGradingAttemptDetail', () => {
        it('fetches attempt, filters special properties from answers, and parses existing evaluations', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 8,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    'q-obj-1': 'A',
                    'q-essay-1': 'Student essay response text',
                    _evaluations: {
                        'q-essay-1': {
                            scores: {
                                contentSubstance: 3,
                                structureOrganization: 4,
                                argumentationSupport: 3,
                                styleTone: 3,
                                grammarConventions: 4,
                            },
                            score: 3.4,
                            feedback: 'Good work',
                        },
                    },
                    _itemOverrides: {
                        'q-essay-1': {
                            awardedScore: 4,
                            reason: 'Manual adjustment',
                            overriddenBy: '99999999-9999-9999-9999-999999999999',
                            overriddenAt: '2026-04-18T10:00:00.000Z',
                        },
                    },
                    _grading: {
                        finalizedAt: '2026-04-18T10:05:00.000Z',
                        finalizedBy: '99999999-9999-9999-9999-999999999999',
                    },
                    _feedback: 'Overall solid effort.',
                },
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'math-source.pdf',
                    sourcePageNumber: 2,
                    sourceEvidence: 'Legacy source excerpt',
                    passageContent: '<p><strong>Passage first</strong></p>',
                    passageType: 'html',
                    content: { prompt: 'Objective Prompt', options: ['A', 'B'], correctAnswer: 0 },
                    points: 5,
                    orderIndex: 0,
                },
                {
                    id: 'q-essay-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'ESSAY',
                    sourceFileName: null,
                    sourcePageNumber: null,
                    sourceEvidence: null,
                    passageContent: null,
                    passageType: null,
                    content: { prompt: 'Essay Prompt', maxLength: 1000 },
                    points: 5,
                    orderIndex: 1,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);

            const result = await getGradingAttemptDetail({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
            });

            expect(result.attempt.answers).toEqual({
                'q-obj-1': 'A',
                'q-essay-1': 'Student essay response text',
            });
            expect(result.attempt.evaluations).toEqual(mockAttempt.answerSnapshot._evaluations);
            expect(result.attempt.feedback).toBe('Overall solid effort.');
            expect(result.attempt.itemOverrides).toEqual(mockAttempt.answerSnapshot._itemOverrides);
            expect(result.attempt.grading).toEqual(mockAttempt.answerSnapshot._grading);
            expect(result.attempt.questionReports).toEqual([
                expect.objectContaining({
                    questionId: 'q-obj-1',
                    questionType: 'MULTIPLE_CHOICE',
                    prompt: 'Objective Prompt',
                    submittedAnswer: 'A',
                    displayAnswer: 'A',
                    answer: 'A',
                    correctAnswer: 'A',
                    isCorrect: true,
                    objectiveAwardedScore: 5,
                    awardedScore: 5,
                    maxScore: 5,
                    manualReviewState: 'NOT_REQUIRED',
                    evaluation: null,
                    override: null,
                }),
                expect.objectContaining({
                    questionId: 'q-essay-1',
                    questionType: 'ESSAY',
                    prompt: 'Essay Prompt',
                    submittedAnswer: 'Student essay response text',
                    displayAnswer: 'Student essay response text',
                    answer: 'Student essay response text',
                    correctAnswer: null,
                    isCorrect: null,
                    objectiveAwardedScore: null,
                    awardedScore: 4,
                    maxScore: 5,
                    manualReviewState: 'REVIEWED',
                    evaluation: mockAttempt.answerSnapshot._evaluations['q-essay-1'],
                    override: mockAttempt.answerSnapshot._itemOverrides['q-essay-1'],
                }),
            ]);
            expect(result.questions[0]).toMatchObject({
                sourceFileName: 'math-source.pdf',
                sourcePageNumber: 2,
                sourceEvidence: 'Legacy source excerpt',
                passageContent: '<p><strong>Passage first</strong></p>',
                passageType: 'html',
            });
            expect(result.questions).toHaveLength(2);
        });

        it('shuffles multiple choice question options when randomize_choices config is true', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 1,
                totalScore: 1,
                status: 'COMPLETED',
                answerSnapshot: {
                    'q-obj-1': 1,
                },
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: {
                        prompt: 'Objective Prompt',
                        options: ['A', 'B'],
                        correctAnswer: 'B',
                    },
                    points: 1,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst
                .mockResolvedValueOnce(mockAttempt)
                .mockResolvedValueOnce({ randomize_choices: true });
            mockDb.execute.mockResolvedValue(mockQuestions);

            const result = await getGradingAttemptDetail({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
            });

            expect(result.questions).toHaveLength(1);
            expect(result.questions[0].content.options).toContain('A');
            expect(result.questions[0].content.options).toContain('B');
            expect(result.attempt.questionReports).toHaveLength(1);
        });
    });

    describe('updateGradingAttempt', () => {
        it('scores objective questions and integrates manual essay weighted scores', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    'q-obj-1': 'A',
                    'q-essay-1': 'Student essay response text',
                },
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: {
                        prompt: 'Objective Prompt',
                        options: ['A', 'B'],
                        correctAnswer: 0,
                    },
                    points: 5,
                    orderIndex: 0,
                },
                {
                    id: 'q-essay-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'ESSAY',
                    content: { prompt: 'Essay Prompt', maxLength: 1000 },
                    points: 5,
                    orderIndex: 1,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);

            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 5,
                totalScore: 10,
                percentage: 50,
                answeredCount: 2,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 1,
                requiresManualReview: true,
            });

            vi.mocked(calculateEssayWeightedScore).mockReturnValue(3.5);

            const evaluationsInput = {
                'q-essay-1': {
                    scores: {
                        contentSubstance: 3,
                        structureOrganization: 4,
                        argumentationSupport: 3,
                        styleTone: 3,
                        grammarConventions: 4,
                    },
                    feedback: 'Nice argument structures.',
                },
            };

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            const result = await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                actorUserId: '77777777-7777-7777-7777-777777777777',
                evaluations: evaluationsInput,
                itemOverrides: {
                    'q-essay-1': {
                        awardedScore: 4,
                        reason: 'Rounded up after review',
                    },
                },
                feedback: 'Nice job Alice!',
                finalize: true,
            });

            expect(result.score).toBe(9);
            expect(scoreExamAttempt).toHaveBeenCalled();
            expect(calculateEssayWeightedScore).toHaveBeenCalledWith(
                evaluationsInput['q-essay-1'].scores,
                5,
                expect.any(Object),
            );
            expect(setSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    score: 9,
                    answer_snapshot: expect.objectContaining({
                        _evaluations: {
                            'q-essay-1': expect.objectContaining({
                                score: 3.5,
                                feedback: 'Nice argument structures.',
                            }),
                        },
                        _itemOverrides: {
                            'q-essay-1': expect.objectContaining({
                                awardedScore: 4,
                                reason: 'Rounded up after review',
                                overriddenBy: '77777777-7777-7777-7777-777777777777',
                            }),
                        },
                        _grading: expect.objectContaining({
                            finalizedBy: '77777777-7777-7777-7777-777777777777',
                        }),
                        _feedback: 'Nice job Alice!',
                    }),
                }),
            );
        });

        it('rejects overrides above the question max points', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    'q-obj-1': 'A',
                },
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: {
                        prompt: 'Objective Prompt',
                        options: ['A', 'B'],
                        correctAnswer: 0,
                    },
                    points: 5,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 5,
                totalScore: 5,
                percentage: 100,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            await expect(
                updateGradingAttempt({
                    dbClient: mockDb as DbClient,
                    attemptId: '11111111-1111-1111-1111-111111111111',
                    evaluations: {},
                    itemOverrides: {
                        'q-obj-1': {
                            awardedScore: 6,
                        },
                    },
                }),
            ).rejects.toMatchObject({
                status: 400,
            });
        });

        it('allows updating an attempt with evaluations omitted', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    'q-obj-1': 'A',
                },
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: {
                        prompt: 'Objective Prompt',
                        options: ['A', 'B'],
                        correctAnswer: 0,
                    },
                    points: 5,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 5,
                totalScore: 5,
                percentage: 100,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            const result = await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                itemOverrides: {
                    'q-obj-1': {
                        awardedScore: 4,
                        reason: 'Correction',
                    },
                },
            });

            expect(result.score).toBe(4);
            expect(setSpy).toHaveBeenCalled();
        });

        it('allows finalizing essay questions with item overrides instead of rubric evaluations', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    'q-essay-1': 'Student essay response text',
                },
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-essay-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'ESSAY',
                    content: { prompt: 'Essay Prompt', maxLength: 1000 },
                    points: 5,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 0,
                totalScore: 5,
                percentage: 0,
                answeredCount: 1,
                autoGradableQuestionCount: 0,
                manualReviewQuestionCount: 1,
                requiresManualReview: true,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            const result = await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                itemOverrides: {
                    'q-essay-1': { awardedScore: 4, reason: 'Correction' },
                },
                finalize: true,
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            expect(result.score).toBe(4);
            expect(lastCallArgs.status).toBe('COMPLETED');
            expect(lastCallArgs.answer_snapshot._evaluations).toEqual({});
            expect(lastCallArgs.answer_snapshot._itemOverrides).toEqual({
                'q-essay-1': expect.objectContaining({
                    awardedScore: 4,
                    reason: 'Correction',
                }),
            });
        });

        it('rejects finalizing essay questions without an evaluation or item override', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    'q-essay-1': 'Student essay response text',
                },
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-essay-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'ESSAY',
                    content: { prompt: 'Essay Prompt', maxLength: 1000 },
                    points: 5,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 0,
                totalScore: 5,
                percentage: 0,
                answeredCount: 1,
                autoGradableQuestionCount: 0,
                manualReviewQuestionCount: 1,
                requiresManualReview: true,
            });

            await expect(
                updateGradingAttempt({
                    dbClient: mockDb as DbClient,
                    attemptId: '11111111-1111-1111-1111-111111111111',
                    finalize: true,
                }),
            ).rejects.toMatchObject({
                status: 400,
            });
        });

        it('preserves existing score overrides when itemOverrides is omitted', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    _itemOverrides: {
                        'q-obj-1': {
                            awardedScore: 2,
                            reason: 'Original Override',
                            overriddenBy: '123',
                            overriddenAt: '2026-06-28T00:00:00.000Z',
                        },
                    },
                },
                studentName: 'Alice Student',
                itemOverrides: {
                    'q-obj-1': {
                        awardedScore: 2,
                        reason: 'Original Override',
                        overriddenBy: '123',
                        overriddenAt: '2026-06-28T00:00:00.000Z',
                    },
                },
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 5,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 0,
                totalScore: 5,
                percentage: 0,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {},
                finalize: false,
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            expect(lastCallArgs.answer_snapshot._itemOverrides).toEqual({
                'q-obj-1': {
                    awardedScore: 2,
                    reason: 'Original Override',
                    overriddenBy: '123',
                    overriddenAt: '2026-06-28T00:00:00.000Z',
                },
            });
        });

        it('transitions IN_PROGRESS status and populates completed_at / total_score on finalize', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: null,
                score: 0,
                totalScore: null,
                status: 'IN_PROGRESS',
                answerSnapshot: {},
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 5,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 0,
                totalScore: 5,
                percentage: 0,
                answeredCount: 0,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            const res = await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {},
                finalize: true,
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            expect(lastCallArgs.status).toBe('COMPLETED');
            expect(lastCallArgs.completed_at).toBeDefined();
            expect(lastCallArgs.total_score).toBe(5);
            expect(res.totalScore).toBe(5);
        });

        it('preserves existing feedback when feedback parameter is undefined', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {
                    _feedback: 'Existing Feedback',
                },
                feedback: 'Existing Feedback',
                studentName: 'Alice Student',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 5,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 5,
                totalScore: 5,
                percentage: 100,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {},
                finalize: false,
                // feedback is omitted/undefined
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            expect(lastCallArgs.answer_snapshot._feedback).toBe('Existing Feedback');
        });

        it('writes initial_score on first override save when initial_score is null', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'Science Test',
                subjectTitle: 'Science',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 7,
                totalScore: 10,
                initialScore: null, // not yet captured
                status: 'COMPLETED',
                answerSnapshot: {},
                studentName: 'Bob Student',
            };

            const mockQuestions = [
                {
                    id: 'q-mc-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 10,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 7,
                totalScore: 10,
                percentage: 70,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {},
                finalize: false,
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            expect(lastCallArgs.initial_score).toBe(7); // captured from attempt.score
        });

        it('does NOT overwrite initial_score on subsequent saves when already set', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'Science Test',
                subjectTitle: 'Science',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 9, // overridden score
                totalScore: 10,
                initialScore: 7, // already captured from the first save
                status: 'COMPLETED',
                answerSnapshot: {},
                studentName: 'Bob Student',
            };

            const mockQuestions = [
                {
                    id: 'q-mc-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 10,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 9,
                totalScore: 10,
                percentage: 90,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {},
                finalize: false,
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            // initial_score should NOT be in the update payload when already set
            expect(lastCallArgs.initial_score).toBeUndefined();
        });

        it('writes total_score on save-overrides (finalize=false) if totalScore is null', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'Science Test',
                subjectTitle: 'Science',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: null,
                initialScore: 5,
                status: 'IN_PROGRESS',
                answerSnapshot: {},
                studentName: 'Bob Student',
            };

            const mockQuestions = [
                {
                    id: 'q-mc-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 10,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 5,
                totalScore: 10,
                percentage: 50,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {},
                finalize: false,
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            expect(lastCallArgs.total_score).toBe(10);
        });

        it('does NOT write total_score on save-overrides (finalize=false) if totalScore is already set', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'Science Test',
                subjectTitle: 'Science',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                initialScore: 5,
                status: 'COMPLETED',
                answerSnapshot: {},
                studentName: 'Bob Student',
            };

            const mockQuestions = [
                {
                    id: 'q-mc-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 10,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 5,
                totalScore: 10,
                percentage: 50,
                answeredCount: 1,
                autoGradableQuestionCount: 1,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
            });

            const setSpy = vi.fn().mockReturnValue(mockDb);
            mockDb.set = setSpy;

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {},
                finalize: false,
            });

            const lastCallArgs = setSpy.mock.calls[0][0];
            expect(lastCallArgs.total_score).toBeUndefined();
        });

        it('blocks ordinary edits when scoreState is FINALIZED', async () => {
            const mockAttempt = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: '22222222-2222-2222-2222-222222222222',
                examTitle: 'History Final',
                subjectTitle: 'History',
                studentId: '33333333-3333-3333-3333-333333333333',
                studentNumber: '2026-0001',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 5,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {},
                studentName: 'Alice Student',
                scoreState: 'FINALIZED',
            };

            const mockQuestions = [
                {
                    id: 'q-obj-1',
                    examId: '22222222-2222-2222-2222-222222222222',
                    type: 'MULTIPLE_CHOICE',
                    content: { prompt: 'Q1' },
                    points: 10,
                    orderIndex: 0,
                },
            ];

            mockDb.executeTakeFirst.mockResolvedValue(mockAttempt);
            mockDb.execute.mockResolvedValue(mockQuestions);

            await expect(
                updateGradingAttempt({
                    dbClient: mockDb as DbClient,
                    attemptId: '11111111-1111-1111-1111-111111111111',
                    evaluations: {},
                    finalize: false,
                }),
            ).rejects.toThrow('Cannot edit grading for a finalized attempt score.');
        });

        it('calculates attempt scores against their respective rubric snapshots (rubric v1 vs rubric v2)', async () => {
            const rubricV1 = {
                id: 'rubric-v1',
                versionNumber: 1,
                source: 'BASELINE' as const,
                definition: {
                    criteria: [
                        {
                            key: 'content',
                            name: 'Content',
                            weight: 1.0,
                            description: 'v1 desc',
                            levels: { '0': 'L0', '1': 'L1', '2': 'L2', '3': 'L3', '4': 'L4' },
                        },
                    ],
                },
                updatedAt: null,
            };

            const rubricV2 = {
                id: 'rubric-v2',
                versionNumber: 2,
                source: 'EXAM_OVERRIDE' as const,
                definition: {
                    criteria: [
                        {
                            key: 'creativity',
                            name: 'Creativity',
                            weight: 1.0,
                            description: 'v2 desc',
                            levels: { '0': 'L0', '1': 'L1', '2': 'L2', '3': 'L3', '4': 'L4' },
                        },
                    ],
                },
                updatedAt: null,
            };

            const questionId = '44444444-4444-4444-4444-444444444444';
            const examId = '33333333-3333-3333-3333-333333333333';

            const questions = [
                {
                    id: questionId,
                    examId: examId,
                    type: 'ESSAY' as const,
                    content: { prompt: 'Q1' },
                    points: 10,
                    orderIndex: 0,
                    sourceFileName: null,
                    sourcePageNumber: null,
                    sourceEvidence: null,
                    passageContent: null,
                    passageType: null,
                },
            ];

            const attemptA = {
                attemptId: '11111111-1111-1111-1111-111111111111',
                examId: examId,
                studentName: 'Alice',
                studentNumber: '1',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 0,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {},
                assessmentSnapshot: {
                    version: 'attempt-assessment.v2' as const,
                    attemptId: '11111111-1111-1111-1111-111111111111',
                    examId: examId,
                    seed: 'some-seed',
                    settings: {},
                    configuration: {},
                    questions,
                    totalScore: 10,
                    rubric: rubricV1,
                },
            };

            mockDb.executeTakeFirst.mockResolvedValueOnce(attemptA);
            mockDb.execute.mockResolvedValueOnce([]);

            vi.mocked(calculateEssayWeightedScore).mockReturnValue(8);
            vi.mocked(scoreExamAttempt).mockReturnValue({
                score: 0,
                totalScore: 10,
                percentage: 0,
                answeredCount: 1,
                autoGradableQuestionCount: 0,
                manualReviewQuestionCount: 1,
                requiresManualReview: true,
            });

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '11111111-1111-1111-1111-111111111111',
                evaluations: {
                    [questionId]: {
                        scores: { content: 4 },
                        feedback: null,
                    },
                },
                finalize: false,
            });

            expect(calculateEssayWeightedScore).toHaveBeenCalledWith(
                { content: 4 },
                10,
                rubricV1.definition,
            );

            const attemptB = {
                attemptId: '22222222-2222-2222-2222-222222222222',
                examId: examId,
                studentName: 'Bob',
                studentNumber: '2',
                completedAt: new Date('2026-04-18T09:30:00.000Z'),
                score: 0,
                totalScore: 10,
                status: 'COMPLETED',
                answerSnapshot: {},
                assessmentSnapshot: {
                    version: 'attempt-assessment.v2' as const,
                    attemptId: '22222222-2222-2222-2222-222222222222',
                    examId: examId,
                    seed: 'some-seed',
                    settings: {},
                    configuration: {},
                    questions,
                    totalScore: 10,
                    rubric: rubricV2,
                },
            };

            mockDb.executeTakeFirst.mockResolvedValueOnce(attemptB);
            mockDb.execute.mockResolvedValueOnce([]);

            await updateGradingAttempt({
                dbClient: mockDb as DbClient,
                attemptId: '22222222-2222-2222-2222-222222222222',
                evaluations: {
                    [questionId]: {
                        scores: { creativity: 4 },
                        feedback: null,
                    },
                },
                finalize: false,
            });

            expect(calculateEssayWeightedScore).toHaveBeenCalledWith(
                { creativity: 4 },
                10,
                rubricV2.definition,
            );
        });
    });
});
