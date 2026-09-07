import type { useApi } from '@sentinel/hooks';
import type { ExamReport, ExamReportActionItem } from '@sentinel/shared/types';

/**
 * Sends a POST request to grant a lifecycle override (MAKEUP or RETAKE) to a student.
 */
export async function grantLifecycleOverride(args: {
    apiClient: ReturnType<typeof useApi>;
    examId: string;
    item: ExamReportActionItem;
    overrideType: 'MAKEUP' | 'RETAKE';
    availableFrom: string;
    availableUntil: string;
    notes: string | null;
}) {
    const endpoint =
        args.overrideType === 'MAKEUP'
            ? `/exams/${args.examId}/students/${args.item.studentId}/lifecycle/grant-makeup`
            : `/exams/${args.examId}/students/${args.item.studentId}/lifecycle/grant-retake`;

    return await args.apiClient(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            availableFrom: args.availableFrom,
            availableUntil: args.availableUntil,
            allowedAttempts: 1,
            sourceAttemptId: args.overrideType === 'RETAKE' ? args.item.attemptId : undefined,
            notes: args.notes,
        }),
    });
}

/**
 * Executes a batch of lifecycle override requests concurrently via Promise.allSettled.
 */
export async function grantLifecycleOverridesBatch(args: {
    apiClient: ReturnType<typeof useApi>;
    examId: string;
    items: ExamReportActionItem[];
    overrideType: 'MAKEUP' | 'RETAKE';
    availableFrom: string;
    availableUntil: string;
    notes: string | null;
}) {
    const results = await Promise.allSettled(
        args.items.map((item) =>
            grantLifecycleOverride({
                apiClient: args.apiClient,
                examId: args.examId,
                item,
                overrideType: args.overrideType,
                availableFrom: args.availableFrom,
                availableUntil: args.availableUntil,
                notes: args.notes,
            }),
        ),
    );

    const succeeded: { item: ExamReportActionItem; response: any }[] = [];
    const failed: { item: ExamReportActionItem; reason: string }[] = [];

    results.forEach((result, idx) => {
        const item = args.items[idx]!;
        if (result.status === 'fulfilled') {
            succeeded.push({ item, response: result.value });
        } else {
            const reason =
                result.reason instanceof Error
                    ? result.reason.message
                    : typeof result.reason === 'string'
                        ? result.reason
                        : 'Unknown error';
            failed.push({ item, reason });
        }
    });

    return { succeeded, failed };
}


/**
 * Formats the grant success state so instructors immediately see the scheduled remediation exam.
 */
export function buildGrantSuccessMessage(args: {
    overrideType: 'MAKEUP' | 'RETAKE';
    response: any;
}) {
    const remediationExam = args.response?.remediationExam;
    const remediationSchedule = args.response?.remediationSchedule;
    const label = args.overrideType === 'MAKEUP' ? 'Makeup' : 'Retake';

    if (!remediationExam || !remediationSchedule?.scheduledDate) {
        return `${label} window granted successfully.`;
    }

    const scheduledDate = new Date(remediationSchedule.scheduledDate);
    const formattedSchedule = Number.isNaN(scheduledDate.getTime())
        ? remediationSchedule.scheduledDate
        : scheduledDate.toLocaleString();

    return `${label} scheduled for ${formattedSchedule} as "${remediationExam.title}".`;
}

/**
 * Formats a ISO date string or Date object into a localized date-time string.
 */
export function formatDateTime(value?: string | Date | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Not available';
    }

    return date.toLocaleString();
}

/**
 * Formats a score/percentage number into a standard percentage string (e.g., 92.5%).
 */
export function formatPercent(value?: number | null) {
    if (typeof value !== 'number') {
        return 'N/A';
    }

    return `${value.toFixed(1)}%`;
}

/**
 * Resolves the color/style variant of the status badge.
 */
export function getStatusBadgeVariant(
    status: ExamReport['students'][number]['status'],
): 'destructive' | 'default' | 'secondary' | 'outline' {
    switch (status) {
        case 'flagged':
            return 'destructive';
        case 'submitted':
            return 'default';
        case 'absent':
            return 'secondary';
        default:
            return 'outline';
    }
}

/**
 * Resolves a user-friendly label for the student status.
 */
export function getStatusLabel(status: ExamReport['students'][number]['status']) {
    switch (status) {
        case 'flagged':
            return 'Needs review';
        case 'submitted':
            return 'Submitted';
        case 'absent':
            return 'Absent';
        default:
            return 'In progress';
    }
}

/**
 * Resolves a user-friendly label for the submission type.
 */
export function getSubmissionTypeLabel(
    submissionType: ExamReport['students'][number]['submissionType'],
) {
    switch (submissionType) {
        case 'manual_submit':
            return 'Manual submit';
        case 'auto_submit':
            return 'Auto-submit';
        case 'force_close':
            return 'Force close';
        case 'absent':
            return 'Absent';
        case 'retake':
            return 'Retake';
        default:
            return 'Pending end state';
    }
}

/**
 * Resolves a user-friendly label for the attempt kind (primary, makeup, retake).
 */
export function getAttemptKindLabel(attemptKind: ExamReport['students'][number]['attemptKind']) {
    switch (attemptKind) {
        case 'makeup':
            return 'Makeup attempt';
        case 'retake':
            return 'Retake attempt';
        case 'primary':
            return 'Primary attempt';
        default:
            return 'No completed attempt';
    }
}

/**
 * Paginates an array of items client-side.
 */
export function paginateItems<T>(items: T[], page: number, pageSize: number) {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;

    return {
        items: items.slice(start, start + pageSize),
        pagination: {
            page: safePage,
            pageSize,
            total,
            totalPages,
            hasMore: safePage < totalPages,
        },
    };
}

