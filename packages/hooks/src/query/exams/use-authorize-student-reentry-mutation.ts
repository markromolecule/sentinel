import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
    authorizeStudentReentry,
    type AuthorizeStudentReentryPayload,
    type AuthorizeStudentReentryResult,
} from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';

export type UseAuthorizeStudentReentryMutationArgs = UseMutationOptions<
    AuthorizeStudentReentryResult,
    Error,
    AuthorizeStudentReentryPayload
>;

export function useAuthorizeStudentReentryMutation(
    args: UseAuthorizeStudentReentryMutationArgs = {
        onSuccess: () => toast.success('Student re-entry authorized successfully'),
        onError: (error: Error) => toast.error(error.message),
    },
) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation({
        ...args,
        mutationFn: (payload) => authorizeStudentReentry(apiClient, payload),
        onSuccess: async (data, variables, context) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.monitoring(variables.id),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(variables.id),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.lobbyCount(variables.id),
                }),
            ]);
            (args.onSuccess as any)?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            (args.onError as any)?.(error, variables, context);
        },
    });
}
