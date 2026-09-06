import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LEGACY_ESSAY_RUBRIC } from '@sentinel/shared';
import { prepareSessionService } from './prepare-session.service';
import { buildCompleteSessionScoringContext } from './complete-session/complete-session.scoring';
import { SessionRepository } from '../data/session.repository';

describe('prepareSessionService with essay rubric pre-scoring', () => {
    const mockDbClient = {} as any;

    const mockAssessmentSnapshot = {
        version: 'attempt-assessment.v2' as const,
        attemptId: 'attempt-1',
        examId: 'exam-1',
        seed: 'attempt-1',
        settings: {},
        configuration: {},
        totalScore: 40,
        rubric: {
            id: 'legacy-standard-v1',
            versionNumber: 1,
            source: 'LEGACY' as const,
            definition: LEGACY_ESSAY_RUBRIC,
        },
        questions: [
            {
                id: 'q-mc',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 10,
                orderIndex: 0,
                content: {
                    prompt: 'What is 2+2?',
                    options: ['3', '4', '5'],
                    correctAnswer: '4',
                },
            },
            {
                id: 'q-essay',
                examId: 'exam-1',
                type: 'ESSAY',
                points: 30,
                orderIndex: 1,
                content: {
                    prompt: 'Explain the concept of encapsulation in object-oriented programming with concrete examples.',
                },
            },
        ],
    };

    const substantiveEssay = `
        Encapsulation is a core principle of object-oriented programming that binds data and functions together.
        Specifically, it restricts direct access to internal state using private fields and public getter and setter methods.

        Furthermore, encapsulation prevents unwanted data corruption and enforces domain invariants. For example, in a BankAccount
        class, the balance field is private. The deposit and withdraw methods validate amounts before updating the balance,
        ensuring the account never reaches an invalid state. Consequently, external modules cannot arbitrarily modify internal state.

        In addition, keeping implementation details hidden enables developers to refactor internal algorithms without breaking
        external dependencies. By providing clean abstraction barriers, software systems achieve modularity and testability.

        In conclusion, encapsulation lowers coupling across system components and enhances overall system robustness and maintainability.
    `;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('evaluates essay answers with rubric and awards points in prepareSessionService', async () => {
        vi.spyOn(SessionRepository, 'getOwnedSessionAttempt').mockResolvedValue({
            attempt_id: 'attempt-1',
            exam_id: 'exam-1',
            student_id: 'student-1',
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            assessment_snapshot: mockAssessmentSnapshot,
        } as any);

        const body = {
            sessionId: 'attempt-1',
            answers: {
                'q-mc': '4',
                'q-essay': substantiveEssay,
            },
            elapsedSeconds: 300,
        };

        const result = await prepareSessionService({
            dbClient: mockDbClient,
            studentUserId: 'student-1',
            body,
        });

        // MC score is 10, essay score should be >= 20 -> total score >= 30
        expect(result.score).toBeGreaterThanOrEqual(30);
        expect(result.totalScore).toBe(40);
        expect(result.percentage).toBeGreaterThanOrEqual(75);
        expect(result.answeredCount).toBe(2);
        expect(result.preparationToken).toBeDefined();
    });

    it('produces score snapshot parity with buildCompleteSessionScoringContext for identical answers', async () => {
        const attemptRecord = {
            attempt_id: 'attempt-1',
            exam_id: 'exam-1',
            student_id: 'student-1',
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            assessment_snapshot: mockAssessmentSnapshot,
        };

        vi.spyOn(SessionRepository, 'getOwnedSessionAttempt').mockResolvedValue(attemptRecord as any);

        const body = {
            sessionId: 'attempt-1',
            answers: {
                'q-mc': '4',
                'q-essay': substantiveEssay,
            },
            elapsedSeconds: 300,
        };

        const preparedResult = await prepareSessionService({
            dbClient: mockDbClient,
            studentUserId: 'student-1',
            body,
        });

        const completeResult = await buildCompleteSessionScoringContext({
            dbClient: mockDbClient,
            body,
            attemptContext: {
                attempt: attemptRecord as any,
                examId: 'exam-1',
                studentId: 'student-1',
            },
        });

        // Exact parity between prepare result preview and complete session summary
        expect(preparedResult.score).toBe(completeResult.summary.score);
        expect(preparedResult.totalScore).toBe(completeResult.summary.totalScore);
        expect(preparedResult.percentage).toBe(completeResult.summary.percentage);
        expect(preparedResult.answeredCount).toBe(completeResult.summary.answeredCount);
        expect(preparedResult.autoGradableQuestionCount).toBe(completeResult.summary.autoGradableQuestionCount);
        expect(preparedResult.manualReviewQuestionCount).toBe(completeResult.summary.manualReviewQuestionCount);
        expect(preparedResult.requiresManualReview).toBe(completeResult.summary.requiresManualReview);
    });

    it('fast-paths empty essay answers to 0 points without errors in prepareSessionService', async () => {
        vi.spyOn(SessionRepository, 'getOwnedSessionAttempt').mockResolvedValue({
            attempt_id: 'attempt-1',
            exam_id: 'exam-1',
            student_id: 'student-1',
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            assessment_snapshot: mockAssessmentSnapshot,
        } as any);

        const body = {
            sessionId: 'attempt-1',
            answers: {
                'q-mc': '4',
                'q-essay': '',
            },
            elapsedSeconds: 120,
        };

        const result = await prepareSessionService({
            dbClient: mockDbClient,
            studentUserId: 'student-1',
            body,
        });

        // Only multiple choice is scored (10 pts)
        expect(result.score).toBe(10);
        expect(result.totalScore).toBe(40);
        expect(result.percentage).toBe(25);
    });
});
