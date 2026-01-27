"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_STUDENT, MOCK_EXAMS } from "../_constants";
import { Search, Clock, BookOpen, User, Plus } from "lucide-react";
import Link from "next/link";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

export default function StudentExamPage() {
    const [activeTab, setActiveTab] = useState<"available" | "history">("available");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const filteredExams = MOCK_EXAMS.filter((exam) => {
        const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.subject.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (activeTab === "available") {
            return exam.status === "available" || exam.status === "upcoming";
        } else {
            return exam.status === "completed" || exam.status === "in-progress";
        }
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
    const paginatedExams = filteredExams.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="space-y-8 w-full">
            {/* Hero / Welcome Section */}
            <div className="space-y-2 py-4">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    Welcome back, <span className="text-[#323d8f]">{MOCK_STUDENT.name.split(" ")[0]}!</span>
                </h1>
                <p className="text-white/60 text-lg md:text-xl max-w-2xl">
                    Manage your exams and continue your learning journey.
                </p>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Section Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold text-white">My Exams</h2>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-white/40 group-focus-within:text-[#323d8f] transition-colors" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Search your exams..."
                        className="pl-11 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl focus:border-[#323d8f] focus:ring-[#323d8f]/20 transition-all text-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-white/5 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab("available")}
                        className={cn(
                            "px-8 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === "available"
                                ? "bg-white text-[#0f0f10] shadow-sm"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                    >
                        Available
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={cn(
                            "px-8 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === "history"
                                ? "bg-white text-[#0f0f10] shadow-sm"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                    >
                        History
                    </button>
                </div>

                {/* Content Grid */}
                {filteredExams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-white/20" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No exams found</h3>
                        <p className="text-white/40 max-w-md mx-auto">
                            {searchQuery
                                ? `No results found for "${searchQuery}". Try a different search term.`
                                : "You don't have any exams in this category yet."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedExams.map((exam) => (
                            <Card
                                key={exam.id}
                                className="group bg-[#1a1b26] border-white/5 hover:border-[#323d8f]/50 transition-all duration-300 overflow-hidden flex flex-col h-full"
                            >
                                {/* Card Cover / Top Decoration */}
                                <div className="h-32 bg-gradient-to-br from-[#323d8f]/20 to-[#4a5bb8]/10 relative">
                                    <div className="absolute top-4 right-4">
                                        <Badge className={cn(
                                            "capitalize shadow-sm",
                                            exam.status === 'available' ? 'bg-[#323d8f] text-white hover:bg-[#323d8f]' :
                                                exam.status === 'upcoming' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                                                    'bg-white/10 text-white hover:bg-white/20'
                                        )}>
                                            {exam.status}
                                        </Badge>
                                    </div>
                                    {/* Journal icon removed as requested */}
                                </div>

                                <CardHeader className="pb-0 pt-4 px-5">
                                    <CardTitle className="text-xl text-white line-clamp-1 group-hover:text-[#323d8f] transition-colors">
                                        {exam.title}
                                    </CardTitle>
                                    <CardDescription className="text-white/60 line-clamp-1">
                                        {exam.subject}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 flex flex-col justify-between gap-4 px-5 pb-5 pt-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center text-sm text-white/50">
                                            <Clock className="w-4 h-4 mr-2 text-[#323d8f]/70" />
                                            {exam.duration} minutes
                                        </div>
                                        <div className="flex items-center text-sm text-white/50">
                                            <User className="w-4 h-4 mr-2 text-[#323d8f]/70" />
                                            Professor Smith
                                        </div>
                                    </div>

                                    {exam.status === "upcoming" ? (
                                        <Button
                                            className="w-full mt-auto"
                                            variant="outline"
                                            disabled
                                        >
                                            Coming Soon
                                        </Button>
                                    ) : (
                                        <Link href={`/student/exam/details?id=${exam.id}`} className="w-full mt-auto">
                                            <Button
                                                className="w-full"
                                                variant="outline"
                                            >
                                                View Details
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages >= 1 && (
                    <Pagination className="mt-8 pb-4 text-white dark">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    className={cn(
                                        "cursor-pointer select-none",
                                        currentPage === 1 && "pointer-events-none opacity-50"
                                    )}
                                />
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        isActive={page === currentPage}
                                        onClick={() => handlePageChange(page)}
                                        className="cursor-pointer select-none"
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    className={cn(
                                        "cursor-pointer select-none",
                                        currentPage === totalPages && "pointer-events-none opacity-50"
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>
        </div>
    );
}
