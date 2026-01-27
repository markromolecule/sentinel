import { BookOpen } from "lucide-react";
import { type ExamListProps } from "@/app/(protected)/student/_types";
import { ExamCard } from "./exam-card";

export function ExamList({ exams, emptyMessage }: ExamListProps) {
    if (exams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No exams found</h3>
                <p className="text-white/40 max-w-md mx-auto">
                    {emptyMessage}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
            ))}
        </div>
    );
}
