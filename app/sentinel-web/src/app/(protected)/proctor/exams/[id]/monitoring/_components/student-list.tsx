"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentListProps } from "../_types";
import { statusConfig } from "../_constants";
import { StudentCard } from "./student-card";

export function StudentList({
    students,
    selectedId,
    onSelect,
    searchQuery,
    onSearchChange,
    filterStatus,
    onFilterChange,
}: StudentListProps) {
    return (
        <div className="lg:col-span-2 space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Filter className="w-4 h-4 mr-2" />
                            {filterStatus === "all"
                                ? "All Status"
                                : statusConfig[filterStatus]?.label}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onFilterChange("all")}>
                            All Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFilterChange("active")}>
                            Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFilterChange("flagged")}>
                            Flagged
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFilterChange("submitted")}>
                            Submitted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFilterChange("disconnected")}>
                            Disconnected
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {students.map((student) => (
                    <StudentCard
                        key={student.id}
                        student={student}
                        isSelected={selectedId === student.id}
                        onClick={() => onSelect(student)}
                    />
                ))}
            </div>
        </div>
    );
}
