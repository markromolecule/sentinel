'use client';

import { useState } from 'react';
import type { IncidentEvidenceRecord } from '@sentinel/services';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@sentinel/ui';
import { Trash2 } from 'lucide-react';

interface IncidentEvidenceDialogProps {
    evidence: IncidentEvidenceRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canDelete?: boolean;
    onDelete?: (evidence: IncidentEvidenceRecord) => Promise<void> | void;
    isDeleting?: boolean;
}

function formatEvidenceState(state?: string) {
    switch (state) {
        case 'PENDING_UPLOAD':
            return 'Upload pending';
        case 'DELETE_PENDING':
            return 'Deletion pending';
        case 'DELETED':
            return 'Deleted';
        case 'FAILED':
            return 'Unavailable';
        case 'EXPIRED':
            return 'Expired';
        default:
            return 'Available';
    }
}

export function IncidentEvidenceDialog({
    evidence,
    open,
    onOpenChange,
    canDelete = true,
    onDelete,
    isDeleting = false,
}: IncidentEvidenceDialogProps) {
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);

    const canRenderImage = Boolean(evidence?.signedUrl) && evidence?.state === 'AVAILABLE';

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setHasImageError(false);
                    }
                    onOpenChange(nextOpen);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
                    <DialogHeader className="text-left">
                        <DialogTitle>Incident Evidence</DialogTitle>
                        <DialogDescription>
                            Review context captured during the flagged event. Evidence supports
                            review workflow and is not proof of misconduct by itself.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                            <span>Event: {evidence?.eventType ?? 'Unknown'}</span>
                            <span>
                                Captured:{' '}
                                {evidence?.capturedAt
                                    ? new Date(evidence.capturedAt).toLocaleString()
                                    : 'Unavailable'}
                            </span>
                            <span>Status: {formatEvidenceState(evidence?.state)}</span>
                        </div>

                        {canRenderImage && !hasImageError ? (
                            <div className="bg-muted/40 overflow-hidden rounded-xl border">
                                <img
                                    src={evidence?.signedUrl}
                                    alt="Captured exam review context."
                                    className="max-h-[65vh] w-full object-contain"
                                    onError={() => setHasImageError(true)}
                                />
                            </div>
                        ) : (
                            <div className="bg-muted/30 text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">
                                {evidence?.state === 'EXPIRED'
                                    ? 'This evidence has expired and can no longer be displayed.'
                                    : evidence?.state === 'DELETED'
                                      ? 'This evidence was deleted during review.'
                                      : evidence?.state === 'PENDING_UPLOAD'
                                        ? 'This evidence is still being uploaded and is not yet available.'
                                        : 'This evidence is currently unavailable for viewing.'}
                            </div>
                        )}

                        {canDelete && evidence ? (
                            <div className="flex justify-end">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={isDeleting}
                                    onClick={() => setIsDeleteConfirmOpen(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Evidence
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this evidence?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently removes the stored review image and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={async () => {
                                if (!evidence || !onDelete) {
                                    return;
                                }

                                await onDelete(evidence);
                                setIsDeleteConfirmOpen(false);
                                onOpenChange(false);
                            }}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
