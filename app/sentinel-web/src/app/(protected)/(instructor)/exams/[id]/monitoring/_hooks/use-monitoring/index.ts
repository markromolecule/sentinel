'use client';

import { useExamMonitoringOverviewQuery } from '@sentinel/hooks';
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

    // Filter, search and page states
    const filters = useFilters(monitoring?.students);

    // Incident toast notifications
    useIncidentToast(examId, monitoring?.students);

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
        monitoring,
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
