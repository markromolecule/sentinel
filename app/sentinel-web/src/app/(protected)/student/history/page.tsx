"use client";

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { HistoryFilters } from "@/app/(protected)/student/history/_components/history-filters";
import { HistoryHeader } from "@/app/(protected)/student/history/_components/history-header";
import { HistoryList } from "@/app/(protected)/student/history/_components/history-list";
import { useStudentHistory } from "@/app/(protected)/student/history/_hooks/use-student-history";

export default function StudentHistoryPage() {
    const {
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        currentPage,
        setCurrentPage,
        paginatedHistory,
        totalPages,
    } = useStudentHistory();

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="min-h-screen space-y-8 pb-10">
            <HistoryHeader
                title="History"
                description="View your past exam results and performance"
            />

            <HistoryFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
            />

            <div className="space-y-4">
                <HistoryList items={paginatedHistory} />

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
