import { useQuery } from '@tanstack/react-query';
import { getEffectiveEssayRubric } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

/**
 * Hook for fetching the effective essay rubric (baseline or exam override)
 * for a specific exam.
 *
 * @param examId - The UUID of the exam.
 * @returns React Query query result object containing the resolved essay rubric.
 */
export function useEssayRubricQuery(examId?: string) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey: examId
            ? EXAM_QUERY_KEYS.essayRubric(examId)
            : [...EXAM_QUERY_KEYS.all, 'essay-rubric'],
        queryFn: () => getEffectiveEssayRubric(apiClient, examId as string),
        enabled: Boolean(examId) && isAuthenticatedQueryEnabled,
    });
}
