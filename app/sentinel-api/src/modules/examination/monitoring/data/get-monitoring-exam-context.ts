import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { sql } from 'kysely';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import { buildStaffExamVisibilityPredicates } from '../../assign/services/exam-access.service';
import type { AssessmentAllowedRole } from '../../assessment/assessment-access';
import type { ExamRuntimeAccess } from '../../runtime-access/runtime-access.dto';
import { RuntimeAccessService } from '../../runtime-access/runtime-access.service';

export type MonitoringExamContext = {
    examId: string;
    title: string;
    subject: string;
    scheduledDate: string | null;
    endDateTime: string | null;
    durationMinutes: number;
    questionCount: number;
    maxReconnectAttempts: number;
    runtimeAccess: ExamRuntimeAccess;
    remediationContext?: {
        remediationId: string;
        remediationType: 'RETAKE' | 'MAKEUP';
        sourceExamId: string;
        sourceExamTitle: string;
        sourceAttemptId: string | null;
    } | null;
};

type GetMonitoringExamContextArgs = {
    dbClient: DbClient;
    examId: string;
    institutionId?: string;
    viewerRole: AssessmentAllowedRole;
    userId?: string | null;
};

export async function getMonitoringExamContext({
    dbClient,
    examId,
    institutionId,
    viewerRole,
    userId,
}: GetMonitoringExamContextArgs): Promise<MonitoringExamContext> {
    let query = dbClient
        .selectFrom('exams as e')
        .leftJoin('subjects as s', 's.subject_id', 'e.subject_id')
        .leftJoin('exam_configurations as ec', 'ec.exam_id', 'e.exam_id')
        .leftJoin('exam_remediation_schedules as ers', 'ers.remediation_exam_id', 'e.exam_id')
        .leftJoin('exams as source_exam', 'source_exam.exam_id', 'ers.source_exam_id')
        .select([
            'e.exam_id',
            'e.title',
            'e.duration_minutes',
            'e.scheduled_date',
            'e.end_date_time',
            'ec.max_reconnect_attempts',
            's.subject_title',
            'ers.remediation_id',
            'ers.remediation_type',
            'ers.source_exam_id',
            'ers.source_attempt_id',
            'source_exam.title as source_exam_title',
            sql<number>`coalesce((
                select count(*)::int
                from exam_questions as eq
                where eq.exam_id = e.exam_id
            ), 0)`.as('question_count'),
        ])
        .where('e.exam_id', '=', examId);

    if (institutionId) {
        query = query.where('e.institution_id', '=', institutionId);
    }

    if (viewerRole === 'instructor' && userId) {
        const visibilityPredicates = await buildStaffExamVisibilityPredicates({
            dbClient,
            userId,
            institutionId,
            includePublicInstitutionExams: true,
        });
        query = query.where(sql<boolean>`(${sql.join(visibilityPredicates, sql` or `)})`);
    }

    const exam = await query.executeTakeFirst();

    if (!exam) {
        throw new HTTPException(404, {
            message: 'Exam monitoring record not found.',
        });
    }

    const runtimeAccess = await RuntimeAccessService.resolveExamRuntimeAccess({
        dbClient,
        examId: exam.exam_id,
        scheduledDate: exam.scheduled_date,
        endDateTime: exam.end_date_time,
        durationMinutes: exam.duration_minutes ?? 0,
    });

    return {
        examId: exam.exam_id,
        title: exam.title,
        subject: exam.subject_title ?? 'Untitled Subject',
        scheduledDate: exam.scheduled_date ? new Date(exam.scheduled_date).toISOString() : null,
        endDateTime: exam.end_date_time ? new Date(exam.end_date_time).toISOString() : null,
        durationMinutes: exam.duration_minutes ?? 0,
        questionCount: Number(exam.question_count ?? 0),
        maxReconnectAttempts:
            exam.max_reconnect_attempts ??
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts,
        runtimeAccess,
        remediationContext: exam.remediation_id
            ? {
                remediationId: exam.remediation_id,
                remediationType: exam.remediation_type!,
                sourceExamId: exam.source_exam_id!,
                sourceExamTitle: exam.source_exam_title ?? 'Source Exam',
                sourceAttemptId: exam.source_attempt_id ?? null,
            }
            : null,
    };
}
