"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MOCK_STUDENTS } from "@/app/(protected)/proctor/_constants";
import { StudentEnrollmentDialog } from "@/app/(protected)/proctor/students/_components/student-enrollment-dialog";
import { StudentsSearch } from "@/app/(protected)/proctor/students/_components/students-search";
import { StudentsTable } from "@/app/(protected)/proctor/students/_components/students-table";
import { StudentsEmptyState } from "@/app/(protected)/proctor/students/_components/students-empty-state";

export default function ProctorStudentsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);

    const filteredStudents = MOCK_STUDENTS.filter((student) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            student.firstName.toLowerCase().includes(searchLower) ||
            student.lastName.toLowerCase().includes(searchLower) ||
            student.studentNo.toLowerCase().includes(searchLower) ||
            student.section.toLowerCase().includes(searchLower) ||
            student.subject.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Students</h1>
                    <p className="text-muted-foreground">
                        Manage and enroll students for your exams.
                    </p>
                </div>
                <Button
                    onClick={() => setIsEnrollmentOpen(true)}
                    className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Students
                </Button>
            </div>

            <Separator />

            {/* Search Bar */}
            <div className="w-full max-w-sm">
                <StudentsSearch
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
            </div>

            {/* Students Table */}
            {filteredStudents.length > 0 ? (
                <StudentsTable students={filteredStudents} />
            ) : (
                /* Empty State */
                <StudentsEmptyState
                    isSearching={!!searchQuery}
                    onAddClick={() => setIsEnrollmentOpen(true)}
                />
            )}

            {/* Enrollment Dialog */}
            <StudentEnrollmentDialog
                open={isEnrollmentOpen}
                onOpenChange={setIsEnrollmentOpen}
            />
        </div>
    );
}
