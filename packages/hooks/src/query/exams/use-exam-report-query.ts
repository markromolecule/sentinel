import { useQuery } from '@tanstack/react-query';
import { getExamReport, type GetExamReportParams } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export function useExamReportQuery(examId?: string, params?: GetExamReportParams) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey: examId
            ? [...EXAM_QUERY_KEYS.report(examId), params ?? {}]
            : [...EXAM_QUERY_KEYS.all, 'report', params ?? {}],
        queryFn: () => getExamReport(apiClient, examId as string, params),
        enabled: Boolean(examId) && isAuthenticatedQueryEnabled,
        placeholderData: (previousData) => previousData,
    });
}
