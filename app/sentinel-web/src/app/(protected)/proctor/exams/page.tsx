"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MOCK_PROCTOR_EXAMS } from "@/app/(protected)/proctor/_constants";
import { ExamCreateDialog } from "@/app/(protected)/proctor/exams/_components/exam-create-dialog";
import { ExamsFilterBar } from "@/app/(protected)/proctor/exams/_components/exams-filter-bar";
import { ExamsTable } from "@/app/(protected)/proctor/exams/_components/exams-table";
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
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
                    <p className="text-muted-foreground">
                        Manage your examinations and assessments.
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#323d8f] hover:bg-[#323d8f]/90 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Exam
                </Button>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
                {/* Exam Table */}
                {filteredExams.length > 0 ? (
                    <ExamsTable 
                        exams={filteredExams}
                        toolbarActions={
                            <ExamsFilterBar
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />
                        }
                    />
                ) : (
                    /* Empty State */
                    <ExamEmptyState
                        isSearching={!!searchQuery}
                        onCreateClick={() => setIsCreateOpen(true)}
                    />
                )}
            </div>

            {/* Create Exam Dialog */}
            <ExamCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}
