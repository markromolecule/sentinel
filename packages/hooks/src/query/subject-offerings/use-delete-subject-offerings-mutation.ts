import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { deleteSubjectOfferings } from '@sentinel/services';
import { SUBJECT_OFFERING_QUERY_KEYS, SUBJECT_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';
import { notifyPermissionDenied } from '../_shared/permission-errors';

export type DeleteSubjectOfferingsMutationVariables =
    string[] | { ids: string[]; institutionId?: string };

export type UseDeleteSubjectOfferingsMutationArgs = UseMutationOptions<
    void,
    Error,
    DeleteSubjectOfferingsMutationVariables
>;

export function useDeleteSubjectOfferingsMutation(
    args: UseDeleteSubjectOfferingsMutationArgs = {},
) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation({
        ...args,
        mutationFn: (ids) => deleteSubjectOfferings(apiClient, ids),
        onSuccess: async (data, variables, context) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: SUBJECT_OFFERING_QUERY_KEYS.all }),
                queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all }),
            ]);
            if (args.onSuccess) {
                (args.onSuccess as any)(data, variables, context);
                return;
            }

            toast.success('Subject offerings removed successfully');
        },
        onError: (error, variables, context) => {
            if (args.onError) {
                (args.onError as any)(error, variables, context);
                return;
            }

            notifyPermissionDenied(error, {
                resourceName: 'subject offerings',
                action: 'delete',
                permissionKey: 'subject_offerings:delete',
            });
        },
    });
}
