import { type DbClient } from '@sentinel/db';
import { calculateEssayWeightedScore } from '@sentinel/shared';
import { HTTPException } from 'hono/http-exception';
import { getGradingAttemptDetail } from './get-grading-attempt-detail.service';
import { appendExamAttemptLifecycleEvent } from '../../lifecycle/services/lifecycle-event.service';
import {
    ATTEMPT_SCORING_VERSION,
    buildAnswerPayloadChecksum,
    buildScoreSnapshot,
} from '../../flow/services/attempt-snapshot.service';
import { logScoreIntegrityCheck } from '../../shared/services/score-integrity-observability.service';

export type UpdateGradingAttemptArgs = {
    dbClient: DbClient;
    attemptId: string;
    actorUserId?: string;
    institutionId?: string;
    evaluations?: Record<
        string,
        {
            scores: {
                contentSubstance: number;
                structureOrganization: number;
                argumentationSupport: number;
                styleTone: number;
                grammarConventions: number;
            };
            feedback?: string | null;
        }
    >;
    itemOverrides?: Record<
        string,
        {
            awardedScore: number;
            reason?: string | null;
        }
    >;
    feedback?: string | null;
    finalize?: boolean;
};

/**
 * Updates a student's exam attempt with manually scored essay questions,
 * recalculating the overall score and storing criteria breakdowns.
 *
 * @param args - UpdateGradingAttemptArgs
 * @returns The updated score and attempt information.
 */
export async function updateGradingAttempt({
    dbClient,
    attemptId,
    actorUserId,
    institutionId,
    evaluations = {},
    itemOverrides = {},
    feedback,
    finalize = false,
}: UpdateGradingAttemptArgs) {
    // 1. Fetch current attempt details and questions
    const detail = await getGradingAttemptDetail({
        dbClient,
        attemptId,
        institutionId,
    });

    const { attempt, questions } = detail;

    if (attempt.scoreState === 'FINALIZED') {
        throw new HTTPException(400, {
            message: 'Cannot edit grading for a finalized attempt score.',
        });
    }

    const mappedQuestions = questions.map((q) => ({
        id: q.id,
        examId: q.examId,
        type: q.type as any,
        sourceFileName: q.sourceFileName ?? null,
        sourcePageNumber: q.sourcePageNumber ?? null,
        sourceEvidence: q.sourceEvidence ?? null,
        passageContent: q.passageContent ?? null,
        passageType: q.passageType ?? null,
        points: q.points,
        orderIndex: q.orderIndex,
        content: q.content,
        tags: [],
    }));

    const questionPointsMap = new Map(questions.map((question) => [question.id, question.points]));

    const mergedOverrides = {
        ...attempt.itemOverrides,
        ...itemOverrides,
    };

    // Build the updated evaluations record
    const updatedEvaluations: Record<string, any> = {};

    // 3. Score the essay questions using the provided criteria scores
    for (const question of questions) {
        if (question.type === 'ESSAY') {
            const evaluation = evaluations[question.id] ?? detail.attempt.evaluations[question.id];
            const override = mergedOverrides[question.id];

            if (!evaluation) {
                if (finalize && typeof override?.awardedScore !== 'number') {
                    throw new HTTPException(400, {
                        message: `Evaluation missing for essay question: ${question.id}`,
                    });
                }
                continue;
            }

            const essayScore = calculateEssayWeightedScore(evaluation.scores, question.points);

            updatedEvaluations[question.id] = {
                scores: evaluation.scores,
                score: essayScore,
                feedback: evaluation.feedback ?? null,
            };
        }
    }

    const persistedOverrides = Object.entries(mergedOverrides).reduce<Record<string, any>>(
        (acc, [questionId, override]) => {
            const maxPoints = questionPointsMap.get(questionId);

            if (typeof maxPoints !== 'number') {
                throw new HTTPException(400, {
                    message: `Override targets an unknown question: ${questionId}`,
                });
            }

            if (override.awardedScore > maxPoints) {
                throw new HTTPException(400, {
                    message: `Override score exceeds max points for question: ${questionId}`,
                });
            }

            acc[questionId] = {
                awardedScore: override.awardedScore,
                reason: override.reason ?? null,
                overriddenBy: override.overriddenBy ?? actorUserId ?? null,
                overriddenAt: override.overriddenAt ?? new Date().toISOString(),
            };

            return acc;
        },
        {},
    );

    const scoreSnapshot = buildScoreSnapshot({
        questions: mappedQuestions,
        answers: attempt.answers,
        answerChecksum: buildAnswerPayloadChecksum({
            attemptId,
            answers: attempt.answers,
            elapsedSeconds: 0,
        }),
        evaluations: updatedEvaluations,
        itemOverrides: persistedOverrides,
    });

    logScoreIntegrityCheck({
        boundary: 'grading',
        attemptId,
        examId: attempt.examId,
        scoringVersion: scoreSnapshot.scoringVersion,
        aggregateScore: scoreSnapshot.score,
        aggregateTotalScore: scoreSnapshot.totalScore,
        questionReports: scoreSnapshot.questionReports,
    });

    const roundedScore = scoreSnapshot.score;

    const existingGradingMetadata =
        typeof attempt.grading === 'object' && attempt.grading !== null ? attempt.grading : {};
    const updatedGradingMetadata = finalize
        ? {
              ...existingGradingMetadata,
              finalizedAt: new Date().toISOString(),
              finalizedBy: actorUserId ?? null,
          }
        : existingGradingMetadata;

    // 5. Build updated answer snapshot with metadata prefixed with "_"
    const updatedSnapshot = {
        ...attempt.answers,
        _evaluations: updatedEvaluations,
        _itemOverrides: persistedOverrides,
        _grading: updatedGradingMetadata,
        _feedback: feedback !== undefined ? feedback : (attempt.feedback ?? null),
    };

    const totalAttemptPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const finalTotalScore = attempt.totalScore ?? totalAttemptPoints;

    const updatePayload: Record<string, any> = {
        score: roundedScore,
        answer_snapshot: updatedSnapshot as any,
        score_snapshot: scoreSnapshot as any,
        scoring_version: ATTEMPT_SCORING_VERSION,
        last_synced_at: new Date(),
    };

    if (finalize) {
        updatePayload.status = 'COMPLETED';
        updatePayload.score_state = 'FINALIZED';
        updatePayload.finalized_at = new Date();
        updatePayload.finalized_by = actorUserId ?? null;
        if (!attempt.completedAt) {
            updatePayload.completed_at = new Date();
        }
    }

    if (attempt.totalScore === null || attempt.totalScore === undefined) {
        updatePayload.total_score = totalAttemptPoints;
    }

    // Capture the pre-override baseline on the very first instructor save.
    // initial_score is write-once — never overwritten on subsequent saves.
    if (attempt.initialScore === null || attempt.initialScore === undefined) {
        updatePayload.initial_score = attempt.score ?? 0;
    }

    // 6. Update the database
    await dbClient
        .updateTable('exam_attempts')
        .set(updatePayload)
        .where('attempt_id', '=', attemptId)
        .execute();

    if (finalize) {
        await appendExamAttemptLifecycleEvent({
            dbClient,
            attemptId,
            examId: attempt.examId ?? '',
            studentId: attempt.studentId ?? '',
            eventType: 'FINALIZED',
            previousState: attempt.lifecycleState as any,
            nextState: attempt.lifecycleState as any,
            actorUserId: actorUserId ?? null,
            notes: 'Finalized from grading update',
        });
    }

    return {
        attemptId,
        score: roundedScore,
        totalScore: finalTotalScore,
        scoreState: finalize ? 'FINALIZED' : (attempt.scoreState ?? 'DRAFT'),
        finalizedAt: finalize
            ? updatePayload.finalized_at.toISOString()
            : (attempt.grading?.finalizedAt ?? null),
        finalizedBy: finalize ? (actorUserId ?? null) : (attempt.grading?.finalizedBy ?? null),
    };
}
