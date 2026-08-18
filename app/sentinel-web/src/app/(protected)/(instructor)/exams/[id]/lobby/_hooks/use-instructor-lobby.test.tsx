import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstructorLobby } from './use-instructor-lobby';

const {
    mockUseDebounce,
    mockUseExamLobbyWaitingListQuery,
    mockUseUpdateExamLobbyAdmissionsMutation,
    mockUpdateMutateAsync,
    mockUseLobbyRealtime,
    mockUseOverrideReconnectLimitMutation,
    mockOverrideReconnectMutateAsync,
    mockRefetchWaitingList,
    mockToastSuccess,
    mockToastError,
} = vi.hoisted(() => ({
    mockUseDebounce: vi.fn((value: string) => value),
    mockUseExamLobbyWaitingListQuery: vi.fn(),
    mockUseUpdateExamLobbyAdmissionsMutation: vi.fn(),
    mockUpdateMutateAsync: vi.fn(),
    mockUseLobbyRealtime: vi.fn(),
    mockUseOverrideReconnectLimitMutation: vi.fn(),
    mockOverrideReconnectMutateAsync: vi.fn(),
    mockRefetchWaitingList: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useDebounce: (value: string, delay: number) => mockUseDebounce(value, delay),
    useExamLobbyWaitingListQuery: (examId: string) => mockUseExamLobbyWaitingListQuery(examId),
    useLobbyRealtime: (args: unknown) => mockUseLobbyRealtime(args),
    useUpdateExamLobbyAdmissionsMutation: () => mockUseUpdateExamLobbyAdmissionsMutation(),
    useOverrideReconnectLimitMutation: (options: unknown) =>
        mockUseOverrideReconnectLimitMutation(options),
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
        mockUseDebounce.mockImplementation((value: string) => value);
        mockUseExamLobbyWaitingListQuery.mockReturnValue({
            data: [
                {
                    admissionId: 'admission-1',
                    studentId: 'student-1',
                    studentName: 'Pat Student',
                    studentNumber: '2026-001',
                    avatarUrl: 'https://example.com/pat.jpg',
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
                    avatarUrl: null,
                    status: 'APPROVED',
                    checkedInAt: null,
                    decidedAt: null,
                    hasActiveAttempt: false,
                    attemptStatus: null,
                    reconnectCount: 0,
                    maxReconnectAttempts: 3,
                },
            ],
            refetch: mockRefetchWaitingList,
            isLoading: false,
        });
        mockUseUpdateExamLobbyAdmissionsMutation.mockReturnValue({
            mutateAsync: mockUpdateMutateAsync,
        });
        mockUseOverrideReconnectLimitMutation.mockImplementation((options) => ({
            mutateAsync: async (payload: unknown) => {
                await mockOverrideReconnectMutateAsync(payload);
                await (options as { onSuccess?: () => Promise<void> | void })?.onSuccess?.();
            },
        }));
        mockOverrideReconnectMutateAsync.mockResolvedValue(undefined);
        mockUpdateMutateAsync.mockResolvedValue({ updatedCount: 1 });
    });

    it('subscribes to realtime events and debounces search input', async () => {
        const { result } = renderHook(() => useInstructorLobby('exam-1'));

        expect(mockUseLobbyRealtime).toHaveBeenCalledWith({ examId: 'exam-1' });

        act(() => {
            result.current.setSearchTerm('alex');
        });

        expect(mockUseDebounce).toHaveBeenLastCalledWith('alex', 500);
    });

    it('returns filtered lobby admission groups', async () => {
        const { result } = renderHook(() => useInstructorLobby('exam-1'));

        act(() => {
            result.current.setStatusFilter('approved');
        });

        expect(result.current.lobbyAdmissionGroups.waitingStudents).toHaveLength(0);
        expect(result.current.lobbyAdmissionGroups.approvedStudents).toHaveLength(1);
        expect(result.current.lobbyAdmissionGroups.approvedStudents[0]?.studentId).toBe(
            'student-2',
        );
    });

    it('tracks updatingStudentIds while mutations are in-flight and shows success toast', async () => {
        let resolveMutation: ((value: { updatedCount: number }) => void) | undefined;
        mockUpdateMutateAsync.mockImplementation(
            () =>
                new Promise<{ updatedCount: number }>((resolve) => {
                    resolveMutation = resolve;
                }),
        );

        const { result } = renderHook(() => useInstructorLobby('exam-1'));

        let pendingUpdate: Promise<void> | undefined;

        act(() => {
            pendingUpdate = result.current.handleUpdateLobbyAdmissions(['student-1'], 'APPROVED');
        });

        expect(result.current.updatingStudentIds.has('student-1')).toBe(true);
        expect(result.current.isUpdatingLobbyAdmissions).toBe(true);

        resolveMutation?.({ updatedCount: 1 });
        await act(async () => {
            await pendingUpdate;
        });

        expect(result.current.updatingStudentIds.has('student-1')).toBe(false);
        expect(result.current.isUpdatingLobbyAdmissions).toBe(false);
        expect(mockToastSuccess).toHaveBeenCalledWith('1 student updated for entry.');
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
        expect(mockRefetchWaitingList).toHaveBeenCalledTimes(1);
        expect(mockToastSuccess).toHaveBeenCalledWith('Reconnect override granted successfully.');
    });
});
