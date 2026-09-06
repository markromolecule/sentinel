import { HTTPException } from 'hono/http-exception';
import { type ExamAttemptAnswers } from '@sentinel/shared';
import { executeTransaction, type DbClient } from '@sentinel/db';
import { SessionRepository } from '../../data/session.repository';
import { appendExamAttemptLifecycleEvent } from '../../../lifecycle/services/lifecycle-event.service';
import { ATTEMPT_SCORING_VERSION, parseScoreSnapshot } from '../attempt-snapshot.service';
import type { CompletedAttemptResult, PersistCompleteSessionArgs } from './complete-session.types';
import { assertCompletedAttemptTimestamp } from './complete-session.guards';

export async function persistCompletedSession(
    args: PersistCompleteSessionArgs,
): Promise<CompletedAttemptResult> {
    const {
        dbClient,
        studentUserId,
        body,
        attemptContext,
        summary,
        scoreSnapshot,
        answerChecksum,
        evaluations,
    } = args;
    const { attempt, examId, studentId } = attemptContext;

    const answersWithEvaluations = {
        ...body.answers,
        ...(evaluations && Object.keys(evaluations).length > 0
            ? { _evaluations: evaluations }
            : {}),
    } as unknown as ExamAttemptAnswers;

    return executeTransaction(async (trx) => {
        const updatedAttempt = await SessionRepository.completeSession(trx, {
            sessionId: body.sessionId,
            score: summary.score,
            initialScore: summary.score,
            totalScore: summary.totalScore,
            timeSpentMinutes: body.elapsedSeconds > 0 ? Math.ceil(body.elapsedSeconds / 60) : 0,
            answeredCount: summary.answeredCount,
            answers: answersWithEvaluations,
            scoreSnapshot,
            scoringVersion: ATTEMPT_SCORING_VERSION,
        });

        if (!updatedAttempt?.completed_at) {
            const latestAttempt = await SessionRepository.getOwnedSessionAttempt(trx, {
                sessionId: body.sessionId,
                studentUserId,
            });
            const latestScoreSnapshot = parseScoreSnapshot(latestAttempt?.score_snapshot);

            if (
                latestAttempt?.completed_at &&
                latestAttempt.status === 'COMPLETED' &&
                latestScoreSnapshot
            ) {
                if (latestScoreSnapshot.answerChecksum === answerChecksum) {
                    return {
                        attempt_id: latestAttempt.attempt_id,
                        completed_at: latestAttempt.completed_at,
                        reusedExistingResult: true as const,
                    };
                }

                throw new HTTPException(409, {
                    message:
                        'This exam session was already submitted with a different prepared result. Please refresh the history view.',
                });
            }

            throw new HTTPException(409, {
                message: 'This exam session could not be submitted because its lifecycle changed.',
            });
        }

        await appendExamAttemptLifecycleEvent({
            dbClient: trx,
            attemptId: updatedAttempt.attempt_id,
            examId,
            studentId,
            eventType: 'SUBMITTED',
            previousState: (attempt.lifecycle_state as any) ?? 'IN_PROGRESS',
            nextState: 'SUBMITTED',
            actorUserId: studentUserId,
            notes: 'Submitted from complete session flow',
            metadata: {
                scoringVersion: ATTEMPT_SCORING_VERSION,
                answerChecksum,
            },
        });

        return {
            attempt_id: updatedAttempt.attempt_id,
            completed_at: assertCompletedAttemptTimestamp(updatedAttempt.completed_at),
        };
    });
}
