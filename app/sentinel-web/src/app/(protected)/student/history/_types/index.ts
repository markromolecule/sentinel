import { ExamHistory } from "@/app/(protected)/student/_types";

export type HistoryFilterStatus = "all" | "passed" | "failed";

export interface HistoryHeaderProps {
    title: string;
    description: string;
}

export interface HistoryFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    statusFilter: HistoryFilterStatus;
    onStatusFilterChange: (status: HistoryFilterStatus) => void;
}

export interface HistoryListProps {
    items: ExamHistory[];
}

export interface HistoryCardProps {
    item: ExamHistory;
}

export interface UseStudentHistoryReturn {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: HistoryFilterStatus;
    setStatusFilter: (status: HistoryFilterStatus) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    paginatedHistory: ExamHistory[];
    totalPages: number;
    hasItems: boolean;
}
