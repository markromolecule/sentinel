import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useEssayRubricQuery } from './use-essay-rubric-query';
import { useUpdateExamEssayRubricMutation } from './use-update-exam-essay-rubric-mutation';
import { useResetExamEssayRubricMutation } from './use-reset-exam-essay-rubric-mutation';
import {
    getEffectiveEssayRubric,
    updateExamEssayRubric,
    resetExamEssayRubric,
} from '@sentinel/services';

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
    getEffectiveEssayRubric: vi.fn(),
    updateExamEssayRubric: vi.fn(),
    resetExamEssayRubric: vi.fn(),
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

describe('exams essay rubric hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseApi.mockReturnValue({ mockClient: true });
        mockUseAuthenticatedQueryEnabled.mockReturnValue(true);
    });

    describe('useEssayRubricQuery', () => {
        it('queries correct endpoint and scopes cache key', () => {
            useEssayRubricQuery('exam-id-123');

            expect(mockUseQuery).toHaveBeenCalledWith(
                expect.objectContaining({
                    queryKey: ['exams', 'exam-id-123', 'essay-rubric'],
                }),
            );
        });
    });

    describe('useUpdateExamEssayRubricMutation', () => {
        it('calls updateExamEssayRubric service and invalidates related queries', async () => {
            const mutation = useUpdateExamEssayRubricMutation();
            const payload = { criteria: [] };

            await (mutation as any).mutateAsync({ examId: 'exam-id-123', payload });

            expect(updateExamEssayRubric).toHaveBeenCalledWith(
                { mockClient: true },
                {
                    examId: 'exam-id-123',
                    payload,
                },
            );

            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exams', 'exam-id-123', 'essay-rubric'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exams', 'exam-id-123'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exams'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['grading-attempt'],
            });
        });
    });

    describe('useResetExamEssayRubricMutation', () => {
        it('calls resetExamEssayRubric service and invalidates related queries', async () => {
            const mutation = useResetExamEssayRubricMutation();

            await (mutation as any).mutateAsync('exam-id-123');

            expect(resetExamEssayRubric).toHaveBeenCalledWith({ mockClient: true }, 'exam-id-123');

            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exams', 'exam-id-123', 'essay-rubric'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exams', 'exam-id-123'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['exams'],
            });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({
                queryKey: ['grading-attempt'],
            });
        });
    });
});
