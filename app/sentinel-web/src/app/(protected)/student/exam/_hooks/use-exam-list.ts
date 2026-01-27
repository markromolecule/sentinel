import { useState, useMemo } from "react";
import { MOCK_EXAMS } from "../../_constants";

export function useExamList() {
    const [activeTab, setActiveTab] = useState<"available" | "history">("available");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const filteredExams = useMemo(() => {
        return MOCK_EXAMS.filter((exam) => {
            const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exam.subject.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (activeTab === "available") {
                return exam.status === "available" || exam.status === "upcoming";
            } else {
                return exam.status === "completed" || exam.status === "in-progress";
            }
        });
    }, [searchQuery, activeTab]);

    const totalPages = Math.ceil(filteredExams.length / itemsPerPage);

    const paginatedExams = useMemo(() => {
        return filteredExams.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredExams, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return {
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        currentPage,
        totalPages,
        paginatedExams,
        handlePageChange,
        hasExams: filteredExams.length > 0,
    };
}
