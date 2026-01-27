import { cn } from "@/lib/utils";
import { ExamDetailStatsProps } from "../_types";

export function ExamDetailStats({ score, totalScore, percentage }: ExamDetailStatsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Score</span>
                <div className="text-2xl font-bold text-white">
                    {score} <span className="text-white/40 text-sm font-normal">/ {totalScore}</span>
                </div>
            </div>
            <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Grade</span>
                <div className={cn("text-2xl font-bold", percentage >= 75 ? "text-green-500" : "text-red-500")}>
                    {percentage}%
                </div>
            </div>
            <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Correct</span>
                <div className="text-2xl font-bold text-white">
                    {Math.round((score / totalScore) * 100) / 2}
                </div>
            </div>
            <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Mistakes</span>
                <div className="text-2xl font-bold text-white">
                    {totalScore - score}
                </div>
            </div>
        </div>
    );
}
