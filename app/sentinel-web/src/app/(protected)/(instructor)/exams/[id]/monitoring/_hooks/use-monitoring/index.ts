'use client';

import { useCallback, useMemo, useState } from 'react';
import {
    useExamMonitoringOverviewQuery,
    useMonitoringRealtime,
    type StudentProgressPayload,
    type StudentSubmittedPayload,
} from '@sentinel/hooks';
import { useFilters } from './use-filters';
import { useIncidentToast } from './use-incident-toast';
import { useRuntimeAccess } from './use-runtime-access';
import { useLifecycle } from './use-lifecycle';
import { MONITORING_PAGE_SIZE } from '../../_constants';

/**
 * useMonitoring manages instructor live-monitoring filters, actions, and runtime access state.
 * It acts as an orchestrator hook composing sub-hooks for filters, notifications, and operations.
 *
 * @param examId - Exam ID whose live monitoring overview should be loaded.
 */
export function useMonitoring(examId: string) {
    const {
        data: monitoring,
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useExamMonitoringOverviewQuery(examId);

    // In-memory live progress and live submission overrides
    const [liveProgressMap, setLiveProgressMap] = useState<Record<string, number>>({});
    const [liveSubmittedIds, setLiveSubmittedIds] = useState<Set<string>>(new Set());

    // Ultra-low latency (<50ms) real-time broadcast subscription
    useMonitoringRealtime({
        examId,
        onProgressUpdate: useCallback((payload: StudentProgressPayload) => {
            setLiveProgressMap((prev) => ({
                ...prev,
                [payload.studentId]: payload.progress,
            }));
        }, []),
        onStudentSubmitted: useCallback((payload: StudentSubmittedPayload) => {
            setLiveSubmittedIds((prev) => {
                const next = new Set(prev);
                next.add(payload.studentId);
                return next;
            });
        }, []),
    });

    // Merged students with live progress & immediate submission status
    const mergedStudents = useMemo(() => {
        if (!monitoring?.students) return undefined;

        return monitoring.students.map((student) => {
            const isLiveSubmitted =
                liveSubmittedIds.has(student.id) ||
                Boolean(student.studentRecordId && liveSubmittedIds.has(student.studentRecordId));

            const hasLiveProgress =
                liveProgressMap[student.id] !== undefined ||
                (student.studentRecordId && liveProgressMap[student.studentRecordId] !== undefined);

            const liveProgress =
                liveProgressMap[student.id] ??
                (student.studentRecordId ? liveProgressMap[student.studentRecordId] : undefined);

            const nextStatus = isLiveSubmitted
                ? student.status === 'flagged'
                    ? 'flagged'
                    : 'submitted'
                : student.status;

            const nextProgress = isLiveSubmitted
                ? 100
                : hasLiveProgress && liveProgress !== undefined
                  ? liveProgress
                  : student.progress;

            return {
                ...student,
                status: nextStatus,
                lifecycleState: isLiveSubmitted ? ('SUBMITTED' as const) : student.lifecycleState,
                progress: nextProgress,
            };
        });
    }, [monitoring?.students, liveProgressMap, liveSubmittedIds]);

    // Merged stats reflecting immediate live submissions without waiting for query refetch
    const mergedStats = useMemo(() => {
        if (!monitoring?.stats) return undefined;

        let newlySubmittedCount = 0;
        if (monitoring.students) {
            monitoring.students.forEach((student) => {
                const wasAlreadySubmitted =
                    student.status === 'submitted' ||
                    student.lifecycleState === 'SUBMITTED' ||
                    Boolean(student.completedAt);

                const isLiveSubmitted =
                    liveSubmittedIds.has(student.id) ||
                    Boolean(
                        student.studentRecordId && liveSubmittedIds.has(student.studentRecordId),
                    );

                if (isLiveSubmitted && !wasAlreadySubmitted) {
                    newlySubmittedCount++;
                }
            });
        }

        return {
            ...monitoring.stats,
            submitted: (monitoring.stats.submitted ?? 0) + newlySubmittedCount,
        };
    }, [monitoring?.stats, monitoring?.students, liveSubmittedIds]);

    const mergedMonitoring = useMemo(() => {
        if (!monitoring) return undefined;
        return {
            ...monitoring,
            stats: mergedStats ?? monitoring.stats,
            students: mergedStudents ?? monitoring.students,
        };
    }, [monitoring, mergedStats, mergedStudents]);

    // Filter, search and page states
    const filters = useFilters(mergedMonitoring?.students);

    // Incident toast notifications
    useIncidentToast(examId, mergedMonitoring?.students);

    // Global exam runtime access state and actions
    const runtimeAccess = useRuntimeAccess({
        examId,
        refetch,
    });

    // Student session attempt lifecycle actions and reconnect limit overrides
    const lifecycle = useLifecycle({
        examId,
        refetch,
    });

    return {
        // Data
        monitoring: mergedMonitoring,
        isLoading,
        isFetching,
        isError,
        filteredStudents: filters.filteredStudents,

        // State
        searchQuery: filters.searchQuery,
        filterStatus: filters.filterStatus,
        page: filters.page,
        pageSize: MONITORING_PAGE_SIZE,
        isUpdatingAccess: runtimeAccess.isUpdatingAccess,
        pendingAction: runtimeAccess.pendingAction,
        isReopenDialogOpen: runtimeAccess.isReopenDialogOpen,
        reopenMinutes: runtimeAccess.reopenMinutes,
        overridingStudentId: lifecycle.overridingStudentId,
        activeLifecycleActionId: lifecycle.activeLifecycleActionId,

        // State Setters
        setPendingAction: runtimeAccess.setPendingAction,
        setIsReopenDialogOpen: runtimeAccess.setIsReopenDialogOpen,
        setReopenMinutes: runtimeAccess.setReopenMinutes,
        setPage: filters.setPage,

        // Handlers
        handleSearchChange: filters.handleSearchChange,
        handleFilterChange: filters.handleFilterChange,
        handleConfirmAction: runtimeAccess.handleConfirmAction,
        handleSubmitReopen: runtimeAccess.handleSubmitReopen,
        handleOverrideReconnect: lifecycle.handleOverrideReconnect,
        handleAuthorizeReentry: lifecycle.handleAuthorizeReentry,
        handleLifecycleAction: lifecycle.handleLifecycleAction,
        refetch,
    };
}
export type UseMonitoringReturn = ReturnType<typeof useMonitoring>;
