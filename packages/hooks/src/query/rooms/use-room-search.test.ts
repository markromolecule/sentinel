import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useRoomSearch } from './use-room-search';
import { useRoomsQuery } from './use-rooms-query';
import { useDebounce } from '../../use-debounce';

vi.mock('../../use-debounce', () => ({
    useDebounce: vi.fn((val) => val),
}));

vi.mock('./use-rooms-query', () => ({
    useRoomsQuery: vi.fn(),
}));

describe('useRoomSearch Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debounces and enables query when search query >= 2 characters', () => {
        vi.mocked(useRoomsQuery).mockReturnValue({
            data: [{ id: 'room-1', name: 'Lab A', room_number: '101' }],
            isLoading: false,
            isError: false,
        } as any);

        const result = useRoomSearch('la');

        expect(useDebounce).toHaveBeenCalledWith('la', 300);
        expect(useRoomsQuery).toHaveBeenCalledWith({
            search: 'la',
            enabled: true,
        });
        expect(result.rooms).toEqual([{ id: 'room-1', name: 'Lab A', room_number: '101' }]);
    });

    it('disables query when search query is less than 2 characters', () => {
        vi.mocked(useRoomsQuery).mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        } as any);

        const result = useRoomSearch('l');

        expect(useDebounce).toHaveBeenCalledWith('l', 300);
        expect(useRoomsQuery).toHaveBeenCalledWith({
            search: 'l',
            enabled: false,
        });
        expect(result.rooms).toEqual([]);
    });

    it('returns empty array when data is undefined', () => {
        vi.mocked(useRoomsQuery).mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        } as any);

        const result = useRoomSearch('la');

        expect(result.rooms).toEqual([]);
        expect(result.isLoading).toBe(true);
    });

    it('returns error state when query fails', () => {
        const mockError = new Error('Network error');
        vi.mocked(useRoomsQuery).mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error: mockError,
        } as any);

        const result = useRoomSearch('lab');

        expect(result.isError).toBe(true);
        expect(result.error).toBe(mockError);
    });

    it('returns empty array when data is a paginated response (not an array)', () => {
        vi.mocked(useRoomsQuery).mockReturnValue({
            data: { items: [], pagination: {} },
            isLoading: false,
            isError: false,
        } as any);

        const result = useRoomSearch('lab');

        // Non-array data should gracefully return []
        expect(result.rooms).toEqual([]);
    });
});
