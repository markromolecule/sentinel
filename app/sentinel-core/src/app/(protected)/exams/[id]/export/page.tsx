'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
    getErrorMessage,
    getPermissionDeniedMessage,
    isPermissionDeniedError,
    useActivePermissions,
    useAnswerKeyExportDownloadMutation,
    useAnswerKeyExportStatusQuery,
    useAnswerKeyExportsQuery,
    useCreateAnswerKeyExportMutation,
    useDeleteAnswerKeyExportMutation,
    useRetryAnswerKeyExportMutation,
} from '@sentinel/hooks';
import type { ExamAnswerKeyExportRecord } from '@sentinel/services';
import { Button, PdfExportLifecyclePanel } from '@sentinel/ui';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const EXPORT_PERMISSION = 'examinations:export_answer_key';

const DENIED_MESSAGE = getPermissionDeniedMessage({
    resourceName: 'examination answer key PDF',
    action: 'export',
    actionLabel: 'export this examination answer key PDF',
});

function openSignedDownload(downloadUrl: string) {
    if (typeof window === 'undefined') {
        return false;
    }

    const popup = window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    return popup !== null;
}

export default function ExamExportPage() {
    const params = useParams<{ id: string }>();
    const examId = params.id;
    const queryClient = useQueryClient();
    const { hasPermission, isLoading: isLoadingPermissions } = useActivePermissions();
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [liveRegionMessage, setLiveRegionMessage] = useState<string | null>(null);
    const canExport = hasPermission(EXPORT_PERMISSION);

    const exportsQuery = useAnswerKeyExportsQuery({
        payload: {
            examId,
            page: 1,
            limit: 1,
        },
        enabled: canExport,
    });

    const latestExport = exportsQuery.data?.records[0] ?? null;

    const statusQuery = useAnswerKeyExportStatusQuery(latestExport?.exportId, {
        enabled: canExport && Boolean(latestExport?.exportId),
    });

    const queryPermissionDenied = Boolean(
        (exportsQuery.error && isPermissionDeniedError(exportsQuery.error, EXPORT_PERMISSION)) ||
        (statusQuery.error && isPermissionDeniedError(statusQuery.error, EXPORT_PERMISSION)),
    );

    const activeExport = useMemo<ExamAnswerKeyExportRecord | null>(() => {
        return statusQuery.data ?? latestExport;
    }, [latestExport, statusQuery.data]);
    const showPermissionDenied =
        permissionDenied || queryPermissionDenied || (!isLoadingPermissions && !canExport);

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

    const createMutation = useCreateAnswerKeyExportMutation({
        onSuccess: () => {
            setPermissionDenied(false);
            setLiveRegionMessage('Examination answer key PDF export requested.');
            toast.success('Examination answer key PDF export requested.');
        },
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(
                getErrorMessage(error, 'Unable to create the answer key PDF export right now.'),
            );
        },
    });

    const retryMutation = useRetryAnswerKeyExportMutation({
        onSuccess: () => {
            setPermissionDenied(false);
            setLiveRegionMessage('Examination answer key PDF export queued again.');
            toast.success('Examination answer key PDF export queued again.');
        },
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(
                getErrorMessage(error, 'Unable to retry the answer key PDF export right now.'),
            );
        },
    });

    const downloadMutation = useAnswerKeyExportDownloadMutation({
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(
                getErrorMessage(error, 'Unable to download the answer key PDF export right now.'),
            );
        },
    });

    const deleteMutation = useDeleteAnswerKeyExportMutation({
        onSuccess: () => {
            setPermissionDenied(false);
            setLiveRegionMessage('Examination answer key PDF export deleted.');
            toast.success('Examination answer key PDF export deleted.');
        },
        onError: (error) => {
            if (isPermissionDeniedError(error, EXPORT_PERMISSION)) {
                handlePermissionDenied();
                toast.error(DENIED_MESSAGE);
                return;
            }

            toast.error(
                getErrorMessage(error, 'Unable to delete the answer key PDF export right now.'),
            );
        },
    });

    const handleCreate = () => {
        setLiveRegionMessage('Requesting examination answer key PDF export.');
        createMutation.mutate({
            exam_id: examId,
        });
    };

    const handleRetry = () => {
        if (!activeExport) {
            return;
        }

        setLiveRegionMessage('Retrying examination answer key PDF export.');
        retryMutation.mutate({
            exportId: activeExport.exportId,
            institutionId: activeExport.institutionId,
            examId,
        });
    };

    const handleDownload = async () => {
        if (!activeExport) {
            return;
        }

        setLiveRegionMessage('Preparing examination answer key PDF download.');

        try {
            const response = await downloadMutation.mutateAsync(activeExport.exportId);
            const opened = openSignedDownload(response.downloadUrl);

            if (!opened) {
                toast.error('Your browser blocked the PDF download. Allow pop-ups and try again.');
                return;
            }

            setPermissionDenied(false);
            setLiveRegionMessage('Examination answer key PDF download opened in a new tab.');
        } catch {
            // Error handling is owned by the mutation onError callback.
        }
    };

    const handleDelete = () => {
        if (!activeExport) {
            return;
        }

        setLiveRegionMessage('Deleting examination answer key PDF export.');
        deleteMutation.mutate({
            exportId: activeExport.exportId,
            institutionId: activeExport.institutionId,
            examId,
        });
    };

    const apiError = exportsQuery.error && !queryPermissionDenied ? exportsQuery.error : null;

    return (
        <main className="bg-muted/30 min-h-screen px-4 py-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <Button asChild variant="ghost" className="w-fit">
                    <Link href="/exams">
                        <ArrowLeft className="mr-2 size-4" />
                        Back to Exams
                    </Link>
                </Button>

                <div>
                    <h1 className="text-2xl font-semibold tracking-normal">
                        Examination Answer Key PDF
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Create, retry, download, or delete the server-rendered answer key export.
                    </p>
                </div>

                {apiError ? (
                    <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-4 text-sm">
                        {getErrorMessage(apiError, 'Unable to load answer key PDF exports.')}
                    </div>
                ) : null}

                <PdfExportLifecyclePanel
                    title="Examination Answer Key PDF"
                    description="Manage the canonical PDF export generated by the answer-key service."
                    status={activeExport?.status ?? null}
                    statusMessage={
                        activeExport?.status === 'READY'
                            ? 'The examination answer key PDF is ready to download.'
                            : null
                    }
                    failureMessage={activeExport?.failureMessage ?? null}
                    liveRegionMessage={liveRegionMessage}
                    permissionMessage={showPermissionDenied ? DENIED_MESSAGE : undefined}
                    disabled={isLoadingPermissions || exportsQuery.isLoading}
                    disabledMessage={
                        isLoadingPermissions
                            ? 'Checking export permissions for this examination.'
                            : exportsQuery.isLoading
                              ? 'Loading answer key PDF export status.'
                              : null
                    }
                    isCreating={createMutation.isPending}
                    isRetrying={retryMutation.isPending}
                    isDownloading={downloadMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                    onCreate={canExport || showPermissionDenied ? handleCreate : null}
                    onRetry={activeExport ? handleRetry : null}
                    onDownload={activeExport ? handleDownload : null}
                    onDelete={activeExport ? handleDelete : null}
                    createLabel="Create Answer Key PDF"
                    retryLabel="Retry Export"
                    downloadLabel="Download PDF"
                    deleteLabel="Delete Export"
                />
            </div>
        </main>
    );
}
