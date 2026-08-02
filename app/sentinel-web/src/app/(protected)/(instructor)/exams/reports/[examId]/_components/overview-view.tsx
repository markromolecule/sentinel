import * as React from 'react';
import type { ExamReport } from '@sentinel/shared/types';
import { Button } from '@sentinel/ui';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, formatPercent } from './helpers';
import { SummaryMetric } from './summary-metric';
import { DetailList } from './detail-list';
import { ExamReportPdfExport } from './exam-report-pdf-export';

type OverviewViewProps = {
    report: ExamReport;
    examId: string;
    refetch: () => Promise<unknown>;
    isFetching: boolean;
};

/**
 * Renders the Overview section of the exam report.
 * Includes the exam details header, action buttons, high-level summary cards,
 * and breakdown lists for incidents, severities, and the scheduled exam window.
 */
export function OverviewView({ report, examId, refetch, isFetching }: OverviewViewProps) {
    return (
        <>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <FileText className="text-muted-foreground h-7 w-7" />
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                {report.exam.title}
                            </h1>
                            <p className="text-muted-foreground">
                                {report.exam.subject} • Scheduled{' '}
                                {formatDateTime(report.exam.scheduledDate)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 xl:items-end">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                            {isFetching ? 'Refreshing...' : 'Refresh Report'}
                        </Button>
                        <ExamReportPdfExport examId={examId} variant="button" />
                        <Button variant="outline" asChild>
                            <Link href="/exams/reports">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Reports
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <section className="grid gap-4 border-y py-5 md:grid-cols-2 xl:grid-cols-4">
                <SummaryMetric
                    label="Assigned Students"
                    value={report.summary.totalAssignedStudents.toString()}
                    hint={`${report.summary.totalAbsent} absent • ${report.summary.totalStarted} started`}
                />
                <SummaryMetric
                    label="Submitted"
                    value={report.summary.totalSubmitted.toString()}
                    hint={`${report.summary.flaggedStudentsCount} flagged for review`}
                />
                <SummaryMetric
                    label="Average Score"
                    value={formatPercent(report.summary.averageScore)}
                    hint={`Pass rate ${formatPercent(report.summary.passRate)}`}
                />
                <SummaryMetric
                    label="Action Queue"
                    value={(
                        report.summary.needsReviewCount +
                        report.summary.needsMakeupCount +
                        report.summary.needsRetakeCount
                    ).toString()}
                    hint={`${report.summary.needsReviewCount} review • ${report.summary.needsMakeupCount} makeup • ${report.summary.needsRetakeCount} retake`}
                />
            </section>

            <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                    <DetailList
                        title="Incident Breakdown"
                        emptyMessage="No incidents were recorded for this exam."
                        items={report.summary.incidentBreakdownByType.map((item) => ({
                            key: item.type,
                            label: item.type.replaceAll('_', ' '),
                            count: item.count,
                        }))}
                    />

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Exam Window</h3>
                        <div className="divide-y rounded-xl border">
                            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                <span className="text-muted-foreground">Start</span>
                                <span className="text-right">
                                    {formatDateTime(report.exam.scheduledDate)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                <span className="text-muted-foreground">End</span>
                                <span className="text-right">
                                    {formatDateTime(report.exam.endDateTime)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                <span className="text-muted-foreground">Duration</span>
                                <span className="text-right">
                                    {report.exam.durationMinutes} minutes
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                <span className="text-muted-foreground">Passing Score</span>
                                <span className="text-right">{report.exam.passingScore}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DetailList
                    title="Severity Breakdown"
                    emptyMessage="No severity data is available for this exam."
                    items={report.summary.incidentBreakdownBySeverity.map((item) => ({
                        key: item.severity,
                        label: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
                        count: item.count,
                    }))}
                />
            </div>
        </>
    );
}
