import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
    batchCreateStudentExamAccessOverrides,
    type ApiStudentExamAccessOverride,
    type BatchCreateStudentExamAccessOverridePayload,
} from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';

export type UseBatchCreateExamOverridesMutationArgs = UseMutationOptions<
    ApiStudentExamAccessOverride[],
    Error,
    BatchCreateStudentExamAccessOverridePayload
>;

export function useBatchCreateExamOverridesMutation(
    args: UseBatchCreateExamOverridesMutationArgs = {
        onSuccess: () => toast.success('Make-up exam access granted successfully'),
        onError: (error: Error) => toast.error(error.message),
    },
) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation({
        ...args,
        mutationFn: (payload) => batchCreateStudentExamAccessOverrides(apiClient, payload),
        onSuccess: async (data, variables, context) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.monitoring(variables.id),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.report(variables.id),
                }),
            ]);
            (args.onSuccess as any)?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            (args.onError as any)?.(error, variables, context);
        },
    });
}
