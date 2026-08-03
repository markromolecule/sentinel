import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { getEnrolledSubjects } from '@sentinel/services';
import type { PaginatedApiResponse } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { SUBJECT_QUERY_KEYS } from '@sentinel/shared/constants';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';
import type { EnrolledSubjectData } from '@sentinel/shared/types';

type UseEnrolledSubjectsQueryArgs = {
    search?: string;
    page?: number;
    limit?: number;
};

export function useEnrolledSubjectsQuery(
    search?: string,
): UseQueryResult<EnrolledSubjectData[], Error>;
export function useEnrolledSubjectsQuery(
    params: UseEnrolledSubjectsQueryArgs & { page: number; limit: number },
): UseQueryResult<PaginatedApiResponse<EnrolledSubjectData>, Error>;
export function useEnrolledSubjectsQuery(
    searchOrParams?: string | UseEnrolledSubjectsQueryArgs,
): UseQueryResult<EnrolledSubjectData[] | PaginatedApiResponse<EnrolledSubjectData>, Error>;
export function useEnrolledSubjectsQuery(searchOrParams?: string | UseEnrolledSubjectsQueryArgs) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();
    const params =
        typeof searchOrParams === 'string' ? { search: searchOrParams } : (searchOrParams ?? {});
    const hasPagination = params.page !== undefined && params.limit !== undefined;
    return useQuery({
        queryKey: [
            ...SUBJECT_QUERY_KEYS.enrolled,
            params.search ?? '',
            params.page ?? '',
            params.limit ?? '',
        ],
        queryFn: async () => {
            const response = await getEnrolledSubjects(apiClient, {
                search: params.search,
                page: params.page,
                limit: params.limit,
            });
            if (hasPagination) {
                return response;
            }

            return Array.isArray(response) ? response : response.items;
        },
        enabled: isAuthenticatedQueryEnabled,
        refetchInterval: 5000,
    });
}
