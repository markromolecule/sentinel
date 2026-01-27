"use client";

import { useExamList } from "@/app/(protected)/student/exam/_hooks/use-exam-list";
import { ExamHeader } from "@/app/(protected)/student/exam/_components/exam-header";
import { ExamSearch } from "@/app/(protected)/student/exam/_components/exam-search";
import { ExamTabs } from "@/app/(protected)/student/exam/_components/exam-tabs";
import { ExamList } from "@/app/(protected)/student/exam/_components/exam-list";
import { ExamPagination } from "@/app/(protected)/student/exam/_components/exam-pagination";

export default function StudentExamPage() {
    const {
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        currentPage,
        totalPages,
        paginatedExams,
        handlePageChange,
    } = useExamList();

    const emptyMessage = searchQuery
        ? `No results found for "${searchQuery}". Try a different search term.`
        : "You don't have any exams in this category yet.";

    return (
        <div className="space-y-8 w-full">
            {/* Hero / Welcome Section */}
            <ExamHeader />

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Search Bar */}
                <ExamSearch value={searchQuery} onChange={setSearchQuery} />

                {/* Tabs */}
                <ExamTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Content Grid */}
                <ExamList exams={paginatedExams} emptyMessage={emptyMessage} />

                {/* Pagination */}
                <ExamPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
        </div>
    );
}

