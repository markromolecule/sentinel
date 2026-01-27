"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MOCK_EXAM_HISTORY } from "../_constants";
import { Search, Calendar, ChevronRight, Clock, Award, AlertTriangle, Eye, Mic, AppWindow, Camera, Video, Maximize2, Smartphone } from "lucide-react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function StudentHistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const filteredHistory = MOCK_EXAM_HISTORY.filter((item) => {
        const matchesSearch = item.examTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    const paginatedHistory = filteredHistory.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="min-h-screen space-y-8 pb-10">
            {/* Header */}
            <div className="space-y-2 py-4">
                <h1 className="text-4xl font-bold text-white">History</h1>
                <p className="text-white/60 text-lg">
                    View your past exam results and performance
                </p>
            </div>

            {/* Controls: Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-white/40" />
                    </div>
                    <Input
                        placeholder="Search exam history..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl focus:border-[#323d8f] focus:ring-[#323d8f]/20 transition-all"
                    />
                </div>
                <div className="flex gap-2 text-sm overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <Button
                        variant={statusFilter === "all" ? "default" : "outline"}
                        onClick={() => setStatusFilter("all")}
                        className={cn("h-12 px-6 shrink-0", statusFilter === "all" ? "bg-[#323d8f] hover:bg-[#323d8f]/90" : "bg-white/5 border-white/10 text-white hover:bg-white/10")}
                    >
                        All
                    </Button>
                    <Button
                        variant={statusFilter === "passed" ? "default" : "outline"}
                        onClick={() => setStatusFilter("passed")}
                        className={cn("h-12 px-6 shrink-0", statusFilter === "passed" ? "bg-green-600 hover:bg-green-700" : "bg-white/5 border-white/10 text-white hover:bg-white/10")}
                    >
                        Passed
                    </Button>
                    <Button
                        variant={statusFilter === "failed" ? "default" : "outline"}
                        onClick={() => setStatusFilter("failed")}
                        className={cn("h-12 px-6 shrink-0", statusFilter === "failed" ? "bg-red-600 hover:bg-red-700" : "bg-white/5 border-white/10 text-white hover:bg-white/10")}
                    >
                        Failed
                    </Button>
                </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Award className="w-8 h-8 text-white/20" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No history found</h3>
                        <p className="text-white/40 max-w-md mx-auto">
                            Try adjusting your search or filters to find what you're looking for.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {paginatedHistory.map((item) => (
                            <div
                                key={item.id}
                                className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#1a1b26] border border-white/5 hover:border-[#323d8f]/50 rounded-xl transition-all duration-200 gap-4"
                            >
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    {/* Unified Score Box */}
                                    <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-white/10 bg-white/5 shrink-0">
                                        <span className="text-xl font-bold text-white">{item.score}</span>
                                        <span className="text-[10px] text-white/40 uppercase">Score</span>
                                    </div>

                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-white font-medium text-lg leading-tight group-hover:text-[#323d8f] transition-colors truncate pr-2">
                                            {item.examTitle}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-white/50">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(item.dateTaken).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {item.timeSpent} min
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cheating Flag & Status */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto pl-[4.5rem] md:pl-0 mt-2 md:mt-0">
                                    {/* Cheating Indicator */}
                                    {item.cheated && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 w-full sm:w-auto justify-center sm:justify-start">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                                                Flagged:
                                                {item.cheatingType === 'gaze' && <><Eye className="w-3 h-3 ml-1" /> Gaze</>}
                                                {item.cheatingType === 'audio' && <><Mic className="w-3 h-3 ml-1" /> Audio</>}
                                                {item.cheatingType === 'tab_switch' && <><AppWindow className="w-3 h-3 ml-1" /> Tab Switch</>}
                                                {item.cheatingType === 'screenshot' && <><Camera className="w-3 h-3 ml-1" /> Screenshot</>}
                                                {item.cheatingType === 'screen_record' && <><Video className="w-3 h-3 ml-1" /> Recording</>}
                                                {item.cheatingType === 'multiple' && "Multiple"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Status Text (Right Side) */}
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                        <span className={cn(
                                            "text-sm font-bold uppercase tracking-wider",
                                            item.status === "passed" ? "text-green-500" : "text-red-500"
                                        )}>
                                            {item.status}
                                        </span>

                                        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

                                        <Button asChild size="sm" variant="ghost" className="text-white/60 hover:text-black hover:bg-white gap-2 transition-colors">
                                            <Link href={`/student/history/details?id=${item.examId}`}>
                                                Details
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
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
