'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@sentinel/hooks';
import { completeExamSession } from '@sentinel/services';
import { Button } from '@sentinel/ui';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import type { ProctorExam } from '@sentinel/shared/types';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { StudentExamLoadingState } from '../_components/student-exam-loading-state';
import { useStudentExamData } from '../_hooks/use-student-exam-data';
import { useTurnedInExamRedirect } from '../_hooks/use-turned-in-exam-redirect';
import {
    clearStoredExamTurnInPreview,
    readStoredExamTurnInPreview,
    type StoredExamTurnInPreview,
    type StoredExamTurnInPreviewSummary,
} from '../_lib/exam-turn-in-storage';
import { clearStoredExamSession } from '../_lib/exam-session-storage';
import { resolveStudentExamSessionError } from '../_lib/student-exam-session-feedback';

function formatPercentage(value: number | null) {
    return typeof value === 'number' ? `${value}%` : '--';
}

function getScoreDisplay(
    summary: NonNullable<StoredExamTurnInPreview['summary']>,
    scoreVisible: boolean,
) {
    if (!scoreVisible || summary.score === null) {
        return 'Pending Review';
    }

    return String(summary.score);
}

function getGradeDisplay(
    summary: NonNullable<StoredExamTurnInPreview['summary']>,
    scoreVisible: boolean,
) {
    if (!scoreVisible || summary.percentage === null) {
        return 'Pending Review';
    }

    return formatPercentage(summary.percentage);
}

function ResultHero({ title, scoreVisible }: { title: string; scoreVisible: boolean }) {
    return (
        <div className="space-y-2">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                {scoreVisible
                    ? 'Review the computed score before you finalize the attempt. Once you turn in the exam, the attempt will be marked as submitted.'
                    : 'Review your submission summary before you finalize the attempt. Your score will stay hidden until your instructor releases finalized results.'}
            </p>
        </div>
    );
}

function ResultMetricGrid({
    summary,
    scoreVisible,
}: {
    summary: NonNullable<StoredExamTurnInPreview['summary']>;
    scoreVisible: boolean;
}) {
    return (
        <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-card border-border/60 rounded-lg border p-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                    Score
                </p>
                <p className="text-foreground mt-3 text-3xl font-semibold">
                    {getScoreDisplay(summary, scoreVisible)}
                    {scoreVisible && summary.totalScore !== null ? (
                        <span className="text-muted-foreground ml-2 text-base font-normal">
                            / {summary.totalScore}
                        </span>
                    ) : null}
                </p>
            </div>
            <div className="bg-card border-border/60 rounded-lg border p-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                    Grade
                </p>
                <p className="text-foreground mt-3 text-3xl font-semibold">
                    {getGradeDisplay(summary, scoreVisible)}
                </p>
            </div>
            <div className="bg-card border-border/60 rounded-lg border p-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                    Answered
                </p>
                <p className="text-foreground mt-3 text-3xl font-semibold">
                    {summary.answeredCount}
                </p>
            </div>
            <div className="bg-card border-border/60 rounded-lg border p-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                    Manual Review
                </p>
                <p className="text-foreground mt-3 text-3xl font-semibold">
                    {summary.manualReviewQuestionCount}
                </p>
            </div>
        </div>
    );
}

function ResultReleaseNotice({
    summary,
    scoreVisible,
    resultCopy,
}: {
    summary: NonNullable<StoredExamTurnInPreview['summary']>;
    scoreVisible: boolean;
    resultCopy: string | null;
}) {
    return (
        <div className="bg-card border-border/60 rounded-lg border p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <h2 className="text-foreground text-lg font-semibold">Turn-In Notes</h2>
                    <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                        {resultCopy}
                    </p>
                </div>
                <div className="bg-muted/40 grid gap-3 rounded-lg px-4 py-3 text-sm sm:grid-cols-2 lg:min-w-[320px]">
                    <div>
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                            Auto-Graded
                        </p>
                        <p className="text-foreground mt-1 font-semibold">
                            {summary.autoGradableQuestionCount}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                            Pending Review
                        </p>
                        <p className="text-foreground mt-1 font-semibold">
                            {summary.manualReviewQuestionCount}
                        </p>
                    </div>
                </div>
            </div>
            {!scoreVisible ? (
                <p className="text-muted-foreground mt-4 max-w-3xl text-sm leading-6">
                    Scores are hidden for this exam until your instructor completes grading or
                    releases the reviewed results.
                </p>
            ) : null}
        </div>
    );
}

function ResultFooterActions({
    isTurningIn,
    onTurnIn,
}: {
    isTurningIn: boolean;
    onTurnIn: () => void;
}) {
    return (
        <div className="flex justify-end border-t pt-5">
            <div className="flex w-full justify-end sm:w-auto">
                <Button className="w-full sm:w-auto" onClick={onTurnIn} disabled={isTurningIn}>
                    {isTurningIn ? 'Turning In...' : 'Turn In'}
                </Button>
            </div>
        </div>
    );
}

function markExamAsTurnedIn(
    exam: ProctorExam,
    attemptId: string,
    completedAt: string,
    summary?: StoredExamTurnInPreviewSummary,
): ProctorExam {
    return {
        ...exam,
        status: 'turned_in',
        attemptId,
        completedAt,
        score: summary?.score ?? exam.score ?? null,
        totalScore: summary?.totalScore ?? exam.totalScore ?? null,
        percentage: summary?.percentage ?? exam.percentage ?? null,
    };
}

export default function StudentExamResultPage() {
    const router = useRouter();
    const apiClient = useApi();
    const queryClient = useQueryClient();
    const { examId, exam } = useStudentExamData();
    const [preview, setPreview] = useState<StoredExamTurnInPreview | null>(null);
    const [authoritativeSummary, setAuthoritativeSummary] =
        useState<StoredExamTurnInPreviewSummary | null>(null);
    const [isTurningIn, setIsTurningIn] = useState(false);
    const isRedirectingToHistory = useTurnedInExamRedirect({
        examId,
        status: exam?.status,
        attemptId: exam?.attemptId,
        runtimeAccess: exam?.runtimeAccess,
        disabled: isTurningIn,
    });

    useEffect(() => {
        setPreview(readStoredExamTurnInPreview(examId));
        setAuthoritativeSummary(null);
    }, [examId]);

    const summary = authoritativeSummary ?? preview?.summary ?? null;
    const scoreVisible = preview?.scoreVisible ?? true;
    const resultCopy = useMemo(() => {
        if (!summary) {
            return null;
        }

        if (!scoreVisible) {
            return 'This exam keeps student scores hidden until your instructor reviews and releases the results.';
        }

        if (summary.requiresManualReview) {
            return 'Objective items are scored now. Essay or manual-review items remain provisional until grading is completed.';
        }

        return 'This auto-graded summary will be stored when you turn in the attempt.';
    }, [scoreVisible, summary]);

    if (isRedirectingToHistory) {
        return <StudentExamLoadingState />;
    }

    const handleTurnIn = async () => {
        if (!preview || isTurningIn) {
            return;
        }

        setIsTurningIn(true);

        try {
            const result = await completeExamSession(apiClient, {
                sessionId: preview.sessionId,
                answers: preview.answers,
                elapsedSeconds: preview.elapsedSeconds,
            });
            const resolvedSummary: StoredExamTurnInPreviewSummary = {
                score: scoreVisible ? result.score : null,
                totalScore: scoreVisible ? result.totalScore : null,
                percentage: scoreVisible ? result.percentage : null,
                answeredCount: result.answeredCount,
                autoGradableQuestionCount: result.autoGradableQuestionCount,
                manualReviewQuestionCount: result.manualReviewQuestionCount,
                requiresManualReview: result.requiresManualReview,
            };

            setAuthoritativeSummary(resolvedSummary);

            queryClient.setQueriesData({ queryKey: EXAM_QUERY_KEYS.all }, (cached) => {
                if (Array.isArray(cached)) {
                    return cached.map((cachedExam) =>
                        cachedExam?.id === examId
                            ? markExamAsTurnedIn(
                                  cachedExam,
                                  result.attemptId,
                                  result.completedAt,
                                  resolvedSummary,
                              )
                            : cachedExam,
                    );
                }

                if (
                    cached &&
                    typeof cached === 'object' &&
                    'id' in cached &&
                    (cached as ProctorExam).id === examId
                ) {
                    return markExamAsTurnedIn(
                        cached as ProctorExam,
                        result.attemptId,
                        result.completedAt,
                        resolvedSummary,
                    );
                }

                return cached;
            });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.all }),
                queryClient.invalidateQueries({ queryKey: ['exams', 'history'] }),
            ]);

            clearStoredExamTurnInPreview(examId);
            clearStoredExamSession(examId);

            toast.success('Exam turned in successfully.');
            router.replace(`/student/exam/${examId}/feedback?attemptId=${result.attemptId}`);
        } catch (error) {
            toast.error(resolveStudentExamSessionError(error));
            setIsTurningIn(false);
        }
    };

    if (!preview || !summary) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
                <AlertTriangle className="text-muted-foreground h-12 w-12" />
                <div className="space-y-2">
                    <h1 className="text-foreground text-2xl font-semibold">
                        Result Preview Missing
                    </h1>
                    <p className="text-muted-foreground max-w-xl text-sm leading-6">
                        Return to the attempt page and submit the exam again to generate the turn-in
                        summary.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href={`/student/exam/${examId}/attempt`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Attempt
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full max-w-5xl space-y-5">
                <ResultHero
                    title={exam?.title ?? 'Exam result summary'}
                    scoreVisible={scoreVisible}
                />
                <ResultMetricGrid summary={summary} scoreVisible={scoreVisible} />
                <ResultReleaseNotice
                    summary={summary}
                    scoreVisible={scoreVisible}
                    resultCopy={resultCopy}
                />
                <ResultFooterActions
                    isTurningIn={isTurningIn}
                    onTurnIn={() => void handleTurnIn()}
                />
            </div>
        </div>
    );
}
