import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { markConversationRead } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { clearConversationUnreadCount } from './message-cache';

export type UseMarkConversationReadMutationArgs = UseMutationOptions<
    { success: boolean },
    Error,
    { conversationId: string }
>;

/**
 * Mutation hook to mark all messages in a conversation as read.
 * Automatically invalidates active conversations list upon success (which updates unread count).
 *
 * @param args Optional mutation options.
 * @returns The mutation object.
 */
export function useMarkConversationReadMutation(args: UseMarkConversationReadMutationArgs = {}) {
    const queryClient = useQueryClient();
    const apiClient = useApi();

    return useMutation<{ success: boolean }, Error, { conversationId: string }>({
        ...args,
        mutationFn: ({ conversationId }) => markConversationRead(apiClient, conversationId),
        onSuccess: async (data, variables, context) => {
            clearConversationUnreadCount({
                queryClient,
                conversationId: variables.conversationId,
            });

            await queryClient.invalidateQueries({
                queryKey: MESSAGES_QUERY_KEYS.conversations(),
            });
            if (args.onSuccess) {
                await (args.onSuccess as any)(data, variables, context);
                return;
            }
        },
        onError: (error, variables, context) => {
            if (args.onError) {
                (args.onError as any)(error, variables, context);
                return;
            }
            toast.error(error.message || 'Failed to mark conversation read');
        },
    });
}
