import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { updateExamEssayRubric, type UpdateExamEssayRubricResponse } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';

export type UseUpdateExamEssayRubricMutationArgs = UseMutationOptions<
    UpdateExamEssayRubricResponse,
    Error,
    {
        examId: string;
        payload: {
            criteria: Array<{
                key: string;
                name: string;
                weight: number;
                description: string;
                levels: Record<number, string>;
            }>;
        };
    }
>;

/**
 * Hook for updating/overriding the essay rubric definition for an exam.
 * Invalidates related queries on success.
 *
 * @param args - React Query mutation options.
 * @returns React Query mutation result object.
 */
export function useUpdateExamEssayRubricMutation(
    args: UseUpdateExamEssayRubricMutationArgs = {
        onSuccess: () => toast.success('Exam essay rubric override updated successfully.'),
        onError: (error: Error) => toast.error(error.message),
    },
) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation({
        ...args,
        mutationFn: (variables) => updateExamEssayRubric(apiClient, variables),
        onSuccess: async (data, variables, context) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.essayRubric(variables.examId),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.details(variables.examId),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.all,
                }),
                queryClient.invalidateQueries({
                    queryKey: ['grading-attempt'],
                }),
            ]);
            (args.onSuccess as any)?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            (args.onError as any)?.(error, variables, context);
        },
    });
}
