'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    getErrorMessage,
    getPermissionDeniedMessage,
    isPermissionDeniedError,
    useActivePermissions,
    useCreateExamReportExportMutation,
    useDeleteExamReportExportMutation,
    useExamReportExportDownloadMutation,
    useExamReportExportStatusQuery,
    useExamReportExportsQuery,
    useRetryExamReportExportMutation,
} from '@sentinel/hooks';
import type { ExamResultsReportExportRecord } from '@sentinel/services';
import { PdfExportLifecyclePanel } from '@sentinel/ui';
import { toast } from 'sonner';

const EXPORT_PERMISSION = 'examinations:export_results_report';

const DENIED_MESSAGE = getPermissionDeniedMessage({
    resourceName: 'exam results PDF',
    action: 'export',
    actionLabel: 'export this exam results PDF',
});

function openSignedDownload(downloadUrl: string) {
    if (typeof window === 'undefined') {
        return false;
    }

    const popup = window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    return popup !== null;
}

export function ExamReportPdfExport({ examId }: { examId: string }) {
    const queryClient = useQueryClient();
    const { hasPermission, isLoading: isLoadingPermissions } = useActivePermissions();
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [liveRegionMessage, setLiveRegionMessage] = useState<string | null>(null);
    const canExport = hasPermission(EXPORT_PERMISSION);

    const exportsQuery = useExamReportExportsQuery({
        payload: {
            examId,
            page: 1,
            limit: 1,
        },
        enabled: canExport,
    });

    const latestExport = exportsQuery.data?.records[0] ?? null;

    const statusQuery = useExamReportExportStatusQuery({
        payload: {
            examId,
            exportId: latestExport?.exportId,
            page: 1,
            limit: 1,
        },
        enabled: canExport && Boolean(latestExport?.exportId),
    });
    const queryPermissionDenied = Boolean(
        (exportsQuery.error && isPermissionDeniedError(exportsQuery.error, EXPORT_PERMISSION)) ||
            (statusQuery.error && isPermissionDeniedError(statusQuery.error, EXPORT_PERMISSION)),
    );

    const activeExport = useMemo<ExamResultsReportExportRecord | null>(() => {
        return statusQuery.data ?? latestExport;
    }, [latestExport, statusQuery.data]);
    const showPermissionDenied = permissionDenied || queryPermissionDenied;

    const handlePermissionDenied = () => {
        setPermissionDenied(true);
        setLiveRegionMessage(DENIED_MESSAGE);
        void queryClient.invalidateQueries({ queryKey: ['user'] });
    };

    useEffect(() => {
        if (queryPermissionDenied) {
            void queryClient.invalidateQueries({ queryKey: ['user'] });
        }
    }, [queryClient, queryPermissionDenied]);

    const createMutation = useCreateExamReportExportMutation({
        onSuccess: () => {
            setPermissionDenied(false);
            setLiveRegionMessage('Exam results PDF export requested.');
            toast.success('Exam results PDF export requested.');
        },
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(getErrorMessage(error, 'Unable to create the PDF export right now.'));
        },
    });

    const retryMutation = useRetryExamReportExportMutation({
        onSuccess: () => {
            setPermissionDenied(false);
            setLiveRegionMessage('Exam results PDF export queued again.');
            toast.success('Exam results PDF export queued again.');
        },
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(getErrorMessage(error, 'Unable to retry the PDF export right now.'));
        },
    });

    const downloadMutation = useExamReportExportDownloadMutation({
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(getErrorMessage(error, 'Unable to download the PDF export right now.'));
        },
    });

    const deleteMutation = useDeleteExamReportExportMutation({
        onSuccess: () => {
            setPermissionDenied(false);
            setLiveRegionMessage('Exam results PDF export deleted.');
            toast.success('Exam results PDF export deleted.');
        },
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(getErrorMessage(error, 'Unable to delete the PDF export right now.'));
        },
    });

    if (!showPermissionDenied && !isLoadingPermissions && !canExport) {
        return null;
    }

    const handleCreate = () => {
        setLiveRegionMessage('Requesting exam results PDF export.');
        createMutation.mutate({
            exam_id: examId,
        });
    };

    const handleRetry = () => {
        if (!activeExport) {
            return;
        }

        setLiveRegionMessage('Retrying exam results PDF export.');
        retryMutation.mutate({
            exportId: activeExport.exportId,
            examId,
            page: 1,
            limit: 1,
        });
    };

    const handleDownload = async () => {
        if (!activeExport) {
            return;
        }

        setLiveRegionMessage('Preparing exam results PDF download.');

        try {
            const response = await downloadMutation.mutateAsync(activeExport.exportId);
            const opened = openSignedDownload(response.downloadUrl);

            if (!opened) {
                toast.error('Your browser blocked the PDF download. Allow pop-ups and try again.');
                return;
            }

            setPermissionDenied(false);
            setLiveRegionMessage('Exam results PDF download opened in a new tab.');
        } catch {
            // Error handling is owned by the mutation onError callback.
        }
    };

    const handleDelete = () => {
        if (!activeExport) {
            return;
        }

        setLiveRegionMessage('Deleting exam results PDF export.');
        deleteMutation.mutate({
            exportId: activeExport.exportId,
            examId,
            page: 1,
            limit: 1,
        });
    };

    return (
        <PdfExportLifecyclePanel
            className="xl:min-w-[27rem]"
            title="Export Results PDF"
            description="Create and manage a PDF export for the complete examination report."
            status={activeExport?.status ?? null}
            statusMessage={
                activeExport?.status === 'READY'
                    ? 'The complete examination report PDF is ready to download.'
                    : null
            }
            failureMessage={activeExport?.failureMessage ?? null}
            liveRegionMessage={liveRegionMessage}
            permissionMessage={showPermissionDenied ? DENIED_MESSAGE : undefined}
            disabled={isLoadingPermissions}
            disabledMessage={
                isLoadingPermissions ? 'Checking export permissions for this examination.' : null
            }
            isCreating={createMutation.isPending}
            isRetrying={retryMutation.isPending}
            isDownloading={downloadMutation.isPending}
            isDeleting={deleteMutation.isPending}
            onCreate={handleCreate}
            onRetry={activeExport ? handleRetry : null}
            onDownload={activeExport ? handleDownload : null}
            onDelete={activeExport ? handleDelete : null}
            createLabel="Export Results PDF"
            retryLabel="Retry Export"
            downloadLabel="Download PDF"
            deleteLabel="Delete Export"
        />
    );
}
