import type { useApi } from '@sentinel/hooks';
import type { ExamReportActionItem } from '@sentinel/shared/types';

export type GrantLifecycleOverrideArgs = {
    apiClient: ReturnType<typeof useApi>;
    examId: string;
    item: ExamReportActionItem;
    overrideType: 'MAKEUP' | 'RETAKE';
    availableFrom: string;
    availableUntil: string;
    notes: string | null;
};

export type GrantLifecycleOverridesBatchArgs = {
    apiClient: ReturnType<typeof useApi>;
    examId: string;
    items: ExamReportActionItem[];
    overrideType: 'MAKEUP' | 'RETAKE';
    availableFrom: string;
    availableUntil: string;
    notes: string | null;
};

export type BatchOverrideResult = {
    succeeded: { item: ExamReportActionItem; response: any }[];
    failed: { item: ExamReportActionItem; reason: string }[];
};

/**
 * Grants a single makeup or retake remediation exam window for a student.
 */
export async function grantLifecycleOverride(args: GrantLifecycleOverrideArgs): Promise<any> {
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
 * Formats user-facing toast success message based on the remediation grant response.
 */
export function buildGrantSuccessMessage(args: {
    overrideType: 'MAKEUP' | 'RETAKE';
    response: any;
}): string {
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
 * Grants remediation exam windows for multiple students concurrently using Promise.allSettled.
 */
export async function grantLifecycleOverridesBatch(
    args: GrantLifecycleOverridesBatchArgs,
): Promise<BatchOverrideResult> {
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
