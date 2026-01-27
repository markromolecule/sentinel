"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MOCK_EXAM_HISTORY } from "../../_constants";
import { CheatingReport } from "@/components/protected/student/CheatingReport";

function HistoryDetailsContent() {
    const searchParams = useSearchParams();
    const examId = searchParams.get("id");
    const historyItem = MOCK_EXAM_HISTORY.find((item) => item.examId === examId);

    if (!historyItem) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertTriangle className="w-16 h-16 text-white/20" />
                <h2 className="text-2xl font-bold text-white">Exam Result Not Found</h2>
                <Button asChild variant="outline">
                    <Link href="/student/history">Return to History</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 max-w-5xl mx-auto">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost" className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
                    <Link href="/student/history" className="flex items-center gap-2">
                        <ChevronLeft className="w-5 h-5" />
                        Back to History
                    </Link>
                </Button>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-white/10 text-white/60">
                        {historyItem.subject}
                    </Badge>
                    <Badge className={cn(
                        "capitalize",
                        historyItem.status === "passed" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    )}>
                        {historyItem.status}
                    </Badge>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-6">

                {/* Left Column: Info & Stats */}
                <div className="md:col-span-2 space-y-8">

                    {/* Exam Title & Meta */}
                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-4xl font-bold text-white">{historyItem.examTitle}</h1>

                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                                <Calendar className="w-4 h-4 text-white/60" />
                                <span className="text-sm text-white/80">
                                    {new Date(historyItem.dateTaken).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                                <Clock className="w-4 h-4 text-white/60" />
                                <span className="text-sm text-white/80">{historyItem.timeSpent} minutes</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                            <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Score</span>
                            <div className="text-2xl font-bold text-white">
                                {historyItem.score} <span className="text-white/40 text-sm font-normal">/ {historyItem.totalScore}</span>
                            </div>
                        </div>
                        <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                            <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Grade</span>
                            <div className={cn("text-2xl font-bold", historyItem.percentage >= 75 ? "text-green-500" : "text-red-500")}>
                                {historyItem.percentage}%
                            </div>
                        </div>
                        <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                            <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Correct</span>
                            <div className="text-2xl font-bold text-white">
                                {Math.round((historyItem.score / historyItem.totalScore) * 100) / 2}
                            </div>
                        </div>
                        <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-4 space-y-1">
                            <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Mistakes</span>
                            <div className="text-2xl font-bold text-white">
                                {historyItem.totalScore - historyItem.score}
                            </div>
                        </div>
                    </div>

                    {/* Modular Cheating Report */}
                    <CheatingReport
                        cheated={historyItem.cheated}
                        cheatingType={historyItem.cheatingType}
                    />

                </div>

                {/* Right Column: Hero Score */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-b from-[#323d8f]/20 to-[#1a1b26] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                        <div className="relative z-10 space-y-4">
                            <div className="text-white/60 font-medium">Final Result</div>

                            <div className={cn("text-7xl font-bold tracking-tighter",
                                historyItem.status === "passed" ? "text-green-400" : "text-red-400"
                            )}>
                                {historyItem.percentage}%
                            </div>

                            <Badge className={cn("px-4 py-1.5 text-base",
                                historyItem.status === "passed" ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            )}>
                                {historyItem.status === "passed" ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                {historyItem.status === "passed" ? "Passed" : "Failed"}
                            </Badge>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-6 text-center space-y-2">
                        <h3 className="text-white font-medium">Need Help?</h3>
                        <p className="text-white/40 text-sm">If you believe there is an error in your result, please contact your professor.</p>
                        <Button variant="outline" className="w-full mt-2 border-white/10 bg-transparent text-white hover:bg-white hover:text-black transition-colors">
                            Contact Support
                        </Button>
                    </div>
                </div>

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
