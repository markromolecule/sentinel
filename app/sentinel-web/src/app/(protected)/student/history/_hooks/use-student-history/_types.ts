import { ExamHistory } from "@/app/(protected)/student/_types";
import { HistoryFilterStatus } from "@/app/(protected)/student/history/_types";

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
