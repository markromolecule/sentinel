import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAccessControlEssayRubricQuery } from './use-access-control-essay-rubric-query';
import { useAccessControlEssayRubricMutation } from './use-access-control-essay-rubric-mutation';
import { getBaselineEssayRubric, updateBaselineEssayRubric } from '@sentinel/services';

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockUseApi = vi.fn();
const mockUseAuthenticatedQueryEnabled = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
    })),
    useQuery: (...args: any[]) => mockUseQuery(...args),
    useMutation: (options: any) => {
        mockUseMutation(options);
        const mutateAsync = async (variables: any) => {
            try {
                let result = undefined;
                if (options.mutationFn) {
                    result = await options.mutationFn(variables);
                }
                if (options.onSuccess) {
                    await options.onSuccess(result, variables, null);
                }
                return result;
            } catch (error) {
                if (options.onError) {
                    options.onError(error, variables, null);
                }
                throw error;
            }
        };
        return { mutateAsync };
    },
}));

vi.mock('@sentinel/services', () => ({
    getBaselineEssayRubric: vi.fn(),
    updateBaselineEssayRubric: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: () => mockUseApi(),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: () => mockUseAuthenticatedQueryEnabled(),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('access-control baseline essay rubric hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseApi.mockReturnValue({ mockClient: true });
        mockUseAuthenticatedQueryEnabled.mockReturnValue(true);
    });

    describe('useAccessControlEssayRubricQuery', () => {
        it('queries correct endpoint and scopes cache key', () => {
            useAccessControlEssayRubricQuery();

            expect(mockUseQuery).toHaveBeenCalledWith(
                expect.objectContaining({
                    queryKey: ['access-control', 'baseline-essay-rubric'],
                }),
            );
        });
    });

    describe('useAccessControlEssayRubricMutation', () => {
        it('calls updateBaselineEssayRubric service and invalidates related queries', async () => {
            const mutation = useAccessControlEssayRubricMutation();
            const payload = { criteria: [] };

            await (mutation as any).mutateAsync(payload);

            expect(updateBaselineEssayRubric).toHaveBeenCalledWith({ mockClient: true }, payload);

            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['access-control', 'baseline-essay-rubric'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['access-control', 'overview'],
            });
        });
    });
});
