import { BookOpen, Clock, User } from "lucide-react";
import { ExamInfoBarProps } from "@/app/(protected)/student/_types";

export function ExamInfoBar({ exam }: ExamInfoBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-y-4 gap-x-8 pb-8 border-b border-white/5">
            <div className="space-y-1">
                <span className="text-sm text-white/40 uppercase tracking-wider font-medium">Subject</span>
                <div className="flex items-center gap-2 text-white font-medium text-lg">
                    <BookOpen className="w-5 h-5 text-[#323d8f]" />
                    {exam.subject}
                </div>
            </div>

            <div className="space-y-1">
                <span className="text-sm text-white/40 uppercase tracking-wider font-medium">Duration</span>
                <div className="flex items-center gap-2 text-white font-medium text-lg">
                    <Clock className="w-5 h-5 text-[#323d8f]" />
                    {exam.duration} Minutes
                </div>
            </div>

            <div className="space-y-1">
                <span className="text-sm text-white/40 uppercase tracking-wider font-medium">Proctored By</span>
                <div className="flex items-center gap-2 text-white font-medium text-lg">
                    <User className="w-5 h-5 text-[#323d8f]" />
                    {exam.professor}
                </div>
            </div>
        </div>
    );
}
