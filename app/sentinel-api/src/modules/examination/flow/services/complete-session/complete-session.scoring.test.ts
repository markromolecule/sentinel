import { describe, expect, it, vi } from 'vitest';
import { LEGACY_ESSAY_RUBRIC } from '@sentinel/shared';
import { buildCompleteSessionScoringContext } from './complete-session.scoring';

describe('buildCompleteSessionScoringContext with essay rubric pre-scoring', () => {
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

    it('evaluates essay answers deterministically and injects evaluations into the score snapshot', async () => {
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

        const attemptContext = {
            attempt: {
                attempt_id: 'attempt-1',
                lifecycle_state: 'IN_PROGRESS',
                assessment_snapshot: mockAssessmentSnapshot,
            } as any,
            examId: 'exam-1',
            studentId: 'student-1',
        };

        const body = {
            sessionId: 'attempt-1',
            answers: {
                'q-mc': '4',
                'q-essay': substantiveEssay,
            },
            elapsedSeconds: 300,
        };

        const result = await buildCompleteSessionScoringContext({
            dbClient: mockDbClient,
            body,
            attemptContext,
        });

        expect(result.evaluations).toBeDefined();
        expect(result.evaluations).toHaveProperty('q-essay');

        const essayEval = result.evaluations!['q-essay'];
        expect(essayEval.scores.contentSubstance).toBeGreaterThanOrEqual(3);
        expect(essayEval.scores.structureOrganization).toBeGreaterThanOrEqual(3);
        expect(essayEval.score).toBeGreaterThan(15);
        expect(essayEval.feedback).toMatch(/words/i);

        // Multiple choice score is 10, essay score is >= 20 -> total score >= 30
        expect(result.scoreSnapshot.score).toBeGreaterThanOrEqual(30);

        const essayReport = result.scoreSnapshot.questionReports.find((r) => r.questionId === 'q-essay');
        expect(essayReport?.awardedScore).toBe(essayEval.score);
    });

    it('fast-paths empty essay answers to score 0 across all rubric criteria', async () => {
        const attemptContext = {
            attempt: {
                attempt_id: 'attempt-1',
                lifecycle_state: 'IN_PROGRESS',
                assessment_snapshot: mockAssessmentSnapshot,
            } as any,
            examId: 'exam-1',
            studentId: 'student-1',
        };

        const body = {
            sessionId: 'attempt-1',
            answers: {
                'q-mc': '4',
                'q-essay': '',
            },
            elapsedSeconds: 120,
        };

        const result = await buildCompleteSessionScoringContext({
            dbClient: mockDbClient,
            body,
            attemptContext,
        });

        const essayEval = result.evaluations!['q-essay'];
        expect(essayEval.scores.contentSubstance).toBe(0);
        expect(essayEval.scores.structureOrganization).toBe(0);
        expect(essayEval.score).toBe(0);
        expect(essayEval.feedback).toMatch(/No substantive response submitted/i);

        // Only objective score awarded (10 pts)
        expect(result.scoreSnapshot.score).toBe(10);
    });
});
