import { useQuery } from '@tanstack/react-query';
import { getExamLobbyAdmissionStatus, type ExamLobbyAdmissionStatusResult } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export function useExamLobbyAdmissionStatusQuery(examId?: string) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery<ExamLobbyAdmissionStatusResult, Error>({
        queryKey: examId
            ? EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId)
            : [...EXAM_QUERY_KEYS.all, 'lobby', 'admission-status'],
        queryFn: () => getExamLobbyAdmissionStatus(apiClient, examId as string),
        enabled: Boolean(examId) && isAuthenticatedQueryEnabled,
        staleTime: 30_000,
        refetchInterval: false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    });
}
