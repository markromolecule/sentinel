import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExamLobbyCount } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useExamLobbyCountQuery } from './use-exam-lobby-count-query';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn((options: any) => {
        if (options.queryFn) {
            options.queryFn();
        }

        return {
            queryKey: options.queryKey,
            enabled: options.enabled,
            staleTime: options.staleTime,
            refetchOnMount: options.refetchOnMount,
            refetchInterval: options.refetchInterval,
            refetchIntervalInBackground: options.refetchIntervalInBackground,
        };
    }),
}));

vi.mock('@sentinel/services', () => ({
    getExamLobbyCount: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('useExamLobbyCountQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('queries lobby count with 30s staleTime and disabled background interval polling', () => {
        const query = useExamLobbyCountQuery('exam-1') as any;

        expect(getExamLobbyCount).toHaveBeenCalledWith({ mockClient: true }, 'exam-1');
        expect(query.queryKey).toEqual(EXAM_QUERY_KEYS.lobbyCount('exam-1'));
        expect(query.enabled).toBe(true);
        expect(query.staleTime).toBe(30_000);
        expect(query.refetchOnMount).toBe(true);
        expect(query.refetchInterval).toBe(false);
        expect(query.refetchIntervalInBackground).toBe(false);
    });
});
