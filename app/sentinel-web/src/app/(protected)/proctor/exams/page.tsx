"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    FileText,
    Search,
    Plus,
    Clock,
    Users,
    CalendarDays,
    MoreHorizontal,
    Pencil,
    Trash2,
    Eye,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_PROCTOR_EXAMS } from "@/app/(protected)/proctor/_constants";
import { cn } from "@/lib/utils";
import { ExamCreateDialog } from "./_components/exam-create-dialog";

const tabs = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Completed" },
];

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Exams</h1>
                    <p className="text-muted-foreground">
                        Create and manage your proctored exams
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Exam
                </Button>
            </div>

            {/* Search and Tabs */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search exams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                                activeTab === tab.value
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Exam Grid */}
            {filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredExams.map((exam) => (
                        <Card key={exam.id} className="p-5 border-border/50 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <span
                                        className={cn(
                                            "text-xs font-medium px-2 py-1 rounded-full",
                                            exam.status === "active"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : exam.status === "draft"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-gray-100 text-gray-700"
                                        )}
                                    >
                                        {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                                    </span>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
                                {exam.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {exam.description}
                            </p>

                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>{exam.subject}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{exam.duration} minutes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>{exam.studentsCount} students</span>
                                </div>
                                {exam.scheduledDate && (
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4" />
                                        <span>{new Date(exam.scheduledDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <Card className="p-12 border-border/50">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                            <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {searchQuery ? "No exams found" : "No exams yet"}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                                {searchQuery
                                    ? `No results found for "${searchQuery}". Try a different search term.`
                                    : "Create your first exam to get started with proctoring."}
                            </p>
                        </div>
                        {!searchQuery && (
                            <Button
                                onClick={() => setIsCreateOpen(true)}
                                className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Exam
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Create Exam Dialog */}
            <ExamCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}
