import { cn } from "@/lib/utils";
import { type ExamTabsProps } from "@/app/(protected)/student/_types";

export function ExamTabs({ activeTab, onTabChange }: ExamTabsProps) {
    return (
        <div className="flex p-1 bg-white/5 rounded-xl w-fit">
            <button
                onClick={() => onTabChange("available")}
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
                onClick={() => onTabChange("history")}
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
    );
}
