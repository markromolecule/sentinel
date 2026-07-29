import { type DbClient } from '@sentinel/db';
import { buildExamAttemptQuestionReports } from '@sentinel/shared';
import { HTTPException } from 'hono/http-exception';
import {
    logDualReadComparison,
    logScoreIntegrityCheck,
} from '../../shared/services/score-integrity-observability.service';
import { buildGradingAttemptDetailResponse } from './get-grading-attempt-detail/get-grading-attempt-detail.mapper';
import {
    findExamQuestionsForGrading,
    findGradingAttemptDetailRow,
} from './get-grading-attempt-detail/get-grading-attempt-detail.repository';
import {
    buildQuestionsFromAssessmentSnapshot,
    extractSnapshotMetadata,
    mapQuestionRowToExamQuestion,
    normalizeQuestionReports,
    parseAttemptSnapshots,
} from './get-grading-attempt-detail/get-grading-attempt-detail.snapshot';

export type GetGradingAttemptDetailArgs = {
    dbClient: DbClient;
    attemptId: string;
    institutionId?: string;
};

/**
 * Retrieves the detailed content of a student exam attempt, including questions,
 * student responses, and existing grading evaluations.
 *
 * @param args - GetGradingAttemptDetailArgs
 * @returns The attempt detail, including student profile, exam details, questions, and evaluations.
 */
export async function getGradingAttemptDetail({
    dbClient,
    attemptId,
    institutionId,
}: GetGradingAttemptDetailArgs) {
    const attemptRow = await findGradingAttemptDetailRow({
        dbClient,
        attemptId,
        institutionId,
    });

    if (!attemptRow) {
        throw new HTTPException(404, {
            message: 'Exam attempt not found.',
        });
    }

    const snapshotMetadata = extractSnapshotMetadata(attemptRow.answerSnapshot);
    const { assessmentSnapshot, scoreSnapshot } = parseAttemptSnapshots({
        assessmentSnapshot: attemptRow.assessmentSnapshot,
        scoreSnapshot: attemptRow.scoreSnapshot,
    });

    let finalQuestions = buildQuestionsFromAssessmentSnapshot(assessmentSnapshot);

    if (!finalQuestions) {
        const questionRows = await findExamQuestionsForGrading({
            dbClient,
            examId: attemptRow.examId,
        });
        finalQuestions = questionRows.map(mapQuestionRowToExamQuestion);
    }

    const persistedQuestionReports = scoreSnapshot
        ? normalizeQuestionReports({
            questionReports: scoreSnapshot.questionReports,
            questions: finalQuestions,
            scoringVersion: scoreSnapshot.scoringVersion,
        })
        : null;

    const legacyQuestionReports = buildExamAttemptQuestionReports({
        questions: finalQuestions,
        answers: snapshotMetadata.answers,
        evaluations: snapshotMetadata.evaluations,
        itemOverrides: snapshotMetadata.itemOverrides,
    });

    const questionReports = persistedQuestionReports
        ? persistedQuestionReports
        : legacyQuestionReports;

    logScoreIntegrityCheck({
        boundary: 'grading',
        attemptId: attemptRow.attemptId,
        examId: attemptRow.examId,
        scoringVersion: scoreSnapshot ? scoreSnapshot.scoringVersion : 'legacy',
        aggregateScore: attemptRow.score,
        aggregateTotalScore: attemptRow.totalScore,
        questionReports,
    });

    if (scoreSnapshot && attemptRow.scoreState !== 'FINALIZED' && finalQuestions.length > 0) {
        logDualReadComparison({
            boundary: 'grading_dual_read',
            attemptId: attemptRow.attemptId,
            examId: attemptRow.examId,
            scoringVersion: scoreSnapshot.scoringVersion,
            persistedQuestionReports: persistedQuestionReports!,
            legacyQuestionReports,
        });
    }

    return buildGradingAttemptDetailResponse({
        attemptRow,
        questions: finalQuestions,
        questionReports,
        snapshotMetadata,
    });
}
