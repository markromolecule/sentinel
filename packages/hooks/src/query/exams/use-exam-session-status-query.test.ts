import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExamSessionStatus } from '@sentinel/services';
import {
    EXAM_SESSION_STATUS_REFETCH_INTERVAL_MS,
    useExamSessionStatusQuery,
} from './use-exam-session-status-query';

const mockUseQuery = vi.fn((options: any) => options);

vi.mock('@tanstack/react-query', () => ({
    useQuery: (options: any) => mockUseQuery(options),
}));

vi.mock('@sentinel/services', () => ({
    getExamSessionStatus: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('useExamSessionStatusQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('enables two-second background polling only when a session is active', async () => {
        const query = useExamSessionStatusQuery('session-1', true) as any;

        expect(query).toMatchObject({
            queryKey: ['exams', 'session-status', 'session-1'],
            enabled: true,
            refetchInterval: EXAM_SESSION_STATUS_REFETCH_INTERVAL_MS,
            refetchIntervalInBackground: true,
        });

        await query.queryFn();

        expect(getExamSessionStatus).toHaveBeenCalledWith({ mockClient: true }, 'session-1');
    });

    it.each([
        [null, true],
        ['session-1', false],
    ])('disables polling for sessionId=%s active=%s', (sessionId, isAttemptActive) => {
        const query = useExamSessionStatusQuery(sessionId, isAttemptActive) as any;

        expect(query.enabled).toBe(false);
        expect(query.refetchInterval).toBe(2000);
        expect(query.refetchIntervalInBackground).toBe(true);
    });
});
