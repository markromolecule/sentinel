"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_EXAMS } from "../../_constants";
import { Clock, HelpCircle, Trophy, BarChart, ChevronLeft, AlertCircle, User, BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import NextImage from "next/image";

import { Suspense } from "react";

function ExamDetailsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const examId = searchParams.get("id");
    const exam = MOCK_EXAMS.find((e) => e.id === examId);

    if (!examId || !exam) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white">Exam Not Found</h1>
                <p className="text-white/60">The exam you are looking for does not exist or has been removed.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Exams
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="text-white/40 hover:text-white transition-colors flex items-center gap-2 w-fit group"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Exams
            </button>

            {/* Main Content Card */}
            <div className="bg-[#1a1b26] border border-white/5 rounded-2xl overflow-hidden">
                {/* 1. Stock Image (Banner) */}
                <div className="h-48 md:h-64 relative bg-gradient-to-br from-[#323d8f] to-[#4a5bb8]">
                    {/* Placeholder content since we don't have real stock images yet, using a pattern/gradient */}
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-20 h-20 text-white/20" />
                    </div>
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1b26]" />

                    <div className="absolute bottom-6 left-6 md:left-8">
                        <Badge className={cn(
                            "capitalize shadow-sm mb-3",
                            exam.status === 'available' ? 'bg-[#323d8f] text-white' :
                                exam.status === 'upcoming' ? 'bg-amber-500 text-white' :
                                    'bg-white/10 text-white'
                        )}>
                            {exam.status}
                        </Badge>
                        {/* 2. Exam Title */}
                        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight shadow-black/50 drop-shadow-md">
                            {exam.title}
                        </h1>
                    </div>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                    {/* 3. Subject, 4. Minutes, 5. Professor */}
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

                    {/* 6. Extra Details */}
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                                <p className="text-white/70 leading-relaxed text-lg">
                                    {exam.description}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
                                <ul className="space-y-3">
                                    {[
                                        "Ensure stable internet connection.",
                                        "Full-screen mode will be enforced.",
                                        "No tab switching allowed.",
                                        "Review answers before submitting."
                                    ].map((instruction, i) => (
                                        <li key={i} className="flex gap-3 text-white/70">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#323d8f] mt-2.5 flex-shrink-0" />
                                            <span>{instruction}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Sidebar Stats */}
                        <div className="space-y-4">
                            <Card className="bg-white/5 border-white/5">
                                <CardContent className="p-4 space-y-4">
                                    <div>
                                        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Questions</span>
                                        <div className="flex items-center gap-2 text-xl font-bold text-white">
                                            <HelpCircle className="w-5 h-5 text-[#323d8f]" />
                                            {exam.questionsCount}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Passing</span>
                                        <div className="flex items-center gap-2 text-xl font-bold text-white">
                                            <Trophy className="w-5 h-5 text-[#323d8f]" />
                                            {exam.passingScore}%
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Difficulty</span>
                                        <div className="flex items-center gap-2 text-xl font-bold text-white capitalize">
                                            <BarChart className="w-5 h-5 text-[#323d8f]" />
                                            {exam.difficulty}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Button
                                size="lg"
                                className="w-full bg-[#323d8f] hover:bg-[#323d8f]/90 font-semibold"
                                disabled={exam.status === 'upcoming'}
                            >
                                {exam.status === 'upcoming' ? 'Available Soon' : 'Start Exam'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExamDetailsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/40">Loading exam details...</div>}>
            <ExamDetailsContent />
        </Suspense>
    );
}
