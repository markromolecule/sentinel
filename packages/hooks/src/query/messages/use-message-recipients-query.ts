import { useQuery } from '@tanstack/react-query';
import { getMessageRecipients } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { type MessageRecipient } from '@sentinel/shared/types';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';
import { useDebounce } from '../../use-debounce';

/**
 * Hook to query and cache eligible message recipients.
 * Debounces search input by 300ms, and requires at least 2 characters.
 *
 * @param search - Raw search input string.
 * @param limit - Maximum number of recipients to fetch (defaults to 20).
 * @returns The react-query result containing the message recipients list.
 */
export function useMessageRecipientsQuery(search: string, limit: number = 20) {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    const trimmed = search.trim();
    const debouncedSearch = useDebounce(trimmed, 300);

    return useQuery<MessageRecipient[], Error>({
        queryKey: MESSAGES_QUERY_KEYS.recipients(debouncedSearch, limit),
        queryFn: () => getMessageRecipients(apiClient, { search: debouncedSearch, limit }),
        enabled: isAuthenticatedQueryEnabled && debouncedSearch.length >= 2,
    });
}
