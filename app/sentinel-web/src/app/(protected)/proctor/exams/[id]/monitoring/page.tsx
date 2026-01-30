"use client";

import { useState } from "react";
import { StudentSession } from "./_types";
import { MOCK_EXAM, MOCK_STUDENTS } from "./_constants";
import { MonitoringHeader } from "@/app/(protected)/proctor/exams/[id]/monitoring/_components/monitoring-header";
import { MonitoringStats } from "@/app/(protected)/proctor/exams/[id]/monitoring/_components/monitoring-stats";
import { StudentList } from "@/app/(protected)/proctor/exams/[id]/monitoring/_components/student-list";
import { MonitoringDetailPanel } from "@/app/(protected)/proctor/exams/[id]/monitoring/_components/monitoring-detail-panel";

export default function ExamMonitoringPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<StudentSession | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const filteredStudents = MOCK_STUDENTS.filter((student) => {
        const matchesSearch =
            student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.studentNo.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === "all" || student.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: MOCK_STUDENTS.length,
        active: MOCK_STUDENTS.filter((s) => s.status === "active").length,
        flagged: MOCK_STUDENTS.filter((s) => s.status === "flagged").length,
        submitted: MOCK_STUDENTS.filter((s) => s.status === "submitted").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <MonitoringHeader
                    examTitle={MOCK_EXAM.title}
                    examSubject={MOCK_EXAM.subject}
                />

                {/* Stats Bar */}
                <MonitoringStats stats={stats} />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Student List */}
                <StudentList
                    students={filteredStudents}
                    selectedId={selectedStudent?.id || null}
                    onSelect={setSelectedStudent}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                />

                {/* Detail Panel */}
                <MonitoringDetailPanel student={selectedStudent} />
            </div>
        </div>
    );
}
