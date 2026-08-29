'use client';

import { useMemo, useState } from 'react';
import {
    useDebounce,
    useExamLobbyWaitingListQuery,
    useLobbyRealtime,
    useOverrideReconnectLimitMutation,
    useUpdateExamLobbyAdmissionsMutation,
} from '@sentinel/hooks';
import { toast } from 'sonner';
import {
    filterLobbyAdmissions,
    getLobbyAdmissionGroups,
    type LobbyAdmissionStatusFilter,
} from '../_lib/lobby-admission-filters';

/**
 * useInstructorLobby manages instructor lobby admission state and controls.
 *
 * @param examId - Exam id whose lobby admissions should be loaded and updated.
 */
export function useInstructorLobby(examId: string) {
    const [updatingStudentIds, setUpdatingStudentIds] = useState<Set<string>>(() => new Set());
    const [overridingStudentId, setOverridingStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<LobbyAdmissionStatusFilter>('all');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const {
        data: lobbyAdmissions = [],
        refetch: refreshLobbyAdmissions,
        isLoading,
        isFetching,
    } = useExamLobbyWaitingListQuery(examId);


    // Subscribe to real-time lobby admission changes
    useLobbyRealtime({ examId });

    const updateAdmissionsMutation = useUpdateExamLobbyAdmissionsMutation();

    const filteredLobbyAdmissions = useMemo(
        () =>
            filterLobbyAdmissions(lobbyAdmissions, {
                query: debouncedSearchTerm,
                statusFilter,
            }),
        [debouncedSearchTerm, lobbyAdmissions, statusFilter],
    );

    const lobbyAdmissionGroups = useMemo(
        () => getLobbyAdmissionGroups(filteredLobbyAdmissions),
        [filteredLobbyAdmissions],
    );

    const overrideReconnectLimitMutation = useOverrideReconnectLimitMutation({
        onSuccess: async () => {
            toast.success('Reconnect override granted successfully.');
            await refreshLobbyAdmissions();
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const isUpdatingLobbyAdmissions = updatingStudentIds.size > 0;

    const handleUpdateLobbyAdmissions = async (
        studentIds: string[],
        status: 'APPROVED' | 'REJECTED',
    ) => {
        if (studentIds.length === 0) {
            return;
        }

        setUpdatingStudentIds((prev) => {
            const next = new Set(prev);
            studentIds.forEach((id) => next.add(id));
            return next;
        });

        try {
            const result = await updateAdmissionsMutation.mutateAsync({
                examId,
                studentIds,
                status,
            });

            toast.success(
                `${result.updatedCount} student${result.updatedCount === 1 ? '' : 's'} ${status === 'APPROVED' ? 'updated for entry' : 'returned to the lobby queue'}.`,
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to update lobby admissions.';
            toast.error(message);
        } finally {
            setUpdatingStudentIds((prev) => {
                const next = new Set(prev);
                studentIds.forEach((id) => next.delete(id));
                return next;
            });
        }
    };

    const handleOverrideReconnect = async (studentId: string) => {
        setOverridingStudentId(studentId);

        try {
            await overrideReconnectLimitMutation.mutateAsync({
                id: examId,
                studentId,
                reason: 'Instructor granted a one-time reconnect override from the exam lobby.',
            });
        } finally {
            setOverridingStudentId(null);
        }
    };

    return {
        lobbyAdmissions,
        filteredLobbyAdmissions,
        lobbyAdmissionGroups,
        searchTerm,
        setSearchTerm,
        debouncedSearchTerm,
        statusFilter,
        setStatusFilter,
        isUpdatingLobbyAdmissions,
        updatingStudentIds,
        overridingStudentId,
        refreshLobbyAdmissions,
        handleUpdateLobbyAdmissions,
        handleOverrideReconnect,
        isLoading,
        isFetching,
    };
}

