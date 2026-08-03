import { useDebounce } from '../../use-debounce';
import { useRoomsQuery } from './use-rooms-query';

/**
 * Debounced room search hook.
 * Wraps useRoomsQuery with a 300ms debounce applied to the search string.
 * The query is only enabled when the debounced query is >= 2 characters.
 *
 * @param query - The raw search string typed by the user.
 */
export function useRoomSearch(query: string) {
    const debouncedQuery = useDebounce(query, 300);

    const roomsQuery = useRoomsQuery({
        search: debouncedQuery,
        enabled: debouncedQuery.length >= 2,
    });

    return {
        rooms: Array.isArray(roomsQuery.data) ? roomsQuery.data : [],
        isLoading: roomsQuery.isLoading,
        isError: roomsQuery.isError,
        error: roomsQuery.error,
    };
}
