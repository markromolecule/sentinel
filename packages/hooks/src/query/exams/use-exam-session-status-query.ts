import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getExamSessionStatus, type ExamSessionStatusResult } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export const EXAM_SESSION_STATUS_REFETCH_INTERVAL_MS = 2000;

export type UseExamSessionStatusQueryOptions = Omit<
    UseQueryOptions<ExamSessionStatusResult, Error>,
    'queryKey' | 'queryFn' | 'enabled' | 'refetchInterval' | 'refetchIntervalInBackground'
>;

/**
 * Polls lightweight status for an active student-owned exam session.
 */
export function useExamSessionStatusQuery(
    sessionId?: string | null,
    isAttemptActive = false,
    options?: UseExamSessionStatusQueryOptions,
) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();
    const hasSession = Boolean(sessionId);

    return useQuery({
        ...options,
        queryKey: hasSession
            ? EXAM_QUERY_KEYS.sessionStatus(sessionId as string)
            : [...EXAM_QUERY_KEYS.all, 'session-status'],
        queryFn: () => getExamSessionStatus(apiClient, sessionId as string),
        enabled: hasSession && isAttemptActive && isAuthenticatedQueryEnabled,
        refetchInterval: EXAM_SESSION_STATUS_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: true,
    });
}
