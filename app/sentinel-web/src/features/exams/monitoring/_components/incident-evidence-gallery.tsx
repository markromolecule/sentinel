'use client';

import { useMemo, useState } from 'react';
import {
    useDeleteIncidentEvidenceMutation,
    useIncidentEvidenceQuery,
} from '@sentinel/hooks';
import type { IncidentEvidenceRecord } from '@sentinel/services';
import type { Flag } from '@sentinel/shared/types';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@sentinel/ui';
import { ChevronDown, Eye, ImageOff, Loader2 } from 'lucide-react';
import { IncidentEvidenceDialog } from './incident-evidence-dialog';

interface IncidentEvidenceGalleryProps {
    flag: Flag;
    examId: string;
    studentId: string;
    canDelete?: boolean;
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

function getStateTone(state?: string) {
    switch (state) {
        case 'AVAILABLE':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'PENDING_UPLOAD':
            return 'border-amber-200 bg-amber-50 text-amber-700';
        case 'DELETE_PENDING':
            return 'border-orange-200 bg-orange-50 text-orange-700';
        case 'DELETED':
            return 'border-slate-200 bg-slate-100 text-slate-600';
        case 'EXPIRED':
            return 'border-rose-200 bg-rose-50 text-rose-700';
        default:
            return 'border-slate-200 bg-slate-50 text-slate-700';
    }
}

export function IncidentEvidenceGallery({
    flag,
    examId,
    studentId,
    canDelete = true,
}: IncidentEvidenceGalleryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState<IncidentEvidenceRecord | null>(null);
    const [thumbnailFailures, setThumbnailFailures] = useState<Record<string, boolean>>({});

    const evidenceQuery = useIncidentEvidenceQuery(flag.id, isOpen && (flag.evidenceCount ?? 0) > 0);
    const deleteEvidenceMutation = useDeleteIncidentEvidenceMutation();

    const fallbackEvidence = useMemo<IncidentEvidenceRecord[]>(
        () =>
            flag.evidenceUrl
                ? [
                      {
                          evidenceId: `legacy-${flag.id}`,
                          attemptId: '',
                          incidentId: flag.id,
                          eventId: `legacy-${flag.id}`,
                          eventType: flag.rawEventType ?? flag.type,
                          capturedAt: flag.timestamp,
                          state: 'AVAILABLE',
                          expiresAt: flag.timestamp,
                          signedUrl: flag.evidenceUrl ?? undefined,
                      },
                  ]
                : [],
        [flag.evidenceUrl, flag.id, flag.rawEventType, flag.timestamp, flag.type],
    );

    const evidenceItems = evidenceQuery.data?.length ? evidenceQuery.data : fallbackEvidence;
    const totalCount = Math.max(flag.evidenceCount ?? 0, evidenceItems.length);
    const stateSummary = flag.evidenceStates ?? (flag.evidenceUrl ? ['AVAILABLE'] : []);

    if (totalCount === 0 && !flag.evidenceUrl) {
        return null;
    }

    return (
        <div id={`incident-evidence-${flag.id}`} className="mt-4 rounded-xl border border-dashed">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-foreground hover:bg-muted flex h-auto w-full items-center justify-between rounded-xl px-4 py-3"
                    >
                        <div className="text-left">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Eye className="h-4 w-4" />
                                View Evidence
                                <span className="text-muted-foreground text-xs font-medium">
                                    {totalCount} item{totalCount === 1 ? '' : 's'}
                                </span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                Expand to load review images and evidence states for this incident.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {stateSummary.map((state) => (
                                <span
                                    key={state}
                                    className={cn(
                                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                                        getStateTone(state),
                                    )}
                                >
                                    {formatEvidenceState(state)}
                                </span>
                            ))}
                            <ChevronDown
                                className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                            />
                        </div>
                    </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3 px-4 pb-4">
                    {evidenceQuery.isLoading ? (
                        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border bg-white/60 px-3 py-4 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading signed evidence URLs...
                        </div>
                    ) : null}

                    {evidenceQuery.isError ? (
                        <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-sm">
                            Evidence could not be loaded right now. Try refreshing this student
                            detail.
                        </div>
                    ) : null}

                    {evidenceItems.map((evidence, index) => {
                        const hasThumbnailError = thumbnailFailures[evidence.evidenceId];
                        const canPreview = Boolean(evidence.signedUrl) && evidence.state === 'AVAILABLE';

                        return (
                            <div
                                key={evidence.evidenceId}
                                className="bg-background flex flex-col gap-3 rounded-xl border p-3 md:flex-row"
                            >
                                <button
                                    type="button"
                                    className="bg-muted/40 flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border md:w-56"
                                    disabled={!canPreview}
                                    onClick={() => setSelectedEvidence(evidence)}
                                >
                                    {canPreview && !hasThumbnailError ? (
                                        <img
                                            src={evidence.signedUrl}
                                            alt="Thumbnail of captured exam review context."
                                            className="h-full w-full object-cover"
                                            onError={() =>
                                                setThumbnailFailures((current) => ({
                                                    ...current,
                                                    [evidence.evidenceId]: true,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <div className="text-muted-foreground flex flex-col items-center gap-2 text-xs">
                                            <ImageOff className="h-5 w-5" />
                                            {formatEvidenceState(evidence.state)}
                                        </div>
                                    )}
                                </button>

                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold">
                                            Evidence {index + 1} of {Math.max(totalCount, evidenceItems.length)}
                                        </span>
                                        <span
                                            className={cn(
                                                'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                                                getStateTone(evidence.state),
                                            )}
                                        >
                                            {formatEvidenceState(evidence.state)}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        Event {evidence.eventType} captured on{' '}
                                        {new Date(evidence.capturedAt).toLocaleString()}.
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        Use this image as review context for the event timeline, not
                                        as standalone proof of misconduct.
                                    </p>
                                    {canPreview ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => setSelectedEvidence(evidence)}
                                        >
                                            <Eye className="mr-2 h-3.5 w-3.5" />
                                            Open Full Image
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </CollapsibleContent>
            </Collapsible>

            <IncidentEvidenceDialog
                evidence={selectedEvidence}
                open={Boolean(selectedEvidence)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedEvidence(null);
                    }
                }}
                canDelete={canDelete && !selectedEvidence?.evidenceId.startsWith('legacy-')}
                isDeleting={deleteEvidenceMutation.isPending}
                onDelete={async (evidence) => {
                    await deleteEvidenceMutation.mutateAsync({
                        evidenceId: evidence.evidenceId,
                        incidentId: flag.id,
                        examId,
                        studentId,
                    });
                }}
            />
        </div>
    );
}
