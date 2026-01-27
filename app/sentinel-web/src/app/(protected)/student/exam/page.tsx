"use client";

import { useExamList } from "./_hooks/use-exam-list";
import { ExamHeader } from "./_components/exam-header";
import { ExamSearch } from "./_components/exam-search";
import { ExamTabs } from "./_components/exam-tabs";
import { ExamList } from "./_components/exam-list";
import { ExamPagination } from "./_components/exam-pagination";

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
                {/* Section Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold text-white">My Exams</h2>
                </div>

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

