import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstructorLobby } from './use-instructor-lobby';

const {
    mockUseApi,
    mockUseDebounce,
    mockGetExamLobbyWaitingList,
    mockUpdateExamLobbyAdmissions,
    mockUseOverrideReconnectLimitMutation,
    mockOverrideReconnectMutateAsync,
    mockToastSuccess,
    mockToastError,
} = vi.hoisted(() => ({
    mockUseApi: vi.fn(),
    mockUseDebounce: vi.fn((value: string) => value),
    mockGetExamLobbyWaitingList: vi.fn(),
    mockUpdateExamLobbyAdmissions: vi.fn(),
    mockUseOverrideReconnectLimitMutation: vi.fn(),
    mockOverrideReconnectMutateAsync: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockUseApi(),
    useDebounce: (value: string, delay: number) => mockUseDebounce(value, delay),
    useOverrideReconnectLimitMutation: (options: unknown) =>
        mockUseOverrideReconnectLimitMutation(options),
}));

vi.mock('@sentinel/services', () => ({
    getExamLobbyWaitingList: (...args: unknown[]) => mockGetExamLobbyWaitingList(...args),
    updateExamLobbyAdmissions: (...args: unknown[]) => mockUpdateExamLobbyAdmissions(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: mockToastSuccess,
        error: mockToastError,
    },
}));

describe('useInstructorLobby', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseApi.mockReturnValue({ api: true });
        mockUseDebounce.mockImplementation((value: string) => value);
        mockGetExamLobbyWaitingList.mockResolvedValue([
            {
                admissionId: 'admission-1',
                studentId: 'student-1',
                studentName: 'Pat Student',
                studentNumber: '2026-001',
                status: 'WAITING',
                checkedInAt: null,
                decidedAt: null,
                hasActiveAttempt: false,
                attemptStatus: null,
                reconnectCount: 1,
                maxReconnectAttempts: 3,
            },
            {
                admissionId: 'admission-2',
                studentId: 'student-2',
                studentName: 'Alex Learner',
                studentNumber: '2026-002',
                status: 'APPROVED',
                checkedInAt: null,
                decidedAt: null,
                hasActiveAttempt: false,
                attemptStatus: null,
                reconnectCount: 0,
                maxReconnectAttempts: 3,
            },
        ]);
        mockUseOverrideReconnectLimitMutation.mockImplementation((options) => ({
            mutateAsync: async (payload: unknown) => {
                await mockOverrideReconnectMutateAsync(payload);
                await (options as { onSuccess?: () => Promise<void> | void })?.onSuccess?.();
            },
        }));
        mockOverrideReconnectMutateAsync.mockResolvedValue(undefined);
    });

    it('debounces the raw lobby search term', async () => {
        const { result } = renderHook(() => useInstructorLobby('exam-1'));

        await waitFor(() => {
            expect(result.current.lobbyAdmissions).toHaveLength(2);
        });

        act(() => {
            result.current.setSearchTerm('alex');
        });

        expect(mockUseDebounce).toHaveBeenLastCalledWith('alex', 500);
    });

    it('returns filtered lobby admission groups', async () => {
        const { result } = renderHook(() => useInstructorLobby('exam-1'));

        await waitFor(() => {
            expect(result.current.lobbyAdmissions).toHaveLength(2);
        });

        act(() => {
            result.current.setStatusFilter('approved');
        });

        expect(result.current.lobbyAdmissionGroups.waitingStudents).toHaveLength(0);
        expect(result.current.lobbyAdmissionGroups.approvedStudents).toHaveLength(1);
        expect(result.current.lobbyAdmissionGroups.approvedStudents[0]?.studentId).toBe(
            'student-2',
        );
    });

    it('optimistically updates admissions before reconciling with the server list', async () => {
        let resolveMutation: ((value: { updatedCount: number }) => void) | undefined;

        mockUpdateExamLobbyAdmissions.mockImplementation(
            () =>
                new Promise<{ updatedCount: number }>((resolve) => {
                    resolveMutation = resolve;
                }),
        );

        const { result } = renderHook(() => useInstructorLobby('exam-1'));

        await waitFor(() => {
            expect(result.current.lobbyAdmissions).toHaveLength(2);
        });

        let pendingUpdate: Promise<void> | undefined;

        act(() => {
            pendingUpdate = result.current.handleUpdateLobbyAdmissions(['student-1'], 'APPROVED');
        });

        await waitFor(() => {
            expect(result.current.lobbyAdmissions[0]?.status).toBe('APPROVED');
        });

        resolveMutation?.({ updatedCount: 1 });
        await act(async () => {
            await pendingUpdate;
        });

        expect(mockToastSuccess).toHaveBeenCalled();
        expect(mockGetExamLobbyWaitingList).toHaveBeenCalledTimes(2);
    });

    it('submits reconnect overrides with the lobby-specific reason and tracks pending state', async () => {
        let resolveMutation: (() => void) | undefined;
        mockOverrideReconnectMutateAsync.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveMutation = resolve;
                }),
        );

        const { result } = renderHook(() => useInstructorLobby('exam-1'));

        await waitFor(() => {
            expect(result.current.lobbyAdmissions).toHaveLength(2);
        });

        let pendingPromise: Promise<void> | undefined;
        act(() => {
            pendingPromise = result.current.handleOverrideReconnect('student-1');
        });

        expect(result.current.overridingStudentId).toBe('student-1');
        expect(mockOverrideReconnectMutateAsync).toHaveBeenCalledWith({
            id: 'exam-1',
            studentId: 'student-1',
            reason: 'Instructor granted a one-time reconnect override from the exam lobby.',
        });

        resolveMutation?.();
        await act(async () => {
            await pendingPromise;
        });

        expect(result.current.overridingStudentId).toBeNull();
        expect(mockGetExamLobbyWaitingList).toHaveBeenCalledTimes(2);
        expect(mockToastSuccess).toHaveBeenCalledWith(
            'Reconnect override granted successfully.',
        );
    });
});
