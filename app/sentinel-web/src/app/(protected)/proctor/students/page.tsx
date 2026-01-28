"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Users,
    Search,
    UserPlus,
    MoreHorizontal,
    Mail,
    Trash2,
    GraduationCap,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_STUDENTS } from "@/app/(protected)/proctor/_constants";
import { StudentEnrollmentDialog } from "./_components/student-enrollment-dialog";

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Students</h1>
                    <p className="text-muted-foreground">
                        Manage and enroll students for your exams
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

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, student no., section..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Students Table */}
            {filteredStudents.length > 0 ? (
                <Card className="border-border/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                        Student
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                        Student No.
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                                        Section
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                                        Subject
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                                        Term
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {student.firstName[0]}{student.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {student.firstName} {student.lastName}
                                                    </p>
                                                    {student.email && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {student.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm text-foreground font-mono">
                                                {student.studentNo}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell">
                                            <span className="text-sm text-foreground">
                                                {student.section}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 hidden lg:table-cell">
                                            <span className="text-sm text-foreground">
                                                {student.subject}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 hidden lg:table-cell">
                                            <span className="text-sm text-muted-foreground">
                                                {student.term}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="cursor-pointer">
                                                        <Mail className="w-4 h-4 mr-2" />
                                                        Send Message
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500">
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                /* Empty State */
                <Card className="p-12 border-border/50">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {searchQuery ? "No students found" : "No students yet"}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                                {searchQuery
                                    ? `No results found for "${searchQuery}". Try a different search term.`
                                    : "Add students by uploading a CSV or Excel file with student information."}
                            </p>
                        </div>
                        {!searchQuery && (
                            <Button
                                onClick={() => setIsEnrollmentOpen(true)}
                                className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Students
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Enrollment Dialog */}
            <StudentEnrollmentDialog
                open={isEnrollmentOpen}
                onOpenChange={setIsEnrollmentOpen}
            />
        </div>
    );
}
