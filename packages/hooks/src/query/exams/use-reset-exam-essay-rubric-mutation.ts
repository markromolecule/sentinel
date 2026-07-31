import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { resetExamEssayRubric, type ResolvedEssayRubric } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';

export type UseResetExamEssayRubricMutationArgs = UseMutationOptions<
    ResolvedEssayRubric,
    Error,
    string // The examId
>;

/**
 * Hook for resetting an exam's essay rubric override, falling back to the baseline.
 * Invalidates related queries on success.
 *
 * @param args - React Query mutation options.
 * @returns React Query mutation result object.
 */
export function useResetExamEssayRubricMutation(
    args: UseResetExamEssayRubricMutationArgs = {
        onSuccess: () => toast.success('Exam essay rubric reset to baseline successfully.'),
        onError: (error: Error) => toast.error(error.message),
    },
) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation({
        ...args,
        mutationFn: (examId) => resetExamEssayRubric(apiClient, examId),
        onSuccess: async (data, examId, context) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.essayRubric(examId),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.details(examId),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.all,
                }),
                queryClient.invalidateQueries({
                    queryKey: ['grading-attempt'],
                }),
            ]);
            (args.onSuccess as any)?.(data, examId, context);
        },
        onError: (error, examId, context) => {
            (args.onError as any)?.(error, examId, context);
        },
    });
}
