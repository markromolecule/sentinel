import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getBaselineEssayRubric, type ResolvedEssayRubric } from '@sentinel/services';
import { ACCESS_CONTROL_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

/**
 * Hook for fetching the active baseline essay rubric managed by support.
 *
 * @returns React Query query result object containing the resolved baseline essay rubric.
 */
export function useAccessControlEssayRubricQuery(): UseQueryResult<ResolvedEssayRubric, Error> {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey: ACCESS_CONTROL_QUERY_KEYS.baselineEssayRubric(),
        queryFn: () => getBaselineEssayRubric(apiClient),
        enabled: isAuthenticatedQueryEnabled,
    });
}
