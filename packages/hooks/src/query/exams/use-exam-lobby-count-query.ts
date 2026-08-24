import { useQuery } from '@tanstack/react-query';
import { getExamLobbyCount } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export function useExamLobbyCountQuery(examId?: string) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey: examId
            ? EXAM_QUERY_KEYS.lobbyCount(examId)
            : [...EXAM_QUERY_KEYS.all, 'lobby', 'count'],
        queryFn: () => getExamLobbyCount(apiClient, examId as string),
        enabled: Boolean(examId) && isAuthenticatedQueryEnabled,
        staleTime: 30_000,
        refetchOnMount: true,
        refetchInterval: false,
        refetchIntervalInBackground: false,
    });
}
