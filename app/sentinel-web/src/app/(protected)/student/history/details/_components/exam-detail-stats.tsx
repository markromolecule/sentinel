import { cn } from "@/lib/utils";
import { ExamDetailStatsProps } from "@/app/(protected)/student/history/details/_types";

export function ExamDetailStats({ score, totalScore, percentage }: ExamDetailStatsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Score</span>
                <div className="text-2xl font-bold text-foreground">
                    {score} <span className="text-muted-foreground text-sm font-normal">/ {totalScore}</span>
                </div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Grade</span>
                <div className={cn("text-2xl font-bold", percentage >= 75 ? "text-green-500" : "text-destructive")}>
                    {percentage}%
                </div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Correct</span>
                <div className="text-2xl font-bold text-foreground">
                    {Math.round((score / totalScore) * 100) / 2}
                </div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Mistakes</span>
                <div className="text-2xl font-bold text-foreground">
                    {totalScore - score}
                </div>
            </div>
        </div>
    );
}
