import { useInfiniteQuery } from '@tanstack/react-query';
import { getExamIncidents, type ApiGetExamIncidentsQuery } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export const EXAM_INCIDENTS_QUERY_KEY = (examId: string, query: ApiGetExamIncidentsQuery) =>
    ['exams', examId, 'incidents', query] as const;

export const EXAM_INCIDENTS_REFETCH_INTERVAL_MS = 6000;

/**
 * Custom hook to fetch infinite/paginated telemetry incidents for a specific exam.
 *
 * @param examId - The UUID of the exam.
 * @param query - The filter queries (sectionId, studentId, severity, type, status, limit).
 */
export function useExamIncidentsQuery(
    examId: string,
    query: Omit<ApiGetExamIncidentsQuery, 'page'> = {},
) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useInfiniteQuery({
        queryKey: EXAM_INCIDENTS_QUERY_KEY(examId, query),
        queryFn: ({ pageParam = 1 }) =>
            getExamIncidents(apiClient, examId, { ...query, page: pageParam }),
        getNextPageParam: (lastPage) => {
            const { page, totalPages } = lastPage.meta;
            return page < totalPages ? page + 1 : undefined;
        },
        initialPageParam: 1,
        enabled: isAuthenticatedQueryEnabled && Boolean(examId),
        staleTime: 4000,
        refetchInterval: EXAM_INCIDENTS_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
    });
}
