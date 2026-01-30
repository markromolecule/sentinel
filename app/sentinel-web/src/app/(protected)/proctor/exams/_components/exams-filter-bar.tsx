"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ExamsFilterBarProps } from "@/app/(protected)/proctor/exams/_types";

const tabs = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Completed" },
];

export function ExamsFilterBar({
    searchQuery,
    onSearchChange,
    activeTab,
    onTabChange,
}: ExamsFilterBarProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search exams..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => onTabChange(tab.value)}
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
    );
}
