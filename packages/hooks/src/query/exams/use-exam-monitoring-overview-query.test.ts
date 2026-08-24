import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExamMonitoringOverview } from '@sentinel/services';
import {
    EXAM_MONITORING_OVERVIEW_REFETCH_INTERVAL_MS,
    useExamMonitoringOverviewQuery,
} from './use-exam-monitoring-overview-query';

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
        };
    }),
}));

vi.mock('@sentinel/services', () => ({
    getExamMonitoringOverview: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('useExamMonitoringOverviewQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('polls the monitoring overview every 6 seconds with background polling disabled', () => {
        const query = useExamMonitoringOverviewQuery('exam-1') as any;

        expect(getExamMonitoringOverview).toHaveBeenCalledWith({ mockClient: true }, 'exam-1');
        expect(query.enabled).toBe(true);
        expect(query.staleTime).toBe(4000);
        expect(query.refetchInterval).toBe(6000);
        expect(EXAM_MONITORING_OVERVIEW_REFETCH_INTERVAL_MS).toBe(6000);
        expect(query.refetchIntervalInBackground).toBe(false);
    });
});
