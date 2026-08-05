import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { sendMessage } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { type ConversationMessage } from '@sentinel/shared/types';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';
import { useAuth } from '../../auth-provider';
import { toast } from 'sonner';
import { applyMessageRealtimePayload } from './message-cache';

export type UseSendMessageMutationArgs = UseMutationOptions<
    ConversationMessage,
    Error,
    { conversationId: string; content: string }
>;

/**
 * Mutation hook to send a message within a conversation.
 * Automatically invalidates conversation messages and conversations list (for previews/unread counts) upon success.
 *
 * @param args Optional mutation options.
 * @returns The mutation object.
 */
export function useSendMessageMutation(args: UseSendMessageMutationArgs = {}) {
    const queryClient = useQueryClient();
    const apiClient = useApi();
    const { user } = useAuth();

    return useMutation<ConversationMessage, Error, { conversationId: string; content: string }>({
        ...args,
        mutationFn: ({ conversationId, content }) => {
            const normalizedContent = content.trim();

            if (!normalizedContent) {
                throw new Error('Message content cannot be empty');
            }

            return sendMessage(apiClient, conversationId, normalizedContent);
        },
        onSuccess: async (data, variables, context) => {
            applyMessageRealtimePayload({
                queryClient,
                payload: { eventType: 'INSERT', new: data },
                currentUserId: user?.id ?? '',
                conversationId: variables.conversationId,
                invalidateList: false,
            });

            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: MESSAGES_QUERY_KEYS.messages(variables.conversationId),
                }),
                queryClient.invalidateQueries({
                    queryKey: MESSAGES_QUERY_KEYS.conversations(),
                }),
            ]);
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
            toast.error(error.message || 'Failed to send message');
        },
    });
}
