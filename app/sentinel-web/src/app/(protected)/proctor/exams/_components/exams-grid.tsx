"use client";

import { ExamsGridProps } from "@/app/(protected)/proctor/exams/_types";
import { ExamCard } from "@/app/(protected)/proctor/exams/_components/exam-card";

export function ExamsGrid({ exams }: ExamsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
            ))}
        </div>
    );
}
