"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CheatingReport } from "@/components/protected/student/CheatingReport";
import { ExamDetailStats } from "@/app/(protected)/student/history/details/_components/exam-detail-stats";
import { ExamHeader } from "@/app/(protected)/student/history/details/_components/exam-header";
import { ExamHeroScore } from "@/app/(protected)/student/history/details/_components/exam-hero-score";
import { ExamInfo } from "@/app/(protected)/student/history/details/_components/exam-info";
import { useExamDetails } from "@/app/(protected)/student/history/details/_hooks/use-exam-details";

function HistoryDetailsContent() {
    const { historyItem } = useExamDetails();

    if (!historyItem) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertTriangle className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold text-foreground">Exam Result Not Found</h2>
                <Button asChild variant="outline">
                    <Link href="/student/history">Return to History</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 max-w-5xl mx-auto pt-2">
            {/* Header / Nav */}
            <ExamHeader
                subject={historyItem.subject}
                status={historyItem.status}
            />

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-6">

                {/* Left Column: Info & Stats */}
                <div className="md:col-span-2 space-y-8">

                    {/* Exam Title & Meta */}
                    <ExamInfo
                        title={historyItem.examTitle}
                        dateTaken={historyItem.dateTaken}
                        timeSpent={historyItem.timeSpent}
                    />

                    {/* Stats Cards */}
                    <ExamDetailStats
                        score={historyItem.score}
                        totalScore={historyItem.totalScore}
                        percentage={historyItem.percentage}
                    />

                    {/* Modular Cheating Report */}
                    <CheatingReport
                        cheated={historyItem.cheated}
                        cheatingType={historyItem.cheatingType}
                    />

                </div>

                {/* Right Column: Hero Score */}
                <ExamHeroScore
                    percentage={historyItem.percentage}
                    status={historyItem.status}
                />

            </div>
        </div>
    );
}

export default function HistoryDetailsPage() {
    return (
        <Suspense fallback={<div className="text-white/60 p-10">Loading exam details...</div>}>
            <HistoryDetailsContent />
        </Suspense>
    );
}
