import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { authorizeStudentReentry } from '@sentinel/services';
import { useAuthorizeStudentReentryMutation } from './use-authorize-student-reentry-mutation';

const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries,
    }),
    useMutation: ({ mutationFn, onSuccess, onError }: any) => ({
        mutateAsync: async (payload: any) => {
            try {
                const data = await mutationFn(payload);
                await onSuccess?.(data, payload);
                return data;
            } catch (err) {
                onError?.(err, payload);
                throw err;
            }
        },
    }),
}));

vi.mock('../../api-provider', () => ({
    useApi: () => vi.fn(),
}));

vi.mock('@sentinel/services', () => ({
    authorizeStudentReentry: vi.fn(),
}));

describe('useAuthorizeStudentReentryMutation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls authorizeStudentReentry and invalidates monitoring and lobby queries on success', async () => {
        const mockResult = {
            attemptId: 'attempt-locked',
            status: 'APPROVED',
            reconnectAttemptCount: 0,
            reopenedUntil: '2026-09-03T12:00:00.000Z',
        };

        vi.mocked(authorizeStudentReentry).mockResolvedValueOnce(mockResult);

        const onSuccess = vi.fn();
        const { result } = renderHook(() => useAuthorizeStudentReentryMutation({ onSuccess }));

        const payload = {
            id: 'exam-1',
            studentId: 'student-1',
            reason: 'Cleared re-entry after connection drop',
        };

        await act(async () => {
            await result.current.mutateAsync(payload);
        });

        expect(authorizeStudentReentry).toHaveBeenCalledWith(expect.any(Function), payload);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.monitoring('exam-1'),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList('exam-1'),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyCount('exam-1'),
        });
        expect(onSuccess).toHaveBeenCalledWith(mockResult, payload, undefined);
    });
});
