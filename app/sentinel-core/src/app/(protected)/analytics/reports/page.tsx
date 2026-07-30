'use client';

import * as React from 'react';
import { AnalyticsReportsList } from '@/app/(protected)/analytics/_components';
import { Button, Skeleton } from '@sentinel/ui';
import { FileBarChart, Loader2 } from 'lucide-react';
import { AnalyticsPageShell } from '../_components/layout';
import { useAcademicScope } from '@/hooks/use-academic-scope';
import {
    useAnalyticsReportsQuery,
    useGenerateAnalyticsReportMutation,
    useAnalyticsReportDownloadMutation,
} from '@/data';
import { useServerPagination } from '@sentinel/hooks';
import { toast } from 'sonner';

/**
 * ReportsAnalyticsPage displays historically generated analytical reports
 * and provides features to request new custom report generation.
 */
export default function ReportsAnalyticsPage() {
    const { institutionId, isLoading: isScopeLoading } = useAcademicScope();

    const { pagination, setPagination } = useServerPagination([institutionId]);

    // Live backend queries with institution scoping
    const { data: reportsData, isLoading: isReportsLoading } = useAnalyticsReportsQuery({
        payload: {
            institution_id: institutionId || undefined,
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
        },
        enabled: !isScopeLoading,
    });

    // Report generation mutation
    const { mutate: generateReport, isPending: isGenerating } =
        useGenerateAnalyticsReportMutation();

    const downloadReportMutation = useAnalyticsReportDownloadMutation();
    const [activeDownloadId, setActiveDownloadId] = React.useState<string | null>(null);

    const handleDownload = async (reportId: string) => {
        const loadingToastId = toast.loading('Preparing the PDF download...');
        try {
            setActiveDownloadId(reportId);
            const response = await downloadReportMutation.mutateAsync(reportId);
            toast.success('PDF download is ready.', { id: loadingToastId });
            window.open(response.downloadUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to prepare the report download.';
            toast.error(message, { id: loadingToastId });
        } finally {
            setActiveDownloadId(null);
        }
    };

    const pageCount = Math.max(
        1,
        Math.ceil((reportsData?.total_records ?? 0) / pagination.pageSize),
    );

    return (
        <AnalyticsPageShell
            title="Generated Reports"
            description="Manage, preview, and generate official institution proctoring reports for audits and compliance standards."
            actions={
                <Button
                    className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                    disabled={isGenerating}
                    onClick={() =>
                        generateReport({
                            title: `Administrative Telemetry Report - ${new Date().toLocaleDateString()}`,
                            institutionId: institutionId || undefined,
                            period: 'LAST_30_DAYS',
                            timezone: 'Asia/Manila',
                        })
                    }
                >
                    {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileBarChart className="mr-2 h-4 w-4" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate New Report'}
                </Button>
            }
        >
            {isScopeLoading || isReportsLoading ? (
                <Skeleton className="h-[400px] w-full rounded-xl" />
            ) : (
                <AnalyticsReportsList
                    reports={reportsData?.records || []}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    pageCount={pageCount}
                    onDownload={handleDownload}
                    activeDownloadId={activeDownloadId}
                />
            )}
        </AnalyticsPageShell>
    );
}
