import type { DbClient } from '@sentinel/db';
import { calibrateQuestionDifficulty } from '../../../../content/question-bank/services/calibrate-question-difficulty.service';
import { LogsService } from '../../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../../general/notification/services/activity-notification.service';
import type {
    CompleteSessionNotificationArgs,
    CompleteSessionScoringContext,
} from './complete-session.types';

export async function notifyCompletedSession(
    args: CompleteSessionNotificationArgs,
) {
    const { dbClient, studentUserId, body, attemptContext, completedAttempt, summary } = args;
    const { attempt, examId } = attemptContext;

    if (!attempt.institution_id) {
        return;
    }

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
                timeSpentMinutes: body.elapsedSeconds > 0 ? Math.ceil(body.elapsedSeconds / 60) : 0,
            },
        });

        const exam = await dbClient
            .selectFrom('exams')
            .select(['title'])
            .where('exam_id', '=', examId)
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
                examId,
                attemptId: completedAttempt.attempt_id,
                score: summary.score,
                totalScore: summary.totalScore,
            },
        });
    } catch (logErr) {
        console.error('Failed to log or notify exam.session_completed:', logErr);
    }
}

export function triggerQuestionCalibration(args: {
    dbClient: DbClient;
    assessmentSnapshot: CompleteSessionScoringContext['assessmentSnapshot'];
}) {
    try {
        const questionBankIds = args.assessmentSnapshot.questions
            .map((question) => question.sourceQuestionBankQuestionId)
            .filter((id): id is string => Boolean(id));

        if (questionBankIds.length > 0) {
            void calibrateQuestionDifficulty({
                dbClient: args.dbClient,
                questionBankQuestionIds: questionBankIds,
            });
        }
    } catch (calibrationError) {
        console.error('[SessionManagerService] IRT calibration failed:', calibrationError);
    }
}
