"use client";

import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";

import { useExamDetails } from "@/app/(protected)/student/exam/details/_hooks/use-exam-details";
import { ExamBanner } from "@/app/(protected)/student/exam/details/_components/exam-banner";
import { ExamInfoBar } from "@/app/(protected)/student/exam/details/_components/exam-info-bar";
import { ExamDescription } from "@/app/(protected)/student/exam/details/_components/exam-description";
import { ExamSidebar } from "@/app/(protected)/student/exam/details/_components/exam-sidebar";
import { ExamNotFound } from "@/app/(protected)/student/exam/details/_components/exam-not-found";
import { ExamLoading } from "@/app/(protected)/student/exam/details/_components/exam-loading";

function ExamDetailsContent() {
    const { exam, handleBack } = useExamDetails();

    if (!exam) {
        return <ExamNotFound onBack={handleBack} />;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            {/* Back Button */}
            <button
                onClick={handleBack}
                className="text-white/40 hover:text-white transition-colors flex items-center gap-2 w-fit group"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Exams
            </button>

            {/* Main Content Card */}
            <div className="bg-[#1a1b26] border border-white/5 rounded-2xl overflow-hidden">
                {/* Banner */}
                <ExamBanner exam={exam} />

                <div className="p-6 md:p-8 space-y-8">
                    {/* Info Bar */}
                    <ExamInfoBar exam={exam} />

                    {/* Main Details and Sidebar */}
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <ExamDescription description={exam.description} />
                        </div>

                        {/* Sidebar Stats */}
                        <div>
                            <ExamSidebar exam={exam} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExamDetailsPage() {
    return (
        <Suspense fallback={<ExamLoading />}>
            <ExamDetailsContent />
        </Suspense>
    );
}

