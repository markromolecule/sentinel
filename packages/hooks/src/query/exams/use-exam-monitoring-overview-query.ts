import { useQuery } from '@tanstack/react-query';
import { getExamMonitoringOverview } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export const EXAM_MONITORING_OVERVIEW_REFETCH_INTERVAL_MS = 6000;

/**
 * Fetches live monitoring overview data for an instructor exam dashboard.
 *
 * @param examId - Exam id whose monitoring overview should be loaded.
 */
export function useExamMonitoringOverviewQuery(examId?: string) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey: examId
            ? EXAM_QUERY_KEYS.monitoring(examId)
            : [...EXAM_QUERY_KEYS.all, 'monitoring'],
        queryFn: () => getExamMonitoringOverview(apiClient, examId as string),
        enabled: Boolean(examId) && isAuthenticatedQueryEnabled,
        staleTime: 4000,
        refetchInterval: EXAM_MONITORING_OVERVIEW_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
    });
}
