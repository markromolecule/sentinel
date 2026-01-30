"use client";

import { useState } from "react";
import { MOCK_PROCTOR_EXAMS } from "@/app/(protected)/proctor/_constants";
import { ExamCreateDialog } from "@/app/(protected)/proctor/exams/_components/exam-create-dialog";
import { ExamsPageHeader } from "@/app/(protected)/proctor/exams/_components/exams-page-header";
import { ExamsFilterBar } from "@/app/(protected)/proctor/exams/_components/exams-filter-bar";
import { ExamsGrid } from "@/app/(protected)/proctor/exams/_components/exams-grid";
import { ExamEmptyState } from "@/app/(protected)/proctor/exams/_components/exam-empty-state";

export default function ProctorExamsPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const filteredExams = MOCK_PROCTOR_EXAMS.filter((exam) => {
        const matchesTab = activeTab === "all" || exam.status === activeTab;
        const matchesSearch =
            exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <ExamsPageHeader onCreateClick={() => setIsCreateOpen(true)} />

            {/* Search and Tabs */}
            <ExamsFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Exam Grid */}
            {filteredExams.length > 0 ? (
                <ExamsGrid exams={filteredExams} />
            ) : (
                /* Empty State */
                <ExamEmptyState
                    isSearching={!!searchQuery}
                    onCreateClick={() => setIsCreateOpen(true)}
                />
            )}

            {/* Create Exam Dialog */}
            <ExamCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}
