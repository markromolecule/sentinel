import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useExamIncidentsQuery,
    EXAM_INCIDENTS_QUERY_KEY,
    EXAM_INCIDENTS_REFETCH_INTERVAL_MS,
} from './use-exam-incidents-query';
import { useUpdateExamIncidentsMutation } from './use-update-exam-incidents-mutation';
import { getExamIncidents, reviewIncidents } from '@sentinel/services';

const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
    })),
    useInfiniteQuery: vi.fn((options: any) => {
        if (options.queryFn) {
            options.queryFn({ pageParam: 1 });
        }
        return {
            queryKey: options.queryKey,
            enabled: options.enabled,
            getNextPageParam: options.getNextPageParam,
            staleTime: options.staleTime,
            refetchInterval: options.refetchInterval,
            refetchIntervalInBackground: options.refetchIntervalInBackground,
        };
    }),
    useMutation: vi.fn((options: any) => {
        const mutateAsync = async (variables: any) => {
            try {
                if (options.mutationFn) {
                    await options.mutationFn(variables);
                }
                if (options.onSuccess) {
                    await options.onSuccess(undefined, variables, null);
                }
            } catch (error) {
                if (options.onError) {
                    options.onError(error, variables, null);
                }
                throw error;
            }
        };
        return { mutateAsync };
    }),
}));

vi.mock('@sentinel/services', () => ({
    getExamIncidents: vi.fn(),
    reviewIncidents: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('Exam Incidents Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useExamIncidentsQuery', () => {
        it('sets the correct query key and queries backend via getExamIncidents', () => {
            const examId = 'exam-uuid-123';
            const queryParams = { status: 'PENDING' as const, severity: 'HIGH' as const };

            const query = useExamIncidentsQuery(examId, queryParams) as any;

            expect(query.queryKey).toEqual(EXAM_INCIDENTS_QUERY_KEY(examId, queryParams));
            expect(getExamIncidents).toHaveBeenCalledWith({ mockClient: true }, examId, {
                ...queryParams,
                page: 1,
            });
            expect(query.enabled).toBe(true);
            expect(query.staleTime).toBe(4000);
            expect(query.refetchInterval).toBe(6000);
            expect(EXAM_INCIDENTS_REFETCH_INTERVAL_MS).toBe(6000);
            expect(query.refetchIntervalInBackground).toBe(false);
        });

        it('returns correct page parameter from getNextPageParam', () => {
            const examId = 'exam-uuid-123';
            const query = useExamIncidentsQuery(examId) as any;

            const hasMore = query.getNextPageParam({
                data: [],
                meta: { page: 1, limit: 10, totalItems: 25, totalPages: 3 },
            });
            expect(hasMore).toBe(2);

            const noMore = query.getNextPageParam({
                data: [],
                meta: { page: 3, limit: 10, totalItems: 25, totalPages: 3 },
            });
            expect(noMore).toBeUndefined();
        });
    });

    describe('useUpdateExamIncidentsMutation', () => {
        it('calls reviewIncidents and invalidates incidents and report cache on success', async () => {
            const examId = 'exam-uuid-123';
            const payload = {
                incidentIds: ['incident-1', 'incident-2'],
                status: 'confirmed' as const,
                reviewNotes: 'Verified cheating behavior',
            };

            const mutation = useUpdateExamIncidentsMutation(examId);
            await (mutation as any).mutateAsync(payload);

            expect(reviewIncidents).toHaveBeenCalledWith({ mockClient: true }, examId, payload);
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exams', examId, 'incidents'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exam-report', examId],
            });
        });
    });
});
