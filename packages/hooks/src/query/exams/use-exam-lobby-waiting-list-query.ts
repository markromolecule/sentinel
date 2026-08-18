import { useQuery } from '@tanstack/react-query';
import { getExamLobbyWaitingList, type ExamLobbyWaitingStudent } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export function useExamLobbyWaitingListQuery(examId?: string) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery<ExamLobbyWaitingStudent[], Error>({
        queryKey: examId
            ? EXAM_QUERY_KEYS.lobbyWaitingList(examId)
            : [...EXAM_QUERY_KEYS.all, 'lobby', 'waiting-list'],
        queryFn: () => getExamLobbyWaitingList(apiClient, examId as string),
        enabled: Boolean(examId) && isAuthenticatedQueryEnabled,
        staleTime: 5000,
        refetchOnWindowFocus: true,
    });
}
