import { useMemo } from 'react';
import { useApi, useExamReportQuery } from '@sentinel/hooks';
import { getColumns } from '../../_components/columns';
import type { UseExamReportOptions, UseExamReportResult } from './_types';
import { useExamReportSection } from './use-exam-report-section';
import { useExamReportFilter } from './use-exam-report-filter';
import { useExamFinalization } from './use-exam-finalization';
import { useActionQueueRemediation } from './use-action-queue-remediation';

export * from './_types';
export * from './remediation-lifecycle';
export * from './use-exam-report-section';
export * from './use-exam-report-filter';
export * from './use-exam-finalization';
export * from './use-action-queue-remediation';

/**
 * Custom hook to manage the detailed exam report page state, fetching, and actions.
 * Encapsulates search inputs, tab navigation, override grants, and attempt finalizations.
 *
 * @param options - Configuration options containing the target exam ID.
 * @returns The page state, derived data, and event handler actions.
 */
export function useExamReport({ examId }: UseExamReportOptions): UseExamReportResult {
    const apiClient = useApi();
    const { activeSection, setActiveSection } = useExamReportSection(examId);
    const {
        searchValue,
        setSearchValue,
        sectionFilter,
        setSectionFilter,
        studentPage,
        setStudentPage,
        pageSize,
        reportQuery,
    } = useExamReportFilter();

    const {
        data: report,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useExamReportQuery(examId, reportQuery);

    const { isFinalizingAll, handleFinalizeAll } = useExamFinalization({
        apiClient,
        examId,
        refetch,
    });

    const {
        activeQueue,
        setActiveQueue,
        actionPages,
        setActionPages,
        activeActionId,
        handleGrantOverride,
    } = useActionQueueRemediation({
        apiClient,
        examId,
        refetch,
    });

    const sectionOptions = useMemo(
        () => (report?.sections ?? []).map((section) => [section.id, section.name] as const),
        [report?.sections],
    );

    const actionQueues = useMemo(
        () =>
            report
                ? {
                    review: report.actionItems.review,
                    makeup: report.actionItems.makeup,
                    retake: report.actionItems.retake,
                }
                : {
                    review: [],
                    makeup: [],
                    retake: [],
                },
        [report],
    );

    const columns = useMemo(() => getColumns(examId), [examId]);

    return {
        report,
        isLoading,
        isError,
        isFetching,
        refetch,
        activeSection,
        setActiveSection,
        searchValue,
        setSearchValue,
        sectionFilter,
        setSectionFilter,
        sectionOptions,
        studentPage,
        setStudentPage,
        pageSize,
        columns,
        isFinalizingAll,
        handleFinalizeAll,
        activeQueue,
        setActiveQueue,
        actionPages,
        setActionPages,
        activeActionId,
        actionQueues,
        handleGrantOverride,
    };
}
