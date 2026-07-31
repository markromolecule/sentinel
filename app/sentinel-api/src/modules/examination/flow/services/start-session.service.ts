import { type DbClient } from '@sentinel/db';
import { Schema, type AttemptEssayRubricSnapshot, type ExamAttemptAnswers } from '@sentinel/shared';
import { AccessGatekeeperService } from '../../access/access.service';
import { getExamConfigurationState } from '../../configuration/configuration.service';
import type { ExamConfigurationState } from '../../configuration/configuration.dto';
import { SessionRepository } from '../data/session.repository';
import { getExamQuestionsData } from '../../exams/data/get-exam-questions';
import {
    buildAssessmentSnapshot,
    buildAttemptEssayRubricSnapshot,
    buildLegacyEssayRubricSnapshot,
} from './attempt-snapshot.service';
import { LogsService } from '../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

export type StartSessionServiceArgs = {
    dbClient: DbClient;
    studentId: string;
    examId: string;
    resumeRequestId?: string | null;
};

export type StartSessionResult = {
    sessionId?: string;
    configSnapshot?: ExamConfigurationState;
    isResumed?: boolean;
    answers?: ExamAttemptAnswers;
    elapsedSeconds?: number;
    reconnectAttemptCount?: number;
    maxReconnectAttempts?: number;
    attemptId?: string;
    error?: string;
    errorCode?:
        'ATTEMPT_ALREADY_COMPLETED' | 'ATTEMPT_LOCKED' | 'ATTEMPT_CLOSED' | 'ATTEMPT_SUPERSEDED';
};

async function resolveAttemptStartRubric(
    dbClient: DbClient,
    examId: string,
): Promise<AttemptEssayRubricSnapshot> {
    const examOverride = await dbClient
        .selectFrom('essay_rubric_versions')
        .select(['rubric_version_id', 'version_number', 'scope', 'definition', 'updated_at'])
        .where('scope', '=', 'EXAM_OVERRIDE')
        .where('exam_id', '=', examId)
        .where('is_active', '=', true)
        .executeTakeFirst();

    const baseline = examOverride
        ? null
        : await dbClient
              .selectFrom('essay_rubric_versions')
              .select(['rubric_version_id', 'version_number', 'scope', 'definition', 'updated_at'])
              .where('scope', '=', 'BASELINE')
              .where('is_active', '=', true)
              .executeTakeFirst();

    const activeRubric = examOverride ?? baseline;

    if (!activeRubric) {
        return buildLegacyEssayRubricSnapshot();
    }

    return buildAttemptEssayRubricSnapshot({
        id: activeRubric.rubric_version_id,
        versionNumber: activeRubric.version_number,
        source: activeRubric.scope,
        definition: Schema.essayRubricDefinitionSchema.parse(activeRubric.definition),
        updatedAt: activeRubric.updated_at?.toISOString() ?? null,
    });
}

/**
 * Attempts to start a student exam session.
 * Verifies student eligibility, checks access constraints, config snapshot,
 * initializes session database records, and logs telemetry/notifications.
 */
export async function startSessionService({
    dbClient,
    studentId,
    examId,
    resumeRequestId,
}: StartSessionServiceArgs): Promise<StartSessionResult> {
    // 1. Cross-Domain Call: Verify access constraints
    const accessCheck = await AccessGatekeeperService.verifyStudentExamEligibility(
        dbClient,
        studentId,
        examId,
    );

    if (!accessCheck.isEligible) {
        const lifecycleMessage = accessCheck.runtimeAccess?.message?.toLowerCase() ?? '';
        const errorCode =
            accessCheck.runtimeAccess?.state === 'locked'
                ? 'ATTEMPT_LOCKED'
                : lifecycleMessage.includes('reset') ||
                    lifecycleMessage.includes('replaced') ||
                    lifecycleMessage.includes('superseded')
                  ? 'ATTEMPT_SUPERSEDED'
                  : accessCheck.runtimeAccess?.state === 'closed'
                    ? 'ATTEMPT_CLOSED'
                    : undefined;

        return {
            error: accessCheck.reason || 'Access denied mapping to current exam flow.',
            errorCode,
        };
    }

    const configSnapshot = await getExamConfigurationState(dbClient, examId);

    // 2. Access granted, initialize session data
    const session = await SessionRepository.createSession(dbClient, {
        studentId: accessCheck.context.studentId,
        examId,
        maxReconnectAttempts: configSnapshot.configuration.maxReconnectAttempts,
        accessOverride: accessCheck.accessOverride ?? null,
        updatedBy: studentId,
        resumeRequestId,
    });

    if ('errorCode' in session) {
        return {
            attemptId: session.attemptId,
            error: session.error,
            errorCode: session.errorCode,
        };
    }

    if (!session.isResumed) {
        const questions = await getExamQuestionsData({ dbClient, examId });
        const rubric = await resolveAttemptStartRubric(dbClient, examId);
        const snapshot = buildAssessmentSnapshot({
            attemptId: session.sessionId,
            examId,
            configurationState: configSnapshot,
            questions: questions ?? [],
            rubric,
        });

        await SessionRepository.persistAssessmentSnapshot(dbClient, {
            attemptId: session.sessionId,
            snapshot,
        });
    }

    void (async () => {
        try {
            await LogsService.createLog(dbClient, {
                userId: studentId,
                action: session.isResumed ? 'exam.session_resumed' : 'exam.session_started',
                resourceType: 'exam_attempt',
                resourceId: session.sessionId,
                activeInstitutionId: accessCheck.context.institutionId ?? '',
                details: {
                    examId,
                    isResumed: session.isResumed,
                },
            });

            if (accessCheck.context.institutionId) {
                const exam = await dbClient
                    .selectFrom('exams')
                    .select(['title'])
                    .where('exam_id', '=', examId)
                    .executeTakeFirst();
                const examTitle = exam?.title || 'Exam';

                await ActivityNotificationService.notifyInstitutionActivityCreated({
                    dbClient,
                    actorUserId: studentId,
                    institutionId: accessCheck.context.institutionId,
                    targetType: 'EXAM_ATTEMPT',
                    targetId: session.sessionId,
                    targetLabel: examTitle,
                    title: session.isResumed ? 'Exam attempt resumed' : 'Exam attempt started',
                    message: `Exam attempt ${session.isResumed ? 'resumed' : 'started'} for "${examTitle}".`,
                    sourceModule: 'exams',
                    sourceAction: session.isResumed ? 'resume-attempt' : 'start-attempt',
                    metadata: {
                        examId,
                        isResumed: session.isResumed,
                        attemptId: session.sessionId,
                    },
                });
            }
        } catch (logErr) {
            console.error('Failed to log or notify exam session started/resumed:', logErr);
        }
    })();

    return {
        sessionId: session.sessionId,
        configSnapshot,
        isResumed: session.isResumed,
        answers: 'answers' in session ? session.answers : undefined,
        elapsedSeconds: 'elapsedSeconds' in session ? session.elapsedSeconds : undefined,
        reconnectAttemptCount:
            'reconnectAttemptCount' in session ? session.reconnectAttemptCount : undefined,
        maxReconnectAttempts:
            'maxReconnectAttempts' in session ? session.maxReconnectAttempts : undefined,
    };
}
