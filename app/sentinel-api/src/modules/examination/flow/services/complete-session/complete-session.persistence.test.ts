import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { executeTransaction } from '@sentinel/db';
import { persistCompletedSession } from './complete-session.persistence';
import { ATTEMPT_SCORING_VERSION } from '../attempt-snapshot.service';

const hoisted = vi.hoisted(() => {
    const currentTrx = {
        updateTable: vi.fn(),
        selectFrom: vi.fn(),
    };

    const executeTransactionMock = vi.fn(async (callback: (trx: unknown) => Promise<unknown>) =>
        callback(currentTrx as never),
    );
    const appendExamAttemptLifecycleEventMock = vi.fn();
    const dbClient = {
        transaction: vi.fn(),
    };

    return {
        currentTrx,
        executeTransactionMock,
        appendExamAttemptLifecycleEventMock,
        dbClient,
    };
});

type TxnResult = {
    updateResult?: { attempt_id: string; completed_at: Date | null } | undefined;
    ownedAttemptResult?: Record<string, unknown> | undefined;
};

vi.mock('@sentinel/db', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/db')>('@sentinel/db');
    return {
        ...actual,
        executeTransaction: hoisted.executeTransactionMock,
    };
});

vi.mock('../../../lifecycle/services/lifecycle-event.service', () => ({
    appendExamAttemptLifecycleEvent: hoisted.appendExamAttemptLifecycleEventMock,
}));

function buildScoreSnapshot(answerChecksum: string) {
    return {
        version: 'attempt-score.v1',
        scoringVersion: ATTEMPT_SCORING_VERSION,
        generatedAt: '2026-08-04T00:00:00.000Z',
        answerChecksum,
        score: 5,
        totalScore: 5,
        percentage: 100,
        answeredCount: 1,
        autoGradableQuestionCount: 1,
        manualReviewQuestionCount: 0,
        requiresManualReview: false,
        questionReports: [],
    } as const;
}

function makeTransactionClient(result: TxnResult) {
    const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(result.updateResult),
    };

    const selectBuilder = {
        innerJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        forUpdate: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(result.ownedAttemptResult),
    };

    hoisted.currentTrx.updateTable = vi.fn().mockReturnValue(updateBuilder);
    hoisted.currentTrx.selectFrom = vi.fn().mockReturnValue(selectBuilder);

    return {
        updateBuilder,
        selectBuilder,
        transactionClient: hoisted.currentTrx,
    };
}

describe('persistCompletedSession', () => {
    const baseArgs = {
        dbClient: hoisted.dbClient as never,
        studentUserId: 'student-1',
        body: {
            sessionId: 'attempt-1',
            answers: { 'question-1': true },
            elapsedSeconds: 121,
        },
        attemptContext: {
            attempt: {
                attempt_id: 'attempt-1',
                exam_id: 'exam-1',
                student_id: 'student-1',
                lifecycle_state: 'IN_PROGRESS',
            },
            examId: 'exam-1',
            studentId: 'student-1',
        },
        summary: {
            score: 5,
            totalScore: 5,
            percentage: 100,
            answeredCount: 1,
            autoGradableQuestionCount: 1,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        },
        scoreSnapshot: buildScoreSnapshot('checksum-1'),
        answerChecksum: 'checksum-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('routes completion through the shared transaction bridge and keeps all writes on one scoped client', async () => {
        const { updateBuilder, transactionClient } = makeTransactionClient({
            updateResult: {
                attempt_id: 'attempt-1',
                completed_at: new Date('2026-08-04T00:00:01.000Z'),
            },
            ownedAttemptResult: undefined,
        });

        const result = await persistCompletedSession(baseArgs as never);

        expect(result).toEqual({
            attempt_id: 'attempt-1',
            completed_at: new Date('2026-08-04T00:00:01.000Z'),
        });
        expect(executeTransaction).toHaveBeenCalledTimes(1);
        expect(hoisted.dbClient.transaction).not.toHaveBeenCalled();
        expect(transactionClient.updateTable).toHaveBeenCalledWith('exam_attempts');
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                score: 5,
                initial_score: 5,
                total_score: 5,
                answered_question_count: 1,
                scoring_version: ATTEMPT_SCORING_VERSION,
                lifecycle_state: 'SUBMITTED',
                status: 'COMPLETED',
            }),
        );
        expect(hoisted.appendExamAttemptLifecycleEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                dbClient: transactionClient,
                attemptId: 'attempt-1',
            }),
        );
    });

    it('reuses the same prepared result when the checksum matches an already completed attempt', async () => {
        const { transactionClient } = makeTransactionClient({
            updateResult: {
                attempt_id: 'attempt-1',
                completed_at: null,
            },
            ownedAttemptResult: {
                attempt_id: 'attempt-1',
                completed_at: new Date('2026-08-04T00:00:01.000Z'),
                status: 'COMPLETED',
                score_snapshot: buildScoreSnapshot('checksum-1'),
            },
        });

        const result = await persistCompletedSession(baseArgs as never);

        expect(result).toEqual({
            attempt_id: 'attempt-1',
            completed_at: new Date('2026-08-04T00:00:01.000Z'),
            reusedExistingResult: true,
        });
        expect(transactionClient.selectFrom).toHaveBeenCalled();
        expect(hoisted.appendExamAttemptLifecycleEventMock).not.toHaveBeenCalled();
    });

    it('rejects when the already completed attempt has a different checksum', async () => {
        makeTransactionClient({
            updateResult: {
                attempt_id: 'attempt-1',
                completed_at: null,
            },
            ownedAttemptResult: {
                attempt_id: 'attempt-1',
                completed_at: new Date('2026-08-04T00:00:01.000Z'),
                status: 'COMPLETED',
                score_snapshot: buildScoreSnapshot('checksum-2'),
            },
        });

        await expect(persistCompletedSession(baseArgs as never)).rejects.toMatchObject({
            status: 409,
            message:
                'This exam session was already submitted with a different prepared result. Please refresh the history view.',
        } satisfies Partial<HTTPException>);
        expect(hoisted.appendExamAttemptLifecycleEventMock).not.toHaveBeenCalled();
    });

    it('rejects when the lifecycle changes before completion is stamped', async () => {
        makeTransactionClient({
            updateResult: undefined,
            ownedAttemptResult: {
                attempt_id: 'attempt-1',
                completed_at: null,
                status: 'IN_PROGRESS',
                score_snapshot: null,
            },
        });

        await expect(persistCompletedSession(baseArgs as never)).rejects.toMatchObject({
            status: 409,
            message: 'This exam session could not be submitted because its lifecycle changed.',
        } satisfies Partial<HTTPException>);
        expect(hoisted.appendExamAttemptLifecycleEventMock).not.toHaveBeenCalled();
    });

    it('rejects when the completion update never stamps a completed_at value', async () => {
        makeTransactionClient({
            updateResult: {
                attempt_id: 'attempt-1',
                completed_at: null,
            },
            ownedAttemptResult: undefined,
        });

        await expect(persistCompletedSession(baseArgs as never)).rejects.toMatchObject({
            status: 409,
            message: 'This exam session could not be submitted because its lifecycle changed.',
        } satisfies Partial<HTTPException>);
        expect(hoisted.appendExamAttemptLifecycleEventMock).not.toHaveBeenCalled();
    });
});
