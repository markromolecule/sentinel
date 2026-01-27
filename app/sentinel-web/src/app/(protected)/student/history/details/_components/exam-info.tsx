import { Calendar, Clock } from "lucide-react";
import { ExamInfoProps } from "@/app/(protected)/student/history/details/_types";

export function ExamInfo({ title, dateTaken, timeSpent }: ExamInfoProps) {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{title}</h1>

            <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                    <Calendar className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/80">
                        {new Date(dateTaken).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                    <Clock className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/80">{timeSpent} minutes</span>
                </div>
            </div>
        </div>
    );
}
