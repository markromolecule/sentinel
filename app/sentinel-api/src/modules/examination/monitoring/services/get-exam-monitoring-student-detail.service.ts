import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { AssessmentAllowedRole } from '../../assessment/assessment-access';
import { TelemetryStorageService } from '../../../telemetry/storage/storage.service';
import type { MonitoringStudentDetail } from '../monitoring.dto';
import { getMonitoringExamContext } from '../data/get-monitoring-exam-context';
import {
    getStudentLatestAttemptRow,
    getIncidentEvidenceSummaryRows,
    getAttemptLifecycleEvents,
} from '../data/get-exam-monitoring-student-detail.data';
import { mapMonitoringStudentDetail } from './map-monitoring-response.service';

export type GetExamMonitoringStudentDetailArgs = {
    dbClient: DbClient;
    examId: string;
    studentId: string;
    institutionId?: string;
    viewerRole: AssessmentAllowedRole;
    userId?: string | null;
};

export async function getExamMonitoringStudentDetail({
    dbClient,
    examId,
    studentId,
    institutionId,
    viewerRole,
    userId,
}: GetExamMonitoringStudentDetailArgs): Promise<MonitoringStudentDetail> {
    const [exam, latestAttempt] = await Promise.all([
        getMonitoringExamContext({
            dbClient,
            examId,
            institutionId,
            viewerRole,
            userId,
        }),
        getStudentLatestAttemptRow(dbClient, examId, studentId),
    ]);

    if (!latestAttempt) {
        throw new HTTPException(404, {
            message: 'Monitoring student record not found.',
        });
    }

    const incidents = await TelemetryStorageService.getIncidents(
        dbClient,
        {
            attemptId: latestAttempt.attempt_id,
            limit: 200,
        },
        institutionId,
    );

    const incidentIds = incidents.map((incident) => incident.incidentId).filter(Boolean);

    const [evidenceSummaryRows, lifecycleEvents] = await Promise.all([
        getIncidentEvidenceSummaryRows(dbClient, incidentIds),
        getAttemptLifecycleEvents(dbClient, latestAttempt.attempt_id),
    ]);

    return mapMonitoringStudentDetail(
        latestAttempt,
        exam.durationMinutes,
        exam.questionCount,
        incidents,
        evidenceSummaryRows,
        lifecycleEvents,
    );
}
