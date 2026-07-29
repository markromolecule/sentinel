import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { getGradingAttemptDetail } from '../../grading/services/get-grading-attempt-detail.service';
import type { AssessmentAllowedRole } from '../../assessment/assessment-access';
import type { AttemptReport } from '../reporting.dto';
import { logScoreIntegrityCheck } from '../../shared/services/score-integrity-observability.service';

type GetAttemptReportArgs = {
    dbClient: DbClient;
    attemptId: string;
    institutionId?: string;
    viewerRole: AssessmentAllowedRole | 'student';
    userId?: string | null;
};

/**
 * Returns the detailed attempt report for instructor and student report views.
 * Students are limited to their own completed attempts and must wait for
 * finalized grading when the attempt includes essay questions.
 */
export async function getAttemptReport({
    dbClient,
    attemptId,
    institutionId,
    viewerRole,
    userId,
}: GetAttemptReportArgs): Promise<AttemptReport> {
    if (viewerRole === 'student') {
        if (!userId) {
            throw new HTTPException(403, {
                message: 'Forbidden. Student report access requires an authenticated student.',
            });
        }

        const ownedAttempt = await dbClient
            .selectFrom('exam_attempts as ea')
            .innerJoin('students as st', 'st.student_id', 'ea.student_id')
            .innerJoin('exams as e', 'e.exam_id', 'ea.exam_id')
            .select(['ea.attempt_id as attemptId', 'ea.completed_at as completedAt'])
            .where('ea.attempt_id', '=', attemptId)
            .where('st.user_id', '=', userId)
            .where('e.published_at', 'is not', null)
            .$if(Boolean(institutionId), (qb) => qb.where('e.institution_id', '=', institutionId!))
            .executeTakeFirst();

        if (!ownedAttempt) {
            throw new HTTPException(404, {
                message: 'Attempt report not found.',
            });
        }
    }

    const detail = await getGradingAttemptDetail({
        dbClient,
        attemptId,
        institutionId,
    });

    logScoreIntegrityCheck({
        boundary: 'report',
        attemptId: detail.attempt.attemptId,
        examId: detail.attempt.examId,
        aggregateScore: detail.attempt.score,
        aggregateTotalScore: detail.attempt.totalScore,
        questionReports: detail.attempt.questionReports,
    });

    if (viewerRole === 'student') {
        if (!detail.attempt.completedAt) {
            throw new HTTPException(409, {
                message: 'This report is not available until the attempt is completed.',
            });
        }

        const configRecord = await dbClient
            .selectFrom('exam_configurations')
            .select('release_score_mode')
            .where('exam_id', '=', detail.attempt.examId)
            .executeTakeFirst();

        const isManualRelease = configRecord?.release_score_mode === 'MANUAL_RELEASE';
        const requiresFinalization = detail.questions.some((question) => question.type === 'ESSAY');

        if ((requiresFinalization || isManualRelease) && !detail.attempt.grading.finalizedAt) {
            throw new HTTPException(409, {
                message: 'This report is still being finalized by your instructor.',
            });
        }
    }

    return detail;
}
