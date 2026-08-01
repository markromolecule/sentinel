import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { getExamReportExportDownload } from '@sentinel/services';
import { useApi } from '../../api-provider';

type ExamReportExportDownloadResponse = Awaited<ReturnType<typeof getExamReportExportDownload>>;

export type UseExamReportExportDownloadMutationArgs = UseMutationOptions<
    ExamReportExportDownloadResponse,
    Error,
    string
>;

export function useExamReportExportDownloadMutation(
    args: UseExamReportExportDownloadMutationArgs = {},
) {
    const apiClient = useApi();

    return useMutation<ExamReportExportDownloadResponse, Error, string>({
        ...args,
        mutationFn: (exportId) => getExamReportExportDownload(apiClient, exportId),
    });
}
