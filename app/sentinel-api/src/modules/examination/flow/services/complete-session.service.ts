import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { type ExamAttemptAnswers } from '@sentinel/shared';
import { SessionRepository } from '../data/session.repository';
import type { CompleteSessionBody } from '../flow.dto';
import { calibrateQuestionDifficulty } from '../../../content/question-bank/services/calibrate-question-difficulty.service';
import { LogsService } from '../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import { getExamConfigurationState } from '../../configuration/configuration.service';
import { getExamQuestionsData } from '../../exams/data/get-exam-questions';
import {
    ATTEMPT_SCORING_VERSION,
    buildAnswerPayloadChecksum,
    buildAssessmentSnapshot,
    buildScoreSnapshot,
    parseAssessmentSnapshot,
    parseScoreSnapshot,
} from './attempt-snapshot.service';
import { buildPreparationToken } from './prepare-session.service';
import { appendExamAttemptLifecycleEvent } from '../../lifecycle/services/lifecycle-event.service';
import { logScoreIntegrityCheck } from '../../shared/services/score-integrity-observability.service';

export type CompleteSessionServiceArgs = {
    dbClient: DbClient;
    studentUserId: string;
    body: CompleteSessionBody;
};

async function executeInTransactionIfAvailable<T>(
    dbClient: DbClient,
    callback: (trx: DbClient) => Promise<T>,
) {
    const maybeTransactional = dbClient as DbClient & {
        transaction?: () => {
            execute: <R>(cb: (trx: DbClient) => Promise<R>) => Promise<R>;
        };
    };

    if (typeof maybeTransactional.transaction === 'function') {
        return maybeTransactional.transaction().execute(callback);
    }

    return callback(dbClient);
}

function resolveSubmissionLifecycleConflictMessage(lifecycleState?: string | null) {
    if (lifecycleState === 'LOCKED') {
        return 'This exam attempt is locked and cannot be submitted right now.';
    }

    if (lifecycleState === 'SUPERSEDED') {
        return 'This exam attempt was replaced by a newer attempt and can no longer be submitted.';
    }

    return 'This exam attempt has been closed and can no longer be submitted.';
}

function buildSummaryFromScoreSnapshot(scoreSnapshot: ReturnType<typeof parseScoreSnapshot>) {
    if (!scoreSnapshot) {
        return null;
    }

    return {
        score: scoreSnapshot.score,
        totalScore: scoreSnapshot.totalScore,
        percentage: scoreSnapshot.percentage,
        answeredCount: scoreSnapshot.answeredCount,
        autoGradableQuestionCount: scoreSnapshot.autoGradableQuestionCount,
        manualReviewQuestionCount: scoreSnapshot.manualReviewQuestionCount,
        requiresManualReview: scoreSnapshot.requiresManualReview,
    };
}

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

    if (!attempt?.exam_id) {
        throw new HTTPException(404, {
            message: 'Exam session not found for the authenticated student.',
        });
    }

    if (attempt.completed_at || attempt.status === 'COMPLETED') {
        throw new HTTPException(409, {
            message: 'This exam session has already been submitted.',
        });
    }

    if (attempt.status !== 'IN_PROGRESS') {
        throw new HTTPException(409, {
            message: 'This exam session is not active anymore.',
        });
    }

    if (
        attempt.lifecycle_state === 'LOCKED' ||
        attempt.lifecycle_state === 'CLOSED' ||
        attempt.lifecycle_state === 'SUPERSEDED'
    ) {
        throw new HTTPException(409, {
            message: resolveSubmissionLifecycleConflictMessage(attempt.lifecycle_state),
        });
    }

    const assessmentSnapshot =
        parseAssessmentSnapshot(attempt.assessment_snapshot) ??
        buildAssessmentSnapshot({
            attemptId: body.sessionId,
            examId: attempt.exam_id,
            configurationState: await getExamConfigurationState(dbClient, attempt.exam_id),
            questions: await getExamQuestionsData({
                dbClient,
                examId: attempt.exam_id,
            }),
        });

    if (!assessmentSnapshot) {
        throw new HTTPException(409, {
            message: 'This exam attempt is missing its assessment snapshot and cannot be scored.',
        });
    }

    const answerChecksum = buildAnswerPayloadChecksum({
        attemptId: body.sessionId,
        answers: body.answers as ExamAttemptAnswers,
        elapsedSeconds: body.elapsedSeconds,
    });

    if (body.preparationToken) {
        const expectedPreparationToken = buildPreparationToken({
            attemptId: body.sessionId,
            answerChecksum,
            elapsedSeconds: body.elapsedSeconds,
            lifecycleState: attempt.lifecycle_state,
        });

        if (body.preparationToken !== expectedPreparationToken) {
            throw new HTTPException(409, {
                message:
                    'Your turn-in preview is no longer valid. Please review the latest prepared result before submitting.',
            });
        }
    }

    const scoreSnapshot = buildScoreSnapshot({
        questions: assessmentSnapshot.questions,
        answers: body.answers as ExamAttemptAnswers,
        answerChecksum,
    });

    logScoreIntegrityCheck({
        boundary: 'commit',
        attemptId: body.sessionId,
        examId: attempt.exam_id,
        scoringVersion: scoreSnapshot.scoringVersion,
        aggregateScore: scoreSnapshot.score,
        aggregateTotalScore: scoreSnapshot.totalScore,
        questionReports: scoreSnapshot.questionReports,
    });

    const summary = {
        score: scoreSnapshot.score,
        totalScore: scoreSnapshot.totalScore,
        percentage: scoreSnapshot.percentage,
        answeredCount: scoreSnapshot.answeredCount,
        autoGradableQuestionCount: scoreSnapshot.autoGradableQuestionCount,
        manualReviewQuestionCount: scoreSnapshot.manualReviewQuestionCount,
        requiresManualReview: scoreSnapshot.requiresManualReview,
    };

    const completedAttempt = await executeInTransactionIfAvailable(dbClient, async (trx) => {
        const updatedAttempt = await SessionRepository.completeSession(trx, {
            sessionId: body.sessionId,
            score: summary.score,
            initialScore: summary.score,
            totalScore: summary.totalScore,
            timeSpentMinutes: body.elapsedSeconds > 0 ? Math.ceil(body.elapsedSeconds / 60) : 0,
            answeredCount: summary.answeredCount,
            answers: body.answers as ExamAttemptAnswers,
            scoreSnapshot,
            scoringVersion: ATTEMPT_SCORING_VERSION,
        });

        if (!updatedAttempt?.completed_at) {
            const latestAttempt = await SessionRepository.getOwnedSessionAttempt(trx, {
                sessionId: body.sessionId,
                studentUserId,
            });
            const latestScoreSnapshot = parseScoreSnapshot(latestAttempt?.score_snapshot);

            if (latestAttempt?.completed_at && latestAttempt.status === 'COMPLETED' && latestScoreSnapshot) {
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
            examId: attempt.exam_id,
            studentId: attempt.student_id,
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

        return updatedAttempt;
    });

    // Telemetry logging and notifications
    if (attempt.institution_id) {
        try {
            await LogsService.createLog(dbClient, {
                userId: studentUserId,
                action: 'exam.session_completed',
                resourceType: 'exam_attempt',
                resourceId: completedAttempt.attempt_id,
                activeInstitutionId: attempt.institution_id,
                details: {
                    sessionId: body.sessionId,
                    score: summary.score,
                    totalScore: summary.totalScore,
                    timeSpentMinutes:
                        body.elapsedSeconds > 0 ? Math.ceil(body.elapsedSeconds / 60) : 0,
                },
            });

            const exam = await dbClient
                .selectFrom('exams')
                .select(['title'])
                .where('exam_id', '=', attempt.exam_id)
                .executeTakeFirst();
            const examTitle = exam?.title || 'Exam';

            await ActivityNotificationService.notifyInstitutionActivityTransaction({
                dbClient,
                actorUserId: studentUserId,
                institutionId: attempt.institution_id,
                targetType: 'EXAM_ATTEMPT',
                targetId: completedAttempt.attempt_id,
                targetLabel: examTitle,
                title: 'Exam attempt submitted',
                message: `Exam attempt submitted for "${examTitle}". Score: ${summary.score}/${summary.totalScore}.`,
                sourceModule: 'exams',
                sourceAction: 'complete-attempt',
                metadata: {
                    examId: attempt.exam_id,
                    attemptId: completedAttempt.attempt_id,
                    score: summary.score,
                    totalScore: summary.totalScore,
                },
            });
        } catch (logErr) {
            console.error('Failed to log or notify exam.session_completed:', logErr);
        }
    }

    // Post-completion IRT calibration (non-critical, fire-and-forget)
    // Identify all question bank question IDs in this exam and calibrate.
    try {
        const questionBankIds = assessmentSnapshot.questions
            .map((q) => q.sourceQuestionBankQuestionId)
            .filter((id): id is string => Boolean(id));

        if (questionBankIds.length > 0) {
            void calibrateQuestionDifficulty({
                dbClient: dbClient,
                questionBankQuestionIds: questionBankIds,
            });
        }
    } catch (calibrationError) {
        console.error('[SessionManagerService] IRT calibration failed:', calibrationError);
    }

    const completedAt =
        completedAttempt.completed_at instanceof Date
            ? completedAttempt.completed_at.toISOString()
            : new Date(completedAttempt.completed_at).toISOString();

    return {
        attemptId: completedAttempt.attempt_id,
        completedAt,
        ...summary,
    };
}
