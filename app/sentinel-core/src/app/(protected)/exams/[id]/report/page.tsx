'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useExamReportQuery } from '@sentinel/hooks';
import { ReportSkeleton } from './_components/report-skeleton';
import { ReportError } from './_components/report-error';
import { ActionQueueSection } from './_components/action-queue-section';
import { ReportSummarySection } from './_components/report-summary-section';
import { useExamReportRemediation } from './_hooks/use-exam-report-remediation';

function ExamReportPageContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const activeSection = searchParams?.get('section');

    const { data: report, isLoading, isError, refetch, isFetching } = useExamReportQuery(id);

    const {
        activeActionId,
        remediationTarget,
        setRemediationTarget,
        handleGrantOverride,
    } = useExamReportRemediation({
        examId: id,
        refetch,
    });

    if (isLoading) {
        return <ReportSkeleton />;
    }

    if (isError || !report) {
        return <ReportError refetch={() => void refetch()} />;
    }

    if (activeSection === 'queue') {
        return (
            <ActionQueueSection
                id={id}
                report={report}
                isFetching={isFetching}
                activeActionId={activeActionId}
                refetch={refetch}
                handleGrantOverride={handleGrantOverride}
            />
        );
    }

    return (
        <ReportSummarySection
            id={id}
            report={report}
            isFetching={isFetching}
            activeActionId={activeActionId}
            remediationTarget={remediationTarget}
            setRemediationTarget={setRemediationTarget}
            refetch={refetch}
            handleGrantOverride={handleGrantOverride}
        />
    );
}

export default function ExamReportPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<ReportSkeleton />}>
            <ExamReportPageContent params={params} />
        </Suspense>
    );
}
