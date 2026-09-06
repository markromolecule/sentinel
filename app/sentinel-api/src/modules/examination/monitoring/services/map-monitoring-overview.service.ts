import type {
    MonitoringExam,
    MonitoringOverview,
    MonitoringStudentSummary,
} from '../monitoring.dto';

export function mapMonitoringExam(args: {
    examId: string;
    title: string;
    subject: string;
    scheduledDate: string | null;
    endDateTime: string | null;
    maxReconnectAttempts: number;
    runtimeAccess?: MonitoringExam['runtimeAccess'];
    remediationContext?: MonitoringExam['remediationContext'];
}): MonitoringExam {
    return {
        id: args.examId,
        title: args.title,
        subject: args.subject,
        scheduledDate: args.scheduledDate,
        endDateTime: args.endDateTime,
        maxReconnectAttempts: args.maxReconnectAttempts,
        runtimeAccess: args.runtimeAccess,
        remediationContext: args.remediationContext ?? null,
    };
}

export function buildMonitoringOverview(args: {
    exam: MonitoringExam;
    lobbyAdmissions: MonitoringOverview['lobbyAdmissions'];
    students: MonitoringStudentSummary[];
}): MonitoringOverview {
    const stats = args.students.reduce(
        (summary, student) => {
            summary.total += 1;

            const isSubmitted =
                student.status === 'submitted' ||
                student.lifecycleState === 'SUBMITTED' ||
                Boolean(student.completedAt);

            const isFlagged =
                student.status === 'flagged' ||
                student.openIncidentCount > 0 ||
                student.incidentCount > 0;

            if (isSubmitted) {
                summary.submitted += 1;
            }

            if (isFlagged) {
                summary.flagged += 1;
            }

            if (!isSubmitted && !isFlagged) {
                if (student.status === 'disconnected') {
                    summary.disconnected += 1;
                } else {
                    summary.active += 1;
                }
            }

            return summary;
        },
        {
            total: 0,
            active: 0,
            flagged: 0,
            submitted: 0,
            disconnected: 0,
        },
    );

    return {
        exam: args.exam,
        stats,
        lobbyAdmissions: args.lobbyAdmissions,
        students: args.students.sort((left, right) => {
            const lastNameCompare = left.lastName.localeCompare(right.lastName);

            if (lastNameCompare !== 0) {
                return lastNameCompare;
            }

            return left.firstName.localeCompare(right.firstName);
        }),
    };
}
