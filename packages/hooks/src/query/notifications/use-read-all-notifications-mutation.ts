import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { markAllNotificationsRead } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { toast } from 'sonner';

export type UseReadAllNotificationsMutationArgs = {
    queryKey: readonly unknown[];
    options?: UseMutationOptions<{ message: string; count: number }, Error, void>;
};

/**
 * Hook to mark all authenticated user's notifications as read.
 *
 * @param args Query key to invalidate and optional mutation callbacks.
 */
export function useReadAllNotificationsMutation({
    queryKey,
    options = {},
}: UseReadAllNotificationsMutationArgs) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation({
        ...options,
        mutationFn: () => markAllNotificationsRead(apiClient),
        onSuccess: async (data, variables, context) => {
            await queryClient.invalidateQueries({ queryKey });
            if (options.onSuccess) {
                await (options.onSuccess as any)(data, variables, context);
                return;
            }

            toast.success('All notifications marked as read');
        },
        onError: (error, variables, context) => {
            if (options.onError) {
                (options.onError as any)(error, variables, context);
                return;
            }

            toast.error(error.message || 'Failed to mark notifications as read');
        },
    });
}
