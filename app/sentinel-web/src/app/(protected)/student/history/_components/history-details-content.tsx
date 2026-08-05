'use client';

import { Button } from '@sentinel/ui';
import { AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CheatingReport } from '@/components/sidebar/student/CheatingReport';
import { StudentExamLoadingState } from '@/app/(protected)/student/exam/[id]/_components/student-exam-loading-state';
import { AttemptReportDialog } from '@/app/(protected)/student/history/details/_components/attempt-report-dialog';
import { ExamDetailStats } from '@/app/(protected)/student/history/details/_components/exam-detail-stats';
import { ExamHeader } from '@/app/(protected)/student/history/details/_components/exam-header';
import { ExamHeroScore } from '@/app/(protected)/student/history/details/_components/exam-hero-score';
import { ExamInfo } from '@/app/(protected)/student/history/details/_components/exam-info';
import { useExamDetails } from '@/app/(protected)/student/history/details/_hooks/use-exam-details';

export type HistoryDetailsContentProps = {
    attemptId?: string | null;
    examId?: string | null;
};

/**
 * Renders the student history detail experience for either a concrete attempt
 * or an exam-level fallback entry.
 *
 * @param props - Optional attempt and exam identifiers derived from the route.
 * @returns Student history detail content shell.
 */
export function HistoryDetailsContent({ attemptId, examId }: HistoryDetailsContentProps) {
    const { historyItem, report, reportAvailability, isLoading } = useExamDetails({
        attemptId,
        examId,
    });
    const [reportDialogOpen, setReportDialogOpen] = useState(false);

    if (isLoading) {
        return <StudentExamLoadingState />;
    }

    if (!historyItem) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
                <AlertTriangle className="text-muted-foreground h-16 w-16" />
                <h2 className="text-foreground text-2xl font-bold">Exam Result Not Found</h2>
                <Button asChild variant="outline">
                    <Link href="/student/history">Return to History</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
            <ExamHeader subject={historyItem.subject} status={historyItem.status} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                    <ExamInfo
                        title={historyItem.examTitle}
                        primaryDateLabel={
                            historyItem.status === 'turned_in'
                                ? 'Turned In'
                                : historyItem.status === 'past_due'
                                  ? 'Due'
                                  : 'Available'
                        }
                        primaryDateValue={
                            historyItem.status === 'turned_in'
                                ? (historyItem.completedAt ?? historyItem.dueAt ?? null)
                                : historyItem.status === 'past_due'
                                  ? (historyItem.dueAt ?? null)
                                  : (historyItem.availableAt ?? historyItem.dueAt ?? null)
                        }
                        timeSpent={historyItem.timeSpent ?? null}
                    />

                    <ExamDetailStats
                        score={historyItem.score ?? null}
                        totalScore={historyItem.totalScore ?? null}
                        percentage={historyItem.percentage ?? null}
                    />

                    {reportAvailability === 'available' ? (
                        <div className="border-border/60 bg-muted/30 border p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold">
                                        Detailed Report Available
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Review your released question results, answers, and awarded
                                        scores for this attempt.
                                    </p>
                                </div>
                                {report ? (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                            onClick={() => setReportDialogOpen(true)}
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            View Detailed Report
                                        </Button>
                                        <AttemptReportDialog
                                            open={reportDialogOpen}
                                            onOpenChange={setReportDialogOpen}
                                            attempt={report.attempt}
                                            questions={report.questions}
                                        />
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ) : reportAvailability === 'grading_in_progress' ? (
                        <div className="border-border/60 bg-muted/30 border p-4">
                            <p className="text-sm font-semibold">Report In Review</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                This attempt includes instructor-reviewed responses. Your detailed
                                report will appear here after grading is finalized.
                            </p>
                        </div>
                    ) : reportAvailability === 'loading_report' ? (
                        <div className="border-border/60 bg-muted/30 border p-4">
                            <p className="text-sm font-semibold">Preparing Detailed Report</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                We are loading the released question results for this attempt.
                            </p>
                        </div>
                    ) : null}

                    <CheatingReport
                        cheated={historyItem.cheated}
                        cheatingType={historyItem.cheatingType ?? undefined}
                    />
                </div>

                <ExamHeroScore
                    percentage={historyItem.percentage ?? null}
                    result={historyItem.result ?? null}
                />
            </div>
        </div>
    );
}
