import { BookOpen, Clock, User } from "lucide-react";
import { ExamInfoBarProps } from "@/app/(protected)/student/_types";

export function ExamInfoBar({ exam }: ExamInfoBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-y-4 gap-x-8 pb-8 border-b border-border/50">
            <div className="space-y-1">
                <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Subject</span>
                <div className="flex items-center gap-2 text-foreground font-medium text-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                    {exam.subject}
                </div>
            </div>

            <div className="space-y-1">
                <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Duration</span>
                <div className="flex items-center gap-2 text-foreground font-medium text-lg">
                    <Clock className="w-5 h-5 text-primary" />
                    {exam.duration} Minutes
                </div>
            </div>

            <div className="space-y-1">
                <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Proctored By</span>
                <div className="flex items-center gap-2 text-foreground font-medium text-lg">
                    <User className="w-5 h-5 text-primary" />
                    {exam.professor}
                </div>
            </div>
        </div>
    );
}
