import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
    createAnswerKeyExport,
    type CreateAnswerKeyExportBody,
    type ExamAnswerKeyExportRecord,
} from '@sentinel/services';
import { ANALYTICS_MUTATION_KEYS, ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';

export type UseCreateAnswerKeyExportMutationArgs = UseMutationOptions<
    ExamAnswerKeyExportRecord,
    Error,
    CreateAnswerKeyExportBody
>;

export function useCreateAnswerKeyExportMutation(args: UseCreateAnswerKeyExportMutationArgs = {}) {
    const apiClient = useApi();
    const queryClient = useQueryClient();

    return useMutation<ExamAnswerKeyExportRecord, Error, CreateAnswerKeyExportBody>({
        ...args,
        mutationKey: ANALYTICS_MUTATION_KEYS.exportAnswerKey(),
        mutationFn: (variables) => createAnswerKeyExport(apiClient, variables),
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: ANALYTICS_QUERY_KEYS.answerKeyExports(
                    data.institutionId || variables.institution_id,
                    variables.exam_id,
                ),
            });

            await args.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
