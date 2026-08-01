import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { getExamReportExportStatus, type ExamResultsReportExportRecord } from '@sentinel/services';
import { ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export interface UseExamReportExportStatusQueryParams {
    exportId?: string | null;
    examId?: string;
    institutionId?: string;
    page?: number;
    limit?: number;
}

export type UseExamReportExportStatusQueryArgs = Omit<
    UseQueryOptions<ExamResultsReportExportRecord, Error>,
    'queryKey' | 'queryFn'
> & {
    payload?: UseExamReportExportStatusQueryParams;
};

export function useExamReportExportStatusQuery({
    payload,
    ...options
}: UseExamReportExportStatusQueryArgs = {}) {
    const apiClient = useApi();
    const queryClient = useQueryClient();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery<ExamResultsReportExportRecord, Error>({
        ...options,
        queryKey: ANALYTICS_QUERY_KEYS.examReportExportStatus(payload?.examId, payload?.exportId),
        queryFn: () => getExamReportExportStatus(apiClient, payload?.exportId as string),
        enabled:
            isAuthenticatedQueryEnabled && Boolean(payload?.exportId) && (options.enabled ?? true),
        refetchInterval: (query) => {
            if (!payload?.exportId) {
                return false;
            }

            const status = (query.state.data as ExamResultsReportExportRecord | undefined)?.status;
            const isActiveStatus = status === 'PENDING' || status === 'GENERATING';

            if (!isActiveStatus && status && payload.examId) {
                void queryClient.invalidateQueries({
                    queryKey: ANALYTICS_QUERY_KEYS.examReportExports(
                        payload.examId,
                        payload.page,
                        payload.limit,
                        payload.institutionId,
                    ),
                });
            }

            return isActiveStatus ? 5000 : false;
        },
    });
}
