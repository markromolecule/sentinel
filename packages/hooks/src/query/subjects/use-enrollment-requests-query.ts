import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { getEnrollmentRequests } from '@sentinel/services';
import type { PaginatedApiResponse } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { SUBJECT_QUERY_KEYS } from '@sentinel/shared/constants';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';
import type { EnrollmentRequest } from '@sentinel/shared/types';

type UseEnrollmentRequestsQueryArgs = {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    search?: string;
    institutionId?: string;
    page?: number;
    limit?: number;
};

export function useEnrollmentRequestsQuery(
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    search?: string,
    institutionId?: string,
): UseQueryResult<EnrollmentRequest[], Error>;
export function useEnrollmentRequestsQuery(
    params: UseEnrollmentRequestsQueryArgs & { page: number; limit: number },
): UseQueryResult<PaginatedApiResponse<EnrollmentRequest>, Error>;
export function useEnrollmentRequestsQuery(
    statusOrParams?: 'PENDING' | 'APPROVED' | 'REJECTED' | UseEnrollmentRequestsQueryArgs,
    search?: string,
    institutionId?: string,
): UseQueryResult<EnrollmentRequest[] | PaginatedApiResponse<EnrollmentRequest>, Error>;
export function useEnrollmentRequestsQuery(
    statusOrParams?: 'PENDING' | 'APPROVED' | 'REJECTED' | UseEnrollmentRequestsQueryArgs,
    search?: string,
    institutionId?: string,
) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();
    const params =
        typeof statusOrParams === 'string' || statusOrParams === undefined
            ? { status: statusOrParams, search, institutionId }
            : statusOrParams;
    const hasPagination = params.page !== undefined && params.limit !== undefined;
    return useQuery({
        queryKey: [
            ...SUBJECT_QUERY_KEYS.all,
            'requests',
            params.status || 'ALL',
            params.search ?? '',
            params.institutionId ?? '',
            params.page ?? '',
            params.limit ?? '',
        ],
        queryFn: async () => {
            const response = await getEnrollmentRequests(apiClient, {
                status: params.status,
                search: params.search,
                institutionId: params.institutionId,
                page: params.page,
                limit: params.limit,
            });
            if (hasPagination) {
                return response;
            }

            return Array.isArray(response) ? response : response.items;
        },
        enabled: isAuthenticatedQueryEnabled,
        staleTime: 30_000,
    });
}
