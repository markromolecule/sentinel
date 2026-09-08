import { useState } from 'react';
import type { useApi } from '@sentinel/hooks';
import { bulkFinalizeAttempts } from '@sentinel/services';
import { toast } from 'sonner';

export type UseExamFinalizationOptions = {
    apiClient: ReturnType<typeof useApi>;
    examId: string;
    refetch: () => Promise<any>;
};

export type UseExamFinalizationResult = {
    isFinalizingAll: boolean;
    handleFinalizeAll: () => Promise<void>;
};

/**
 * Manages bulk finalizing of in-progress exam attempts.
 */
export function useExamFinalization({
    apiClient,
    examId,
    refetch,
}: UseExamFinalizationOptions): UseExamFinalizationResult {
    const [isFinalizingAll, setIsFinalizingAll] = useState(false);

    const handleFinalizeAll = async () => {
        setIsFinalizingAll(true);
        try {
            const result = await bulkFinalizeAttempts(apiClient, examId);
            toast.success(`Successfully finalized ${result.count} attempt(s).`);
            await refetch();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to finalize attempts.');
        } finally {
            setIsFinalizingAll(false);
        }
    };

    return {
        isFinalizingAll,
        handleFinalizeAll,
    };
}
