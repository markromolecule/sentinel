import { type DbClient } from '@sentinel/db';
import type { AssessmentAllowedRole } from '../../assessment/assessment-access';
import type { MonitoringOverview } from '../monitoring.dto';
import { getMonitoringExamContext } from '../data/get-monitoring-exam-context';
import { getExamMonitoringOverviewData } from '../data/get-exam-monitoring-overview.data';
import {
    buildMonitoringOverview,
    mapMonitoringExam,
    mapMonitoringStudentSummary,
} from './map-monitoring-response.service';

export type GetExamMonitoringOverviewArgs = {
    dbClient: DbClient;
    examId: string;
    institutionId?: string;
    viewerRole: AssessmentAllowedRole;
    userId?: string | null;
};

export async function getExamMonitoringOverview({
    dbClient,
    examId,
    institutionId,
    viewerRole,
    userId,
}: GetExamMonitoringOverviewArgs): Promise<MonitoringOverview> {
    const [exam, { rows, lobbyAdmissions }] = await Promise.all([
        getMonitoringExamContext({
            dbClient,
            examId,
            institutionId,
            viewerRole,
            userId,
        }),
        getExamMonitoringOverviewData(dbClient, examId),
    ]);

    const students = rows.map((row) =>
        mapMonitoringStudentSummary(row, exam.durationMinutes, exam.questionCount),
    );

    return buildMonitoringOverview({
        exam: mapMonitoringExam(exam),
        lobbyAdmissions,
        students,
    });
}
