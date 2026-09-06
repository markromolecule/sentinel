import { type DbClient } from '@sentinel/db';
import { SessionRepository } from '../data/session.repository';
import { buildCompletedSessionResponse } from './complete-session/complete-session.response';
import { assertCompletableAttempt } from './complete-session/complete-session.guards';
import { persistCompletedSession } from './complete-session/complete-session.persistence';
import { buildCompleteSessionScoringContext } from './complete-session/complete-session.scoring';
import {
    notifyCompletedSession,
    triggerQuestionCalibration,
} from './complete-session/complete-session.side-effects';
import type { CompleteSessionServiceArgs } from './complete-session/complete-session.types';

/**
 * Completes a student exam session.
 * Fetches questions and configurations, shuffles/randomizes questions and choices,
 * scores the attempt, saves details to database, triggers logging/notifications,
 * and calibrates question difficulty asynchronously.
 */
export async function completeSessionService({
    dbClient,
    studentUserId,
    body,
}: CompleteSessionServiceArgs) {
    const attempt = await SessionRepository.getOwnedSessionAttempt(dbClient, {
        sessionId: body.sessionId,
        studentUserId,
    });
    const attemptContext = assertCompletableAttempt(attempt);
    const scoringContext = await buildCompleteSessionScoringContext({
        dbClient,
        body,
        attemptContext,
    });
    const completedAttempt = await persistCompletedSession({
        dbClient,
        studentUserId,
        body,
        attemptContext,
        summary: scoringContext.summary,
        scoreSnapshot: scoringContext.scoreSnapshot,
        answerChecksum: scoringContext.answerChecksum,
        evaluations: scoringContext.evaluations,
    });

    void notifyCompletedSession({
        dbClient,
        studentUserId,
        body,
        attemptContext,
        completedAttempt,
        summary: scoringContext.summary,
    });

    triggerQuestionCalibration({
        dbClient,
        assessmentSnapshot: scoringContext.assessmentSnapshot,
    });

    return buildCompletedSessionResponse({
        completedAttempt,
        summary: scoringContext.summary,
    });
}
