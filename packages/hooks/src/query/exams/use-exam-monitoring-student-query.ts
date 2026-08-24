import { useQuery } from '@tanstack/react-query';
import { getExamMonitoringStudentDetail } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

export function useExamMonitoringStudentQuery(examId?: string, studentId?: string) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey:
            examId && studentId
                ? EXAM_QUERY_KEYS.monitoringStudent(examId, studentId)
                : [...EXAM_QUERY_KEYS.all, 'monitoring', 'student'],
        queryFn: () =>
            getExamMonitoringStudentDetail(apiClient, examId as string, studentId as string),
        enabled: Boolean(examId && studentId) && isAuthenticatedQueryEnabled,
        staleTime: 4000,
        refetchInterval: 8000,
        refetchIntervalInBackground: false,
    });
}
