import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import { getAccessControlPermissions } from '@sentinel/services';
import { ACCESS_CONTROL_QUERY_KEYS } from '@sentinel/shared/constants';
import type { AccessControlPermission } from '@sentinel/shared/types';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export function useAccessControlPermissionsQuery(
    search?: string,
): UseQueryResult<AccessControlPermission[], Error> {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey: [...ACCESS_CONTROL_QUERY_KEYS.permissions(), { search }],
        queryFn: () => getAccessControlPermissions(apiClient, search),
        enabled: isAuthenticatedQueryEnabled,
        placeholderData: keepPreviousData,
    });
}
