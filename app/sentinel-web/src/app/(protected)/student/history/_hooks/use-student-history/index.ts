import { useState } from "react";
import { MOCK_EXAM_HISTORY } from "@/app/(protected)/student/_constants";
import { HistoryFilterStatus } from "@/app/(protected)/student/history/_types";
import { UseStudentHistoryReturn } from "./_types";

export function useStudentHistory(): UseStudentHistoryReturn {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<HistoryFilterStatus>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const filteredHistory = MOCK_EXAM_HISTORY.filter((item) => {
        const matchesSearch = item.examTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    const paginatedHistory = filteredHistory.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return {
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter: (status) => {
            setStatusFilter(status);
            setCurrentPage(1); // Reset to first page on filter change
        },
        currentPage,
        setCurrentPage: handlePageChange,
        paginatedHistory,
        totalPages,
        hasItems: filteredHistory.length > 0
    };
}
