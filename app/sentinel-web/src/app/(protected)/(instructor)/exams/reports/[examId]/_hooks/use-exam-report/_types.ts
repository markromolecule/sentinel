import type { ActionQueueType, ExamReportSection } from '../../_types';
import type { ExamReport, ExamReportActionItem } from '@sentinel/shared/types';
import type { ColumnDef } from '@tanstack/react-table';

export type UseExamReportOptions = {
    examId: string;
};

export type UseExamReportResult = {
    report: ExamReport | undefined;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    refetch: () => Promise<any>;

    // Section state
    activeSection: ExamReportSection;
    setActiveSection: (section: ExamReportSection) => void;

    // Search and filter state
    searchValue: string;
    setSearchValue: (value: string) => void;
    sectionFilter: string | undefined;
    setSectionFilter: (sectionId: string | undefined) => void;
    sectionOptions: readonly (readonly [string, string])[];

    // Attempts view specific
    studentPage: number;
    setStudentPage: (page: number) => void;
    pageSize: number;
    columns: ColumnDef<ExamReport['students'][number]>[];
    isFinalizingAll: boolean;
    handleFinalizeAll: () => Promise<void>;

    // Action Queue view specific
    activeQueue: ActionQueueType;
    setActiveQueue: (queue: ActionQueueType) => void;
    actionPages: Record<ActionQueueType, number>;
    setActionPages: React.Dispatch<React.SetStateAction<Record<ActionQueueType, number>>>;
    activeActionId: string | null;
    actionQueues: {
        review: ExamReportActionItem[];
        makeup: ExamReportActionItem[];
        retake: ExamReportActionItem[];
    };
    handleGrantOverride: (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        overrideType: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => Promise<void>;
};
