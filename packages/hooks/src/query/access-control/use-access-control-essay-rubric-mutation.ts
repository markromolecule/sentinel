import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { updateBaselineEssayRubric, type UpdateExamEssayRubricResponse } from '@sentinel/services';
import { ACCESS_CONTROL_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';

export type UseAccessControlEssayRubricMutationArgs = UseMutationOptions<
    UpdateExamEssayRubricResponse,
    Error,
    {
        criteria: Array<{
            key: string;
            name: string;
            weight: number;
            description: string;
            levels: Record<number, string>;
        }>;
    }
>;

/**
 * Hook for updating the baseline essay rubric managed by support.
 * Invalidates related baseline essay rubric query on success.
 *
 * @param args - React Query mutation options.
 * @returns React Query mutation result object.
 */
export function useAccessControlEssayRubricMutation(
    args: UseAccessControlEssayRubricMutationArgs = {
        onSuccess: () => toast.success('Baseline essay rubric updated successfully.'),
        onError: (error: Error) => toast.error(error.message),
    },
) {
    const apiClient = useApi();
    const queryClient = useQueryClient();

    return useMutation({
        ...args,
        mutationFn: (payload) => updateBaselineEssayRubric(apiClient, payload),
        onSuccess: async (data, variables, context) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ACCESS_CONTROL_QUERY_KEYS.baselineEssayRubric(),
                }),
                queryClient.invalidateQueries({
                    queryKey: ACCESS_CONTROL_QUERY_KEYS.overview(),
                }),
            ]);
            (args.onSuccess as any)?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            (args.onError as any)?.(error, variables, context);
        },
    });
}
