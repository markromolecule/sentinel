import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
    getExamReportExports,
    type ListExamReportExportsParams,
    type PaginatedExamReportExports,
} from '@sentinel/services';
import { ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export type UseExamReportExportsQueryArgs = Omit<
    UseQueryOptions<PaginatedExamReportExports, Error>,
    'queryKey' | 'queryFn'
> & {
    payload?: ListExamReportExportsParams;
};

export function useExamReportExportsQuery({
    payload,
    ...options
}: UseExamReportExportsQueryArgs = {}) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery<PaginatedExamReportExports, Error>({
        ...options,
        queryKey: ANALYTICS_QUERY_KEYS.examReportExports(
            payload?.examId,
            payload?.page,
            payload?.limit,
            payload?.institutionId,
        ),
        queryFn: () => getExamReportExports(apiClient, payload),
        enabled: isAuthenticatedQueryEnabled && (options.enabled ?? true),
    });
}
