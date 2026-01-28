import { cn } from "@/lib/utils";
import { type ExamTabsProps } from "@/app/(protected)/student/_types";

export function ExamTabs({ activeTab, onTabChange }: ExamTabsProps) {
    return (
        <div className="flex p-1 bg-muted/50 rounded-xl w-fit">
            <button
                onClick={() => onTabChange("available")}
                className={cn(
                    "px-8 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === "available"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
            >
                Available
            </button>
            <button
                onClick={() => onTabChange("history")}
                className={cn(
                    "px-8 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === "history"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
            >
                History
            </button>
        </div>
    );
}
