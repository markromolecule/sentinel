import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
    bootstrapExamLobby,
    type ExamLobbyBootstrapResult,
} from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';

export type UseExamLobbyBootstrapMutationArgs = UseMutationOptions<
    ExamLobbyBootstrapResult,
    Error,
    string
>;

export function useExamLobbyBootstrapMutation(
    args: UseExamLobbyBootstrapMutationArgs = {},
) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation<ExamLobbyBootstrapResult, Error, string>({
        ...args,
        mutationFn: (examId: string) => bootstrapExamLobby(apiClient, examId),
        onSuccess: (data, examId, context) => {
            if (data.exam) {
                queryClient.setQueryData(EXAM_QUERY_KEYS.details(examId), data.exam);
            }

            if (data.configuration) {
                queryClient.setQueryData(EXAM_QUERY_KEYS.configuration(examId), data.configuration);
            }

            if (data.admission) {
                queryClient.setQueryData(EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId), {
                    status: data.admission.status,
                    checkedInAt: data.admission.checkedInAt ?? null,
                    decidedAt: data.admission.decidedAt ?? null,
                });
            }

            if (typeof data.waitingCount === 'number') {
                queryClient.setQueryData(EXAM_QUERY_KEYS.lobbyCount(examId), {
                    count: data.waitingCount,
                });
            }

            (args.onSuccess as any)?.(data, examId, context);
        },
        onError: (error, examId, context) => {
            (args.onError as any)?.(error, examId, context);
        },
    });
}
