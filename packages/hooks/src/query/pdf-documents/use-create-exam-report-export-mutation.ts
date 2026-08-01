import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
    createExamReportExport,
    type CreateExamReportExportBody,
    type ExamResultsReportExportRecord,
} from '@sentinel/services';
import { ANALYTICS_MUTATION_KEYS, ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';

export interface CreateExamReportExportMutationContext {
    institutionId?: string;
    page?: number;
    limit?: number;
}

export type CreateExamReportExportVariables = CreateExamReportExportBody &
    CreateExamReportExportMutationContext;

export type UseCreateExamReportExportMutationArgs = UseMutationOptions<
    ExamResultsReportExportRecord,
    Error,
    CreateExamReportExportVariables
>;

export function useCreateExamReportExportMutation(
    args: UseCreateExamReportExportMutationArgs = {},
) {
    const apiClient = useApi();
    const queryClient = useQueryClient();

    return useMutation<ExamResultsReportExportRecord, Error, CreateExamReportExportVariables>({
        ...args,
        mutationKey: ANALYTICS_MUTATION_KEYS.exportExamReport(),
        mutationFn: ({ exam_id, title }) => createExamReportExport(apiClient, { exam_id, title }),
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: ANALYTICS_QUERY_KEYS.examReportExports(
                    variables.exam_id,
                    variables.page,
                    variables.limit,
                    variables.institutionId,
                ),
            });

            await args.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
