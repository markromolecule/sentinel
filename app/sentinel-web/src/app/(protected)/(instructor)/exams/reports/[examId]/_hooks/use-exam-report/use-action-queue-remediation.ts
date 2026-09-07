import { useState } from 'react';
import type { useApi } from '@sentinel/hooks';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import { toast } from 'sonner';
import type { ActionQueueType } from '../../_types';
import { DEFAULT_ACTIVE_QUEUE } from '../../_constants';
import {
    buildGrantSuccessMessage,
    grantLifecycleOverride,
    grantLifecycleOverridesBatch,
} from './remediation-lifecycle';

export type UseActionQueueRemediationOptions = {
    apiClient: ReturnType<typeof useApi>;
    examId: string;
    refetch: () => Promise<any>;
};

export type UseActionQueueRemediationResult = {
    activeQueue: ActionQueueType;
    setActiveQueue: (queue: ActionQueueType) => void;
    actionPages: Record<ActionQueueType, number>;
    setActionPages: React.Dispatch<React.SetStateAction<Record<ActionQueueType, number>>>;
    activeActionId: string | null;
    handleGrantOverride: (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        overrideType: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => Promise<void>;
};

/**
 * Manages action queue tabs, pagination, and single/batch remediation overrides.
 */
export function useActionQueueRemediation({
    apiClient,
    examId,
    refetch,
}: UseActionQueueRemediationOptions): UseActionQueueRemediationResult {
    const [activeQueue, setActiveQueue] = useState<ActionQueueType>(DEFAULT_ACTIVE_QUEUE);
    const [actionPages, setActionPages] = useState<Record<ActionQueueType, number>>({
        review: 1,
        makeup: 1,
        retake: 1,
    });
    const [activeActionId, setActiveActionId] = useState<string | null>(null);

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
                toast.error(
                    error instanceof Error
                        ? `Failed to grant remediation: ${error.message}`
                        : 'Failed to grant remediation.',
                );
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
        activeQueue,
        setActiveQueue,
        actionPages,
        setActionPages,
        activeActionId,
        handleGrantOverride,
    };
}
