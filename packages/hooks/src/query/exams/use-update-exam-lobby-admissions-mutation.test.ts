import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateExamLobbyAdmissionsMutation } from './use-update-exam-lobby-admissions-mutation';
import { updateExamLobbyAdmissions } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';

const mockInvalidateQueries = vi.fn();
const mockCancelQueries = vi.fn();
const mockGetQueryData = vi.fn();
const mockSetQueryData = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
        cancelQueries: mockCancelQueries,
        getQueryData: mockGetQueryData,
        setQueryData: mockSetQueryData,
    })),
    useMutation: vi.fn((options: any) => {
        const mutateAsync = async (variables: any) => {
            let context: any;
            try {
                if (options.onMutate) {
                    context = await options.onMutate(variables);
                }
                let result = { updatedCount: 1 };
                if (options.mutationFn) {
                    result = await options.mutationFn(variables);
                }
                if (options.onSuccess) {
                    await options.onSuccess(result, variables, context);
                }
                return result;
            } catch (error) {
                if (options.onError) {
                    options.onError(error, variables, context);
                }
                throw error;
            } finally {
                if (options.onSettled) {
                    await options.onSettled(undefined, undefined, variables, context);
                }
            }
        };

        return { mutateAsync };
    }),
}));

vi.mock('@sentinel/services', () => ({
    updateExamLobbyAdmissions: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

describe('useUpdateExamLobbyAdmissionsMutation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('optimistically updates cache and invalidates query keys on settle', async () => {
        const payload = {
            examId: 'exam-1',
            studentIds: ['student-1'],
            status: 'APPROVED' as const,
        };

        const existingList = [
            { admissionId: 'adm-1', studentId: 'student-1', status: 'WAITING' as const },
            { admissionId: 'adm-2', studentId: 'student-2', status: 'WAITING' as const },
        ];
        mockGetQueryData.mockReturnValue(existingList);
        vi.mocked(updateExamLobbyAdmissions).mockResolvedValue({ updatedCount: 1 });

        const mutation = useUpdateExamLobbyAdmissionsMutation();
        await (mutation as any).mutateAsync(payload);

        expect(mockCancelQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList('exam-1'),
        });
        expect(mockSetQueryData).toHaveBeenCalledWith(
            EXAM_QUERY_KEYS.lobbyWaitingList('exam-1'),
            expect.any(Function),
        );
        expect(updateExamLobbyAdmissions).toHaveBeenCalledWith({ mockClient: true }, payload);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList('exam-1'),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyCount('exam-1'),
        });
    });
});
