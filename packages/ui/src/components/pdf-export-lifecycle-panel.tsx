'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Clock3, Download, RefreshCcw, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { VisuallyHidden } from './ui/visually-hidden';
import { cn } from '../lib/utils';

export type PdfExportLifecycleStatus = 'PENDING' | 'GENERATING' | 'READY' | 'FAILED' | 'EXPIRED';

/**
 * Controlled props for the reusable PDF export lifecycle panel.
 */
export interface PdfExportLifecyclePanelProps {
    /** Optional heading shown above the lifecycle state and actions. */
    title?: string;
    /** Optional supporting text rendered below the heading. */
    description?: string;
    /** Current export lifecycle status, or null when no export has been requested yet. */
    status?: PdfExportLifecycleStatus | null;
    /** Optional override for the status copy shown in the body and live region. */
    statusMessage?: string | null;
    /** Optional failure message displayed when the export has failed. */
    failureMessage?: string | null;
    /** Optional message announced through an aria-live region. */
    liveRegionMessage?: string | null;
    /** Disables the primary lifecycle actions. */
    disabled?: boolean;
    /** Optional copy explaining why actions are disabled. */
    disabledMessage?: string | null;
    /** Optional permission copy rendered when the viewer lacks access. */
    permissionMessage?: string | null;
    /** Indicates a create request is in flight. */
    isCreating?: boolean;
    /** Indicates a retry request is in flight. */
    isRetrying?: boolean;
    /** Indicates a download request is in flight. */
    isDownloading?: boolean;
    /** Indicates a delete request is in flight. */
    isDeleting?: boolean;
    /** Optional create action handler. */
    onCreate?: (() => void) | null;
    /** Optional retry action handler. */
    onRetry?: (() => void) | null;
    /** Optional download action handler. */
    onDownload?: (() => void) | null;
    /** Optional delete action handler. */
    onDelete?: (() => void) | null;
    /** Accessible label for the create action. */
    createLabel?: string;
    /** Accessible label for the retry action. */
    retryLabel?: string;
    /** Accessible label for the download action. */
    downloadLabel?: string;
    /** Accessible label for the delete action. */
    deleteLabel?: string;
    /** Optional className for layout customization by consuming apps. */
    className?: string;
}

const STATUS_COPY: Record<PdfExportLifecycleStatus, string> = {
    PENDING: 'Export request received. Generation will start shortly.',
    GENERATING: 'PDF generation is in progress.',
    READY: 'Your PDF export is ready to download.',
    FAILED: 'The export failed. Retry to generate a fresh PDF.',
    EXPIRED: 'This export has expired. Create a new export to download another PDF.',
};

const STATUS_LABELS: Record<PdfExportLifecycleStatus, string> = {
    PENDING: 'Pending',
    GENERATING: 'Generating',
    READY: 'Ready',
    FAILED: 'Failed',
    EXPIRED: 'Expired',
};

const STATUS_BADGE_VARIANTS: Record<
    PdfExportLifecycleStatus,
    'secondary' | 'default' | 'destructive' | 'outline'
> = {
    PENDING: 'secondary',
    GENERATING: 'secondary',
    READY: 'default',
    FAILED: 'destructive',
    EXPIRED: 'outline',
};

function invokeFromKeyboard(
    event: React.KeyboardEvent<HTMLButtonElement>,
    action?: (() => void) | null,
    disabled?: boolean,
) {
    if (disabled || !action) {
        return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
    }
}

/**
 * Shared presentational panel for create, poll, retry, download, and delete PDF export flows.
 */
export function PdfExportLifecyclePanel({
    title = 'PDF export',
    description = 'Create and manage a PDF export for the current record.',
    status = null,
    statusMessage,
    failureMessage,
    liveRegionMessage,
    disabled = false,
    disabledMessage,
    permissionMessage,
    isCreating = false,
    isRetrying = false,
    isDownloading = false,
    isDeleting = false,
    onCreate,
    onRetry,
    onDownload,
    onDelete,
    createLabel = 'Create PDF export',
    retryLabel = 'Retry PDF export',
    downloadLabel = 'Download PDF export',
    deleteLabel = 'Delete PDF export',
    className,
}: PdfExportLifecyclePanelProps) {
    const resolvedStatusMessage = status ? (statusMessage ?? STATUS_COPY[status]) : statusMessage;
    const liveMessage =
        liveRegionMessage ?? resolvedStatusMessage ?? permissionMessage ?? disabledMessage;
    const actionsDisabled = disabled || Boolean(permissionMessage);
    const showRetry = status === 'FAILED' && Boolean(onRetry);
    const showDownload = status === 'READY' && Boolean(onDownload);
    const showDelete = Boolean(status && onDelete);
    const showCreate = Boolean(onCreate);
    const failureCopy = failureMessage ?? resolvedStatusMessage;

    return (
        <Card className={cn('gap-4', className)}>
            <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {status ? (
                        <Badge variant={STATUS_BADGE_VARIANTS[status]}>
                            {STATUS_LABELS[status]}
                        </Badge>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <VisuallyHidden aria-live="polite" aria-atomic="true">
                    {liveMessage ?? 'PDF export panel ready.'}
                </VisuallyHidden>

                {permissionMessage ? (
                    <Alert variant="destructive">
                        <AlertCircle />
                        <AlertTitle>Permission required</AlertTitle>
                        <AlertDescription>{permissionMessage}</AlertDescription>
                    </Alert>
                ) : null}

                {!permissionMessage && disabledMessage ? (
                    <Alert>
                        <Clock3 />
                        <AlertTitle>Actions unavailable</AlertTitle>
                        <AlertDescription>{disabledMessage}</AlertDescription>
                    </Alert>
                ) : null}

                {status ? (
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 rounded-lg border p-4">
                            {status === 'READY' ? (
                                <CheckCircle2
                                    className="mt-0.5 size-4 text-emerald-600"
                                    aria-hidden="true"
                                />
                            ) : status === 'FAILED' || status === 'EXPIRED' ? (
                                <AlertCircle
                                    className="text-destructive mt-0.5 size-4"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Clock3
                                    className="text-muted-foreground mt-0.5 size-4"
                                    aria-hidden="true"
                                />
                            )}
                            <div className="space-y-1">
                                <p className="text-sm font-medium">{STATUS_LABELS[status]}</p>
                                <p className="text-muted-foreground text-sm">
                                    {status === 'FAILED' ? failureCopy : resolvedStatusMessage}
                                </p>
                            </div>
                        </div>
                        <Separator />
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        No export has been created for this item yet.
                    </p>
                )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
                {showCreate ? (
                    <Button
                        type="button"
                        onClick={onCreate ?? undefined}
                        onKeyDown={(event) =>
                            invokeFromKeyboard(event, onCreate, actionsDisabled || isCreating)
                        }
                        disabled={actionsDisabled || isCreating}
                        aria-label={createLabel}
                    >
                        {isCreating ? 'Creating…' : createLabel}
                    </Button>
                ) : null}

                {showRetry ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onRetry ?? undefined}
                        onKeyDown={(event) =>
                            invokeFromKeyboard(event, onRetry, actionsDisabled || isRetrying)
                        }
                        disabled={actionsDisabled || isRetrying}
                        aria-label={retryLabel}
                    >
                        <RefreshCcw aria-hidden="true" />
                        {isRetrying ? 'Retrying…' : retryLabel}
                    </Button>
                ) : null}

                {showDownload ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onDownload ?? undefined}
                        onKeyDown={(event) =>
                            invokeFromKeyboard(event, onDownload, actionsDisabled || isDownloading)
                        }
                        disabled={actionsDisabled || isDownloading}
                        aria-label={downloadLabel}
                    >
                        <Download aria-hidden="true" />
                        {isDownloading ? 'Preparing download…' : downloadLabel}
                    </Button>
                ) : null}

                {showDelete ? (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onDelete ?? undefined}
                        onKeyDown={(event) =>
                            invokeFromKeyboard(event, onDelete, actionsDisabled || isDeleting)
                        }
                        disabled={actionsDisabled || isDeleting}
                        aria-label={deleteLabel}
                    >
                        <Trash2 aria-hidden="true" />
                        {isDeleting ? 'Deleting…' : deleteLabel}
                    </Button>
                ) : null}
            </CardFooter>
        </Card>
    );
}
