import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { deleteExamReportExport } from '@sentinel/services';
import { ANALYTICS_MUTATION_KEYS, ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';

type DeleteExamReportExportResponse = Awaited<ReturnType<typeof deleteExamReportExport>>;

export interface DeleteExamReportExportVariables {
    exportId: string;
    examId: string;
    institutionId?: string;
    page?: number;
    limit?: number;
}

export type UseDeleteExamReportExportMutationArgs = UseMutationOptions<
    DeleteExamReportExportResponse,
    Error,
    DeleteExamReportExportVariables
>;

export function useDeleteExamReportExportMutation(
    args: UseDeleteExamReportExportMutationArgs = {},
) {
    const apiClient = useApi();
    const queryClient = useQueryClient();

    return useMutation<DeleteExamReportExportResponse, Error, DeleteExamReportExportVariables>({
        ...args,
        mutationKey: ANALYTICS_MUTATION_KEYS.deleteExamReportExport(),
        mutationFn: ({ exportId }) => deleteExamReportExport(apiClient, exportId),
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: ANALYTICS_QUERY_KEYS.examReportExports(
                    variables.examId,
                    variables.page,
                    variables.limit,
                    variables.institutionId,
                ),
            });
            queryClient.removeQueries({
                queryKey: ANALYTICS_QUERY_KEYS.examReportExportStatus(
                    variables.examId,
                    variables.exportId,
                ),
            });

            await args.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
