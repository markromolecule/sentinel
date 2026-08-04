import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { dbClient, transactionStorage } from '@sentinel/db';
import { testWithDbClient } from '../../../../../lib/test-with-db-client';
import * as lifecycleEventService from '../../../lifecycle/services/lifecycle-event.service';
import { persistCompletedSession } from './complete-session.persistence';
import { ATTEMPT_SCORING_VERSION } from '../attempt-snapshot.service';

type Fixture = {
    userId: string;
    studentId: string;
    examId: string;
    attemptId: string;
};

const lifecycleFailureSpy = vi.spyOn(lifecycleEventService, 'appendExamAttemptLifecycleEvent');

const fixture: Fixture = {
    userId: '',
    studentId: '',
    examId: '',
    attemptId: '',
};

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

async function seedCommittedFixture() {
    const suffix = randomUUID().slice(0, 8);

    const user = await dbClient
        .insertInto('users')
        .values({
            id: randomUUID(),
            email: `turn-in-student-${suffix}@sentinel.test`,
            role: 'student',
            created_at: new Date('2026-08-04T00:00:00.000Z'),
            updated_at: new Date('2026-08-04T00:00:00.000Z'),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const student = await dbClient
        .insertInto('students')
        .values({
            user_id: user.id,
            student_number: `turn-in-${suffix}`,
            created_at: new Date('2026-08-04T00:00:00.000Z'),
            updated_at: new Date('2026-08-04T00:00:00.000Z'),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const exam = await dbClient
        .insertInto('exams')
        .values({
            title: `Turn-in Atomicity Exam ${suffix}`,
            duration_minutes: 60,
            created_at: new Date('2026-08-04T00:00:00.000Z'),
            updated_at: new Date('2026-08-04T00:00:00.000Z'),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const attempt = await dbClient
        .insertInto('exam_attempts')
        .values({
            attempt_id: randomUUID(),
            exam_id: exam.exam_id,
            student_id: student.student_id,
            started_at: new Date('2026-08-04T00:00:00.000Z'),
            created_at: new Date('2026-08-04T00:00:00.000Z'),
            time_spent_minutes: 0,
            answered_question_count: 0,
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            score_state: 'DRAFT',
            is_verified: false,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    fixture.userId = user.id;
    fixture.studentId = student.student_id;
    fixture.examId = exam.exam_id;
    fixture.attemptId = attempt.attempt_id;
}

async function deleteCommittedFixture() {
    if (!fixture.attemptId) {
        return;
    }

    await dbClient
        .deleteFrom('exam_attempt_lifecycle_events')
        .where('attempt_id', '=', fixture.attemptId)
        .execute();
    await dbClient.deleteFrom('exam_attempts').where('attempt_id', '=', fixture.attemptId).execute();
    await dbClient.deleteFrom('students').where('student_id', '=', fixture.studentId).execute();
    await dbClient.deleteFrom('users').where('id', '=', fixture.userId).execute();
    await dbClient.deleteFrom('exams').where('exam_id', '=', fixture.examId).execute();
}

describe('persistCompletedSession atomicity', () => {
    beforeAll(async () => {
        await seedCommittedFixture();
    });

    afterAll(async () => {
        await deleteCommittedFixture();
    });

    testWithDbClient(
        'rolls back the completion update when lifecycle event insertion fails',
        async () => {
            lifecycleFailureSpy.mockRejectedValueOnce(new Error('lifecycle insert failed'));

            await expect(
                transactionStorage.exit(() =>
                    persistCompletedSession({
                        dbClient: dbClient as never,
                        studentUserId: fixture.userId,
                        body: {
                            sessionId: fixture.attemptId,
                            answers: { 'question-1': true },
                            elapsedSeconds: 121,
                        },
                        attemptContext: {
                            attempt: {
                                attempt_id: fixture.attemptId,
                                exam_id: fixture.examId,
                                student_id: fixture.studentId,
                                lifecycle_state: 'IN_PROGRESS',
                            },
                            examId: fixture.examId,
                            studentId: fixture.studentId,
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
                        scoreSnapshot: buildScoreSnapshot('checksum-rollback'),
                        answerChecksum: 'checksum-rollback',
                    }),
                ),
            ).rejects.toThrow('lifecycle insert failed');

            const attempt = await dbClient
                .selectFrom('exam_attempts')
                .select([
                    'status',
                    'completed_at',
                    'score_snapshot',
                    'lifecycle_state',
                    'answered_question_count',
                ])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            const lifecycleEvents = await dbClient
                .selectFrom('exam_attempt_lifecycle_events')
                .select(['event_type'])
                .where('attempt_id', '=', fixture.attemptId)
                .execute();

            expect(attempt).toMatchObject({
                status: 'IN_PROGRESS',
                completed_at: null,
                score_snapshot: null,
                lifecycle_state: 'IN_PROGRESS',
                answered_question_count: 0,
            });
            expect(lifecycleEvents).toHaveLength(0);
        },
    );

    testWithDbClient('persists one submitted result and reuses it on retry', async () => {
        const args = {
            dbClient: dbClient as never,
            studentUserId: fixture.userId,
            body: {
                sessionId: fixture.attemptId,
                answers: { 'question-1': true },
                elapsedSeconds: 121,
            },
            attemptContext: {
                attempt: {
                    attempt_id: fixture.attemptId,
                    exam_id: fixture.examId,
                    student_id: fixture.studentId,
                    lifecycle_state: 'IN_PROGRESS',
                },
                examId: fixture.examId,
                studentId: fixture.studentId,
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
            scoreSnapshot: buildScoreSnapshot('checksum-retry'),
            answerChecksum: 'checksum-retry',
        } as const;

        const firstResult = await transactionStorage.exit(() => persistCompletedSession(args as never));
        const secondResult = await transactionStorage.exit(() => persistCompletedSession(args as never));

        expect(firstResult).toMatchObject({
            attempt_id: fixture.attemptId,
            completed_at: expect.any(Date),
        });
        expect(secondResult).toMatchObject({
            attempt_id: fixture.attemptId,
            reusedExistingResult: true,
        });

        const attempt = await dbClient
            .selectFrom('exam_attempts')
            .select(['status', 'completed_at', 'score_snapshot', 'lifecycle_state'])
            .where('attempt_id', '=', fixture.attemptId)
            .executeTakeFirstOrThrow();
        const lifecycleEvents = await dbClient
            .selectFrom('exam_attempt_lifecycle_events')
            .select(['event_type', 'attempt_id'])
            .where('attempt_id', '=', fixture.attemptId)
            .execute();

        expect(attempt.status).toBe('COMPLETED');
        expect(attempt.lifecycle_state).toBe('SUBMITTED');
        expect(attempt.completed_at).toBeInstanceOf(Date);
        expect(attempt.score_snapshot).not.toBeNull();
        expect(lifecycleEvents).toHaveLength(1);
        expect(lifecycleEvents[0]).toMatchObject({
            event_type: 'SUBMITTED',
            attempt_id: fixture.attemptId,
        });
    });
});
