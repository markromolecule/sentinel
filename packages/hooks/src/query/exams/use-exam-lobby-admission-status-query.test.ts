import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExamLobbyAdmissionStatus } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useExamLobbyAdmissionStatusQuery } from './use-exam-lobby-admission-status-query';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn((options: any) => {
        if (options.queryFn) {
            options.queryFn();
        }

        return {
            queryKey: options.queryKey,
            enabled: options.enabled,
            staleTime: options.staleTime,
            refetchInterval: options.refetchInterval,
            refetchIntervalInBackground: options.refetchIntervalInBackground,
            refetchOnWindowFocus: options.refetchOnWindowFocus,
        };
    }),
}));

vi.mock('@sentinel/services', () => ({
    getExamLobbyAdmissionStatus: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('useExamLobbyAdmissionStatusQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('queries admission status relying on realtime events without continuous interval polling', () => {
        const query = useExamLobbyAdmissionStatusQuery('exam-1') as any;

        expect(getExamLobbyAdmissionStatus).toHaveBeenCalledWith({ mockClient: true }, 'exam-1');
        expect(query.queryKey).toEqual(EXAM_QUERY_KEYS.lobbyAdmissionStatus('exam-1'));
        expect(query.enabled).toBe(true);
        expect(query.staleTime).toBe(30_000);
        expect(query.refetchInterval).toBe(false);
        expect(query.refetchIntervalInBackground).toBe(false);
        expect(query.refetchOnWindowFocus).toBe(true);
    });
});
