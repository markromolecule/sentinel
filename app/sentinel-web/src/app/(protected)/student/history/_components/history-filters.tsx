import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { HistoryFiltersProps } from "../_types";

export function HistoryFilters({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
}: HistoryFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                    placeholder="Search exam history..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-11 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary focus:ring-primary/20 transition-all"
                />
            </div>
            <div className="flex gap-2 text-sm overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    onClick={() => onStatusFilterChange("all")}
                    className={cn(
                        "h-12 px-6 shrink-0",
                        statusFilter === "all"
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                            : "bg-muted/50 border-border text-foreground hover:bg-muted"
                    )}
                >
                    All
                </Button>
                <Button
                    variant={statusFilter === "passed" ? "default" : "outline"}
                    onClick={() => onStatusFilterChange("passed")}
                    className={cn(
                        "h-12 px-6 shrink-0",
                        statusFilter === "passed"
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-muted/50 border-border text-foreground hover:bg-muted"
                    )}
                >
                    Passed
                </Button>
                <Button
                    variant={statusFilter === "failed" ? "default" : "outline"}
                    onClick={() => onStatusFilterChange("failed")}
                    className={cn(
                        "h-12 px-6 shrink-0",
                        statusFilter === "failed"
                            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            : "bg-muted/50 border-border text-foreground hover:bg-muted"
                    )}
                >
                    Failed
                </Button>
            </div>
        </div>
    );
}
