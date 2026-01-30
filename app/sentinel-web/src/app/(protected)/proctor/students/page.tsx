"use client";

import { useState } from "react";
import { MOCK_STUDENTS } from "@/app/(protected)/proctor/_constants";
import { StudentEnrollmentDialog } from "@/app/(protected)/proctor/students/_components/student-enrollment-dialog";
import { StudentsPageHeader } from "@/app/(protected)/proctor/students/_components/students-page-header";
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
        <div className="space-y-6">
            {/* Page Header */}
            <StudentsPageHeader onAddClick={() => setIsEnrollmentOpen(true)} />

            {/* Search Bar */}
            <StudentsSearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

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
