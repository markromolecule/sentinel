import Link from 'next/link';
import { ArrowLeft, ClipboardList, FileText, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@sentinel/ui';
import type { ExamReport, ExamReportActionItem } from '@sentinel/shared/types';
import { formatDateTime, formatPercent } from '../_helpers/report-helpers';
import { SummaryCard } from './summary-card';
import { ActionListCard } from './action-list-card';
import { IncidentBreakdown } from './incident-breakdown';
import { ExamWindowCard } from './exam-window-card';
import { AttemptSummaryTable } from './attempt-summary-table';
import { ExamReportPdfExport } from './exam-report-pdf-export';
import { RemediationGrantDialog } from './remediation-grant-dialog';
import type { RemediationTarget } from '../_hooks/use-exam-report-remediation';

export type ReportSummarySectionProps = {
    id: string;
    report: ExamReport;
    isFetching: boolean;
    activeActionId: string | null;
    remediationTarget: RemediationTarget;
    setRemediationTarget: React.Dispatch<React.SetStateAction<RemediationTarget>>;
    refetch: () => Promise<any>;
    handleGrantOverride: (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        overrideType: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => Promise<void>;
};

export function ReportSummarySection({
    id,
    report,
    isFetching,
    activeActionId,
    remediationTarget,
    setRemediationTarget,
    refetch,
    handleGrantOverride,
}: ReportSummarySectionProps) {
    return (
        <div className="flex h-full flex-1 flex-col space-y-8 p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                    <div className="text-muted-foreground text-sm">
                        <Link href="/exams" className="hover:text-foreground transition-colors">
                            Exams
                        </Link>{' '}
                        / <span>{report.exam.title}</span> / <span>Report</span>
                    </div>
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
                        <ExamReportPdfExport examId={id} variant="button" />
                        <Button variant="outline" asChild>
                            <Link href="/exams">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Exams
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Assigned Students"
                    value={report.summary.totalAssignedStudents.toString()}
                    hint={`${report.summary.totalAbsent} absent • ${report.summary.totalStarted} started`}
                />
                <SummaryCard
                    title="Submitted"
                    value={report.summary.totalSubmitted.toString()}
                    hint={`${report.summary.flaggedStudentsCount} flagged for review`}
                />
                <SummaryCard
                    title="Average Score"
                    value={formatPercent(report.summary.averageScore)}
                    hint={`Pass rate ${formatPercent(report.summary.passRate)}`}
                />
                <Link href={`/exams/${id}/report?section=queue`} className="block transition-opacity hover:opacity-90">
                    <SummaryCard
                        title="Action Queue"
                        value={(
                            report.summary.needsReviewCount +
                            report.summary.needsMakeupCount +
                            report.summary.needsRetakeCount
                        ).toString()}
                        hint={`${report.summary.needsReviewCount} review • ${report.summary.needsMakeupCount} makeup • ${report.summary.needsRetakeCount} retake (View Full Queue)`}
                    />
                </Link>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <ActionListCard
                    title="Needs Review"
                    icon={<ShieldAlert className="h-5 w-5 text-red-500" />}
                    items={report.actionItems.review}
                    emptyMessage="No students currently need incident review."
                />
                <ActionListCard
                    title="Needs Makeup"
                    icon={<ClipboardList className="h-5 w-5 text-amber-500" />}
                    items={report.actionItems.makeup}
                    emptyMessage="No absent students need a makeup workflow."
                    actionLabel="Grant Makeup"
                    onAction={(item) => {
                        setRemediationTarget({ items: [item], type: 'MAKEUP' });
                    }}
                    activeActionId={activeActionId}
                />
                <ActionListCard
                    title="Needs Retake"
                    icon={<RotateCcw className="h-5 w-5 text-blue-500" />}
                    items={report.actionItems.retake}
                    emptyMessage="No students currently need a retake recommendation."
                    actionLabel="Grant Retake"
                    onAction={(item) => {
                        setRemediationTarget({ items: [item], type: 'RETAKE' });
                    }}
                    activeActionId={activeActionId}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
                <IncidentBreakdown summary={report.summary} />
                <ExamWindowCard exam={report.exam} />
            </div>

            <AttemptSummaryTable students={report.students} />

            <RemediationGrantDialog
                isOpen={remediationTarget !== null}
                onClose={() => setRemediationTarget(null)}
                items={remediationTarget?.items ?? []}
                item={remediationTarget?.items?.[0] ?? null}
                overrideType={remediationTarget?.type ?? null}
                onConfirm={handleGrantOverride}
                isLoading={activeActionId !== null}
            />
        </div>
    );
}
