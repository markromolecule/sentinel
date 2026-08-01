import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { retryExamReportExport } from '@sentinel/services';
import { ANALYTICS_MUTATION_KEYS, ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';

type RetryExamReportExportResponse = Awaited<ReturnType<typeof retryExamReportExport>>;

export interface RetryExamReportExportVariables {
    exportId: string;
    examId: string;
    institutionId?: string;
    page?: number;
    limit?: number;
}

export type UseRetryExamReportExportMutationArgs = UseMutationOptions<
    RetryExamReportExportResponse,
    Error,
    RetryExamReportExportVariables
>;

export function useRetryExamReportExportMutation(args: UseRetryExamReportExportMutationArgs = {}) {
    const apiClient = useApi();
    const queryClient = useQueryClient();

    return useMutation<RetryExamReportExportResponse, Error, RetryExamReportExportVariables>({
        ...args,
        mutationKey: ANALYTICS_MUTATION_KEYS.retryExamReportExport(),
        mutationFn: ({ exportId }) => retryExamReportExport(apiClient, exportId),
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: ANALYTICS_QUERY_KEYS.examReportExports(
                    variables.examId,
                    variables.page,
                    variables.limit,
                    variables.institutionId,
                ),
            });
            await queryClient.invalidateQueries({
                queryKey: ANALYTICS_QUERY_KEYS.examReportExportStatus(
                    variables.examId,
                    variables.exportId,
                ),
            });

            await args.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
