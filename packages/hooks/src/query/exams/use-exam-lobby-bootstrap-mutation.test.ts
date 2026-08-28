import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { bootstrapExamLobby } from '@sentinel/services';
import { useExamLobbyBootstrapMutation } from './use-exam-lobby-bootstrap-mutation';

const mockSetQueryData = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        setQueryData: mockSetQueryData,
    }),
    useMutation: ({ mutationFn, onSuccess }: any) => ({
        mutateAsync: async (examId: string) => {
            const data = await mutationFn(examId);
            onSuccess?.(data, examId);
            return data;
        },
    }),
}));

vi.mock('../../api-provider', () => ({
    useApi: () => vi.fn(),
}));

vi.mock('@sentinel/services', () => ({
    bootstrapExamLobby: vi.fn(),
}));

describe('useExamLobbyBootstrapMutation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('executes bootstrap API call and seeds query cache for exam, configuration, admission, and count', async () => {
        const mockResult = {
            exam: { id: 'exam-1', title: 'Calculus 101' },
            configuration: { id: 'cfg-1', cameraRequired: true },
            admission: {
                status: 'APPROVED' as const,
                checkedInAt: '2026-08-28T10:00:00Z',
                decidedAt: '2026-08-28T10:05:00Z',
            },
            waitingCount: 12,
            runtimeAccess: { state: 'lobby_approved' },
        };

        vi.mocked(bootstrapExamLobby).mockResolvedValueOnce(mockResult as any);

        const onSuccess = vi.fn();
        const { result } = renderHook(() => useExamLobbyBootstrapMutation({ onSuccess }));

        await act(async () => {
            await result.current.mutateAsync('exam-1');
        });

        expect(bootstrapExamLobby).toHaveBeenCalledWith(expect.any(Function), 'exam-1');
        expect(mockSetQueryData).toHaveBeenCalledWith(
            EXAM_QUERY_KEYS.details('exam-1'),
            mockResult.exam,
        );
        expect(mockSetQueryData).toHaveBeenCalledWith(
            EXAM_QUERY_KEYS.configuration('exam-1'),
            mockResult.configuration,
        );
        expect(mockSetQueryData).toHaveBeenCalledWith(
            EXAM_QUERY_KEYS.lobbyAdmissionStatus('exam-1'),
            {
                status: 'APPROVED',
                checkedInAt: '2026-08-28T10:00:00Z',
                decidedAt: '2026-08-28T10:05:00Z',
            },
        );
        expect(mockSetQueryData).toHaveBeenCalledWith(
            EXAM_QUERY_KEYS.lobbyCount('exam-1'),
            { count: 12 },
        );
        expect(onSuccess).toHaveBeenCalledWith(mockResult, 'exam-1', undefined);
    });
});
