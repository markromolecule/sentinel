import { useState } from 'react';
import { useApi } from '@sentinel/hooks';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import { toast } from 'sonner';
import {
    buildGrantSuccessMessage,
    grantLifecycleOverride,
    grantLifecycleOverridesBatch,
} from '../_helpers/report-helpers';

export type RemediationTarget = {
    items: ExamReportActionItem[];
    type: 'MAKEUP' | 'RETAKE';
} | null;

export type UseExamReportRemediationOptions = {
    examId: string;
    refetch: () => Promise<any>;
    apiClient?: ReturnType<typeof useApi>;
};

export type UseExamReportRemediationResult = {
    activeActionId: string | null;
    remediationTarget: RemediationTarget;
    setRemediationTarget: React.Dispatch<React.SetStateAction<RemediationTarget>>;
    handleGrantOverride: (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        overrideType: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => Promise<void>;
};

/**
 * Hook to manage remediation override state, targets, and API dispatches.
 */
export function useExamReportRemediation({
    examId,
    refetch,
    apiClient: providedApiClient,
}: UseExamReportRemediationOptions): UseExamReportRemediationResult {
    const hookApiClient = useApi();
    const apiClient = providedApiClient ?? hookApiClient;

    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [remediationTarget, setRemediationTarget] = useState<RemediationTarget>(null);

    const handleGrantOverride = async (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        overrideType: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => {
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        if (items.length === 0) return;

        const label = overrideType === 'MAKEUP' ? 'Makeup' : 'Retake';

        if (items.length === 1) {
            const item = items[0]!;
            setActiveActionId(item.studentId);

            try {
                const response = await grantLifecycleOverride({
                    apiClient,
                    examId,
                    item,
                    overrideType,
                    availableFrom,
                    availableUntil,
                    notes,
                });

                toast.success(buildGrantSuccessMessage({ overrideType, response }));
                await refetch();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to grant override.');
            } finally {
                setActiveActionId(null);
            }
            return;
        }

        // Batch execution
        setActiveActionId('batch');
        try {
            const { succeeded, failed } = await grantLifecycleOverridesBatch({
                apiClient,
                examId,
                items,
                overrideType,
                availableFrom,
                availableUntil,
                notes,
            });

            if (failed.length === 0) {
                toast.success(
                    `Successfully scheduled ${label.toLowerCase()} for all ${succeeded.length} students.`,
                );
            } else if (succeeded.length > 0) {
                toast.warning(
                    `Scheduled ${label.toLowerCase()} for ${succeeded.length} student(s). ${failed.length} failed.`,
                );
            } else {
                toast.error(`Failed to schedule ${label.toLowerCase()} for selected students.`);
            }

            await refetch();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? `Failed to process batch ${label.toLowerCase()}: ${error.message}`
                    : `Failed to process batch ${label.toLowerCase()}.`,
            );
        } finally {
            setActiveActionId(null);
        }
    };

    return {
        activeActionId,
        remediationTarget,
        setRemediationTarget,
        handleGrantOverride,
    };
}
