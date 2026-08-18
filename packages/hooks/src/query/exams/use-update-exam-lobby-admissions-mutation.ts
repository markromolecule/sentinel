import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
    updateExamLobbyAdmissions,
    type ExamLobbyWaitingStudent,
    type ExamLobbyAdmissionStatus,
} from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';

export type UpdateExamLobbyAdmissionsPayload = {
    examId: string;
    studentIds: string[];
    status: Extract<ExamLobbyAdmissionStatus, 'APPROVED' | 'REJECTED'>;
};

export type UseUpdateExamLobbyAdmissionsMutationArgs = UseMutationOptions<
    { updatedCount: number },
    Error,
    UpdateExamLobbyAdmissionsPayload,
    { previousWaitingList?: ExamLobbyWaitingStudent[] }
>;

export function useUpdateExamLobbyAdmissionsMutation(
    args: UseUpdateExamLobbyAdmissionsMutationArgs = {},
) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation<
        { updatedCount: number },
        Error,
        UpdateExamLobbyAdmissionsPayload,
        { previousWaitingList?: ExamLobbyWaitingStudent[] }
    >({
        ...args,
        mutationFn: (payload) => updateExamLobbyAdmissions(apiClient, payload),
        onMutate: async (variables) => {
            const queryKey = EXAM_QUERY_KEYS.lobbyWaitingList(variables.examId);
            await queryClient.cancelQueries({ queryKey });

            const previousWaitingList = queryClient.getQueryData<ExamLobbyWaitingStudent[]>(queryKey);

            if (previousWaitingList) {
                queryClient.setQueryData<ExamLobbyWaitingStudent[]>(queryKey, (old = []) =>
                    old.map((student) =>
                        variables.studentIds.includes(student.studentId)
                            ? {
                                ...student,
                                status: variables.status,
                                decidedAt: new Date().toISOString(),
                            }
                            : student,
                    ),
                );
            }

            return { previousWaitingList };
        },
        onError: (error, variables, context) => {
            if (context?.previousWaitingList) {
                queryClient.setQueryData(
                    EXAM_QUERY_KEYS.lobbyWaitingList(variables.examId),
                    context.previousWaitingList,
                );
            }
            if (args.onError) {
                (args.onError as any)(error, variables, context);
            } else {
                toast.error(error.message || 'Failed to update lobby admissions.');
            }
        },
        onSettled: async (_data, _error, variables, context) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(variables.examId),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.lobbyCount(variables.examId),
                }),
            ]);
            (args.onSettled as any)?.(_data, _error, variables, context);
        },
    });
}
