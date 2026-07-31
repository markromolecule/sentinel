import { HTTPException } from 'hono/http-exception';
import { type DbClient } from '@sentinel/db';
import { type ExamAttemptAnswers } from '@sentinel/shared';
import { getExamConfigurationState } from '../../../configuration/configuration.service';
import { getExamQuestionsData } from '../../../exams/data/get-exam-questions';
import {
    buildAnswerPayloadChecksum,
    buildAssessmentSnapshot,
    buildScoreSnapshot,
    normalizeAssessmentSnapshotQuestions,
    parseAssessmentSnapshot,
    parseScoreSnapshot,
    resolveAssessmentSnapshotRubric,
} from '../attempt-snapshot.service';
import { buildPreparationToken } from '../prepare-session.service';
import { logScoreIntegrityCheck } from '../../../shared/services/score-integrity-observability.service';
import type {
    CompleteSessionAttemptContext,
    CompleteSessionScoringContext,
    CompleteSessionSummary,
} from './complete-session.types';

export function buildSummaryFromScoreSnapshot(
    scoreSnapshot: ReturnType<typeof parseScoreSnapshot>,
): CompleteSessionSummary | null {
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

export async function buildCompleteSessionScoringContext(args: {
    dbClient: DbClient;
    body: import('../../flow.dto').CompleteSessionBody;
    attemptContext: CompleteSessionAttemptContext;
}): Promise<CompleteSessionScoringContext> {
    const { dbClient, body, attemptContext } = args;
    const { attempt, examId } = attemptContext;

    const assessmentSnapshot =
        parseAssessmentSnapshot(attempt.assessment_snapshot) ??
        buildAssessmentSnapshot({
            attemptId: body.sessionId,
            examId,
            configurationState: await getExamConfigurationState(dbClient, examId),
            questions: await getExamQuestionsData({
                dbClient,
                examId,
            }),
        });

    if (!assessmentSnapshot) {
        throw new HTTPException(409, {
            message: 'This exam attempt is missing its assessment snapshot and cannot be scored.',
        });
    }

    const normalizedQuestions = normalizeAssessmentSnapshotQuestions(assessmentSnapshot.questions);
    const rubric = resolveAssessmentSnapshotRubric(assessmentSnapshot);

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
        questions: normalizedQuestions,
        answers: body.answers as ExamAttemptAnswers,
        answerChecksum,
        rubric,
    });

    logScoreIntegrityCheck({
        boundary: 'commit',
        attemptId: body.sessionId,
        examId,
        scoringVersion: scoreSnapshot.scoringVersion,
        aggregateScore: scoreSnapshot.score,
        aggregateTotalScore: scoreSnapshot.totalScore,
        questionReports: scoreSnapshot.questionReports,
    });

    const summary = buildSummaryFromScoreSnapshot(scoreSnapshot);

    if (!summary) {
        throw new HTTPException(500, {
            message: 'Exam attempt score snapshot could not be summarized.',
        });
    }

    return {
        assessmentSnapshot,
        normalizedQuestions,
        answerChecksum,
        scoreSnapshot,
        summary,
    };
}
