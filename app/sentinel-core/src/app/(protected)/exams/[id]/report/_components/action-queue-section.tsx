import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@sentinel/ui';
import type { ExamReport, ExamReportActionItem } from '@sentinel/shared/types';
import { formatDateTime } from '../_helpers/report-helpers';
import { ActionQueueView } from './action-queue-view';

export type ActionQueueSectionProps = {
    id: string;
    report: ExamReport;
    isFetching: boolean;
    activeActionId: string | null;
    refetch: () => Promise<any>;
    handleGrantOverride: (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        overrideType: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => Promise<void>;
};

export function ActionQueueSection({
    id,
    report,
    isFetching,
    activeActionId,
    refetch,
    handleGrantOverride,
}: ActionQueueSectionProps) {
    return (
        <div className="flex h-full flex-1 flex-col space-y-6 p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                    <div className="text-muted-foreground text-sm">
                        <Link href="/exams" className="hover:text-foreground transition-colors">
                            Exams
                        </Link>{' '}
                        / <Link href={`/exams/${id}/report`} className="hover:text-foreground transition-colors">{report.exam.title}</Link> / <span>Action Queue</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <FileText className="text-muted-foreground h-7 w-7" />
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Action Queue
                            </h1>
                            <p className="text-muted-foreground">
                                {report.exam.title} • {report.exam.subject} • Scheduled{' '}
                                {formatDateTime(report.exam.scheduledDate)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                        {isFetching ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/exams/${id}/report`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Summary
                        </Link>
                    </Button>
                </div>
            </div>

            <ActionQueueView
                actionQueues={{
                    review: report.actionItems.review,
                    makeup: report.actionItems.makeup,
                    retake: report.actionItems.retake,
                }}
                activeActionId={activeActionId}
                examId={id}
                sectionOptions={
                    report.sections
                        ? report.sections.map((s) => [s.id, s.name] as const)
                        : []
                }
                onGrantOverride={handleGrantOverride}
            />
        </div>
    );
}
