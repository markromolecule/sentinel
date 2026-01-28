import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { type ExamPaginationProps } from "@/app/(protected)/student/_types";

export function ExamPagination({ currentPage, totalPages, onPageChange }: ExamPaginationProps) {
    if (totalPages < 1) return null;

    return (
        <Pagination className="mt-8 pb-4 text-foreground">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                            onClick={() => onPageChange(page)}
                            className="cursor-pointer select-none"
                        >
                            {page}
                        </PaginationLink>
                    </PaginationItem>
                ))}

                <PaginationItem>
                    <PaginationNext
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        className={cn(
                            "cursor-pointer select-none",
                            currentPage === totalPages && "pointer-events-none opacity-50"
                        )}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
