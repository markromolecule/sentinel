import { createHash } from 'node:crypto';
import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { type ExamAttemptAnswers } from '@sentinel/shared';
import { SessionRepository } from '../data/session.repository';
import type { PrepareSessionBody } from '../flow.dto';
import { getExamConfigurationState } from '../../configuration/configuration.service';
import { getExamQuestionsData } from '../../exams/data/get-exam-questions';
import {
    buildAnswerPayloadChecksum,
    buildAssessmentSnapshot,
    buildScoreSnapshot,
    normalizeAssessmentSnapshotQuestions,
    parseAssessmentSnapshot,
} from './attempt-snapshot.service';
import { logScoreIntegrityCheck } from '../../shared/services/score-integrity-observability.service';

export type PrepareSessionServiceArgs = {
    dbClient: DbClient;
    studentUserId: string;
    body: PrepareSessionBody;
};

export function buildPreparationToken(args: {
    attemptId: string;
    answerChecksum: string;
    elapsedSeconds: number;
    lifecycleState?: string | null;
}) {
    return createHash('sha256')
        .update(
            JSON.stringify({
                attemptId: args.attemptId,
                answerChecksum: args.answerChecksum,
                elapsedSeconds: args.elapsedSeconds,
                lifecycleState: args.lifecycleState ?? null,
            }),
        )
        .digest('hex');
}

function assertAttemptCanBePrepared(attempt: {
    exam_id?: string | null;
    completed_at?: Date | null;
    status?: string | null;
    lifecycle_state?: string | null;
}) {
    if (!attempt.exam_id) {
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
            message: 'This exam attempt is not available for turn-in preparation.',
        });
    }
}

export async function prepareSessionService({
    dbClient,
    studentUserId,
    body,
}: PrepareSessionServiceArgs) {
    const attempt = await SessionRepository.getOwnedSessionAttempt(dbClient, {
        sessionId: body.sessionId,
        studentUserId,
    });

    assertAttemptCanBePrepared(attempt ?? {});

    if (!attempt?.exam_id) {
        throw new HTTPException(404, {
            message: 'Exam session not found for the authenticated student.',
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
            message: 'This exam attempt is missing its assessment snapshot and cannot be prepared.',
        });
    }

    const normalizedQuestions = normalizeAssessmentSnapshotQuestions(assessmentSnapshot.questions);

    const answerChecksum = buildAnswerPayloadChecksum({
        attemptId: body.sessionId,
        answers: body.answers as ExamAttemptAnswers,
        elapsedSeconds: body.elapsedSeconds,
    });

    const scoreSnapshot = buildScoreSnapshot({
        questions: normalizedQuestions,
        answers: body.answers as ExamAttemptAnswers,
        answerChecksum,
    });

    logScoreIntegrityCheck({
        boundary: 'prepare',
        attemptId: body.sessionId,
        examId: attempt.exam_id,
        scoringVersion: scoreSnapshot.scoringVersion,
        aggregateScore: scoreSnapshot.score,
        aggregateTotalScore: scoreSnapshot.totalScore,
        questionReports: scoreSnapshot.questionReports,
    });

    return {
        preparationToken: buildPreparationToken({
            attemptId: body.sessionId,
            answerChecksum,
            elapsedSeconds: body.elapsedSeconds,
            lifecycleState: attempt.lifecycle_state,
        }),
        score: scoreSnapshot.score,
        totalScore: scoreSnapshot.totalScore,
        percentage: scoreSnapshot.percentage,
        answeredCount: scoreSnapshot.answeredCount,
        autoGradableQuestionCount: scoreSnapshot.autoGradableQuestionCount,
        manualReviewQuestionCount: scoreSnapshot.manualReviewQuestionCount,
        requiresManualReview: scoreSnapshot.requiresManualReview,
    };
}
