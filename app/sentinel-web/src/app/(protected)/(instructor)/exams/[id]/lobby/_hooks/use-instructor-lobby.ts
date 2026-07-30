'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi, useDebounce, useOverrideReconnectLimitMutation } from '@sentinel/hooks';
import {
    getExamLobbyWaitingList,
    updateExamLobbyAdmissions,
    type ExamLobbyWaitingStudent,
} from '@sentinel/services';
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
    const apiClient = useApi();
    const [isUpdatingLobbyAdmissions, setIsUpdatingLobbyAdmissions] = useState(false);
    const [overridingStudentId, setOverridingStudentId] = useState<string | null>(null);
    const [lobbyAdmissions, setLobbyAdmissions] = useState<ExamLobbyWaitingStudent[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<LobbyAdmissionStatusFilter>('all');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

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

    const refreshLobbyAdmissions = useCallback(async () => {
        try {
            const admissions = await getExamLobbyWaitingList(apiClient, examId);
            setLobbyAdmissions(admissions);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to load lobby admissions.';
            toast.error(message);
        }
    }, [apiClient, examId]);
    const overrideReconnectLimitMutation = useOverrideReconnectLimitMutation({
        onSuccess: async () => {
            toast.success('Reconnect override granted successfully.');
            await refreshLobbyAdmissions();
        },
        onError: (error: Error) => toast.error(error.message),
    });

    useEffect(() => {
        void refreshLobbyAdmissions();

        const intervalId = window.setInterval(() => {
            void refreshLobbyAdmissions();
        }, 5000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [refreshLobbyAdmissions]);

    const handleUpdateLobbyAdmissions = async (
        studentIds: string[],
        status: 'APPROVED' | 'REJECTED',
    ) => {
        if (studentIds.length === 0) {
            return;
        }

        setIsUpdatingLobbyAdmissions(true);
        const previousAdmissions = lobbyAdmissions;
        setLobbyAdmissions((currentAdmissions) =>
            currentAdmissions.map((student) =>
                studentIds.includes(student.studentId)
                    ? {
                          ...student,
                          status,
                          decidedAt: new Date().toISOString(),
                      }
                    : student,
            ),
        );

        try {
            const result = await updateExamLobbyAdmissions(apiClient, {
                examId,
                studentIds,
                status,
            });

            toast.success(
                `${result.updatedCount} student${result.updatedCount === 1 ? '' : 's'} ${status === 'APPROVED' ? 'updated for entry' : 'returned to the lobby queue'}.`,
            );
            await refreshLobbyAdmissions();
        } catch (error) {
            setLobbyAdmissions(previousAdmissions);
            const message =
                error instanceof Error ? error.message : 'Failed to update lobby admissions.';
            toast.error(message);
        } finally {
            setIsUpdatingLobbyAdmissions(false);
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
        overridingStudentId,
        refreshLobbyAdmissions,
        handleUpdateLobbyAdmissions,
        handleOverrideReconnect,
    };
}
