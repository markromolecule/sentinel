import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExamLobbyWaitingList } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useExamLobbyWaitingListQuery } from './use-exam-lobby-waiting-list-query';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn((options: any) => {
        if (options.queryFn) {
            options.queryFn();
        }

        return {
            queryKey: options.queryKey,
            enabled: options.enabled,
            staleTime: options.staleTime,
            refetchOnWindowFocus: options.refetchOnWindowFocus,
        };
    }),
}));

vi.mock('@sentinel/services', () => ({
    getExamLobbyWaitingList: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('useExamLobbyWaitingListQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('queries waiting list with exam-scoped key and window focus refetch', () => {
        const query = useExamLobbyWaitingListQuery('exam-1') as any;

        expect(getExamLobbyWaitingList).toHaveBeenCalledWith({ mockClient: true }, 'exam-1');
        expect(query.queryKey).toEqual(EXAM_QUERY_KEYS.lobbyWaitingList('exam-1'));
        expect(query.enabled).toBe(true);
        expect(query.staleTime).toBe(5000);
        expect(query.refetchOnWindowFocus).toBe(true);
    });
});
