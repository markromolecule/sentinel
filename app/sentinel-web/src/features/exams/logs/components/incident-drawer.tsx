'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    Calendar,
    Clock,
    Monitor,
    HardDrive,
    Check,
    X,
    FileText,
    AlertTriangle,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    Button,
    Badge,
    Textarea,
    cn,
} from '@sentinel/ui';
import { useIncidentEvidenceQuery } from '@sentinel/hooks';
import { type ApiIncidentLogItem } from '@sentinel/services';
import { flagLabels } from '@sentinel/shared/constants';
import type { ConfirmIncidentOptions, IncidentLifecycleAction } from '../hooks/use-incident-logs';

interface IncidentDrawerProps {
    incident: ApiIncidentLogItem | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (incidentIds: string[], options: ConfirmIncidentOptions) => Promise<void>;
    onDismiss: (incidentIds: string[], notes: string) => Promise<void>;
    isSubmitting: boolean;
}

function formatElapsedTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatSeverityReason(reason?: string | null) {
    switch (reason) {
        case 'repeat-escalated':
            return 'Repeat escalated';
        case 'forced-override':
            return 'Forced override';
        case 'immediate-high':
            return 'Immediate high';
        case 'threshold-fixed':
            return 'Threshold fixed';
        case 'default-ladder':
            return 'Default ladder';
        default:
            return null;
    }
}

function getOccurrenceCount(incident: ApiIncidentLogItem) {
    const occurrenceCount = incident.details?.occurrenceCount;
    return typeof occurrenceCount === 'number' && occurrenceCount > 0 ? occurrenceCount : 1;
}

function formatSeverityLadder(incident: ApiIncidentLogItem) {
    const ladder = incident.details?.severityInputs?.ladder;
    return Array.isArray(ladder) && ladder.length > 0 ? ladder.join(' -> ') : null;
}

export function IncidentDrawer({
    incident,
    isOpen,
    onClose,
    onConfirm,
    onDismiss,
    isSubmitting,
}: IncidentDrawerProps) {
    const [notes, setNotes] = useState('');
    const [lifecycleAction, setLifecycleAction] = useState<IncidentLifecycleAction | null>(null);
    const [lifecycleNotes, setLifecycleNotes] = useState('');

    useEffect(() => {
        if (incident) {
            setNotes(incident.reviewNotes || '');
            setLifecycleAction(null);
            setLifecycleNotes('');
        } else {
            setNotes('');
            setLifecycleAction(null);
            setLifecycleNotes('');
        }
    }, [incident]);

    const evidenceQuery = useIncidentEvidenceQuery(
        incident?.incidentId,
        Boolean(isOpen && incident && !incident.details?._isGrouped),
    );

    if (!incident) return null;

    const formattedType =
        flagLabels[incident.incidentType as keyof typeof flagLabels] ||
        incident.incidentType.replaceAll('_', ' ');
    const occurrenceCount = getOccurrenceCount(incident);
    const severityReasonLabel = formatSeverityReason(incident.details?.severityReason);
    const severityLadderLabel = formatSeverityLadder(incident);
    const resolvedEvidenceUrl =
        incident.evidenceUrl ??
        evidenceQuery.data?.find((item) => item.state === 'AVAILABLE' && item.signedUrl)
            ?.signedUrl ??
        null;

    const handleConfirm = () => {
        const lifecycleReasonCode =
            lifecycleAction === 'LOCK_ATTEMPT'
                ? 'CONFIRMED_INCIDENT_LOCK'
                : lifecycleAction === 'CLOSE_ATTEMPT'
                  ? 'CONFIRMED_INCIDENT_CLOSE'
                  : null;
        const confirmOptions: ConfirmIncidentOptions = {
            reviewNotes: notes,
            lifecycleAction: lifecycleAction ?? undefined,
            reasonCode: lifecycleReasonCode,
            notes: lifecycleAction ? lifecycleNotes || notes : undefined,
        };

        if (incident.details?._isGrouped && incident.details?._incidents) {
            const ids = incident.details._incidents.map((i: any) => i.incidentId);
            void onConfirm(ids, confirmOptions);
        } else {
            void onConfirm([incident.incidentId], confirmOptions);
        }
    };

    const handleDismiss = () => {
        if (incident.details?._isGrouped && incident.details?._incidents) {
            const ids = incident.details._incidents.map((i: any) => i.incidentId);
            void onDismiss(ids, notes);
        } else {
            void onDismiss([incident.incidentId], notes);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="bg-card border-border scrollbar-none flex h-full flex-col overflow-y-auto border-l p-6 sm:max-w-md">
                <SheetHeader className="mb-6">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        <span>
                            {incident.details?._isGrouped
                                ? 'Student Alert compilation'
                                : 'Incident Details'}
                        </span>
                    </div>
                    <SheetTitle className="text-foreground mt-2 text-xl font-bold">
                        {incident.details?._isGrouped ? 'Proctoring Log Summary' : formattedType}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground mt-1 text-sm">
                        Recorded for {incident.studentName || 'Unknown Student'} (
                        {incident.studentNo || 'No ID'})
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-6">
                    {/* Severity & Status Badges */}
                    <div className="flex flex-wrap gap-2.5">
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Severity
                            </span>
                            <Badge
                                variant="outline"
                                className={
                                    incident.severity === 'HIGH'
                                        ? 'border-red-200 bg-red-50 font-bold text-red-700 uppercase dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
                                        : incident.severity === 'MEDIUM'
                                          ? 'border-amber-200 bg-amber-50 font-bold text-amber-700 uppercase dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
                                          : 'border-blue-200 bg-blue-50 font-bold text-blue-700 uppercase dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400'
                                }
                            >
                                {incident.severity || 'LOW'}
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Occurrences
                            </span>
                            <Badge
                                variant="outline"
                                className="border-border bg-muted/40 text-foreground font-bold uppercase"
                            >
                                {occurrenceCount}
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Review Status
                            </span>
                            <Badge
                                variant="outline"
                                className={
                                    incident.status === 'CONFIRMED'
                                        ? 'border-red-200 bg-red-50 font-bold text-red-700 uppercase dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
                                        : incident.status === 'DISMISSED'
                                          ? 'border-slate-200 bg-slate-50 font-bold text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400'
                                          : 'border-yellow-200 bg-yellow-50 font-bold text-yellow-700 uppercase dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-400'
                                }
                            >
                                {incident.status === 'PENDING' ? 'Needs Review' : incident.status}
                            </Badge>
                        </div>
                    </div>

                    {(severityReasonLabel || severityLadderLabel) && (
                        <div className="border-border bg-muted/20 grid gap-3 rounded-md border p-4 text-xs">
                            {severityReasonLabel ? (
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground font-bold tracking-wider uppercase">
                                        Severity Reason
                                    </span>
                                    <span className="text-foreground text-right font-semibold">
                                        {severityReasonLabel}
                                    </span>
                                </div>
                            ) : null}
                            {severityLadderLabel ? (
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground font-bold tracking-wider uppercase">
                                        Severity Ladder
                                    </span>
                                    <span className="text-foreground text-right font-semibold">
                                        {severityLadderLabel}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Grouped Incidents List vs Single Telemetry view */}
                    {incident.details?._isGrouped && incident.details?._incidents ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                    Alerts List ({incident.details._incidentCount})
                                </h4>
                                <Badge
                                    variant="outline"
                                    className="bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold uppercase"
                                >
                                    Compiled View
                                </Badge>
                            </div>

                            <div className="max-h-[350px] space-y-3 overflow-y-auto pr-1">
                                {incident.details._incidents.map(
                                    (inc: ApiIncidentLogItem, index: number) => {
                                        const incTypeFormatted =
                                            flagLabels[
                                                inc.incidentType as keyof typeof flagLabels
                                            ] || inc.incidentType.replaceAll('_', ' ');
                                        const incOccurrenceCount = getOccurrenceCount(inc);
                                        const incSeverityReasonLabel = formatSeverityReason(
                                            inc.details?.severityReason,
                                        );
                                        return (
                                            <div
                                                key={inc.incidentId || index}
                                                className={cn(
                                                    'bg-muted/10 border-border/80 space-y-2 rounded-md border p-3',
                                                    inc.severity === 'HIGH'
                                                        ? 'border-l-4 border-l-red-500'
                                                        : inc.severity === 'MEDIUM'
                                                          ? 'border-l-4 border-l-amber-500'
                                                          : 'border-l-4 border-l-blue-500',
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-foreground flex items-center gap-1.5 truncate text-sm font-semibold">
                                                            {inc.severity === 'HIGH' && (
                                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                                            )}
                                                            <span className="truncate">
                                                                {incTypeFormatted}
                                                            </span>
                                                        </div>
                                                        <div className="text-muted-foreground mt-0.5 truncate font-mono text-[10px] uppercase">
                                                            {inc.ruleKey || 'NO_RULE_KEY'}
                                                        </div>
                                                        <div className="text-muted-foreground mt-1 flex flex-wrap gap-1 text-[10px] font-semibold uppercase">
                                                            <span>x{incOccurrenceCount}</span>
                                                            {incSeverityReasonLabel ? (
                                                                <span>
                                                                    {incSeverityReasonLabel}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'shrink-0 px-1.5 py-0 text-[9px] font-bold uppercase',
                                                            inc.status === 'CONFIRMED'
                                                                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
                                                                : inc.status === 'DISMISSED'
                                                                  ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400'
                                                                  : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-400',
                                                        )}
                                                    >
                                                        {inc.status === 'PENDING'
                                                            ? 'Needs Review'
                                                            : inc.status}
                                                    </Badge>
                                                </div>

                                                <div className="text-muted-foreground border-border/40 flex items-center justify-between border-t pt-1 text-[11px]">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="text-primary h-3 w-3" />
                                                        <span>
                                                            {formatElapsedTime(inc.elapsedSeconds)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        {inc.timestamp
                                                            ? new Date(
                                                                  inc.timestamp,
                                                              ).toLocaleTimeString([], {
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              })
                                                            : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Telemetry Details */}
                            <div className="border-border bg-muted/20 space-y-3.5 rounded-md border p-4">
                                <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                    Telemetry Info
                                </h4>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            {incident.timestamp
                                                ? new Date(incident.timestamp).toLocaleDateString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            {incident.timestamp
                                                ? new Date(incident.timestamp).toLocaleTimeString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <Monitor className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            {incident.platform || 'WEB'} Client
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <HardDrive className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            Source: {incident.source || 'CLIENT'}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-border/60 flex flex-col gap-1 border-t pt-3">
                                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                        Relative Timestamp
                                    </span>
                                    <div className="text-foreground flex items-center gap-1.5 text-sm font-semibold">
                                        <Clock className="text-primary h-4 w-4 shrink-0" />
                                        <span>
                                            {formatElapsedTime(incident.elapsedSeconds)} elapsed
                                        </span>
                                    </div>
                                </div>

                                {incident.ruleKey && (
                                    <div className="border-border/60 flex flex-col gap-1 border-t pt-3">
                                        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                            Rule Key
                                        </span>
                                        <span className="text-foreground truncate font-mono text-xs font-bold uppercase">
                                            {incident.ruleKey}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Snapshot Evidence */}
                            {(resolvedEvidenceUrl || evidenceQuery.isLoading) && (
                                <div className="space-y-2">
                                    <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                        Evidence Snapshot
                                    </h4>
                                    {resolvedEvidenceUrl ? (
                                        <div className="border-border bg-muted group relative flex aspect-video items-center justify-center overflow-hidden rounded-md border">
                                            <img
                                                src={resolvedEvidenceUrl}
                                                alt="Incident Evidence Snapshot"
                                                className="h-full max-h-[200px] w-full object-cover"
                                                onError={(e) => {
                                                    // If image fails to load, render placeholder
                                                    e.currentTarget.style.display = 'none';
                                                    const sibling = e.currentTarget
                                                        .nextElementSibling as HTMLElement;
                                                    if (sibling) sibling.style.display = 'flex';
                                                }}
                                            />
                                            <div className="text-muted-foreground bg-muted/60 absolute inset-0 hidden flex-col items-center justify-center p-4 text-center select-none">
                                                <AlertTriangle className="text-muted-foreground mb-1.5 h-6 w-6" />
                                                <span className="text-xs font-semibold">
                                                    Evidence frame unavailable
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-border bg-muted/20 text-muted-foreground flex min-h-28 items-center justify-center rounded-md border border-dashed px-4 py-6 text-center text-sm">
                                            Loading linked evidence...
                                        </div>
                                    )}
                                </div>
                            )}

                            {!resolvedEvidenceUrl &&
                            !evidenceQuery.isLoading &&
                            !evidenceQuery.isError ? (
                                <div className="space-y-2">
                                    <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                        Evidence Snapshot
                                    </h4>
                                    <div className="border-border bg-muted/20 text-muted-foreground flex min-h-28 items-center justify-center rounded-md border border-dashed px-4 py-6 text-center text-sm">
                                        No evidence frame is available for this incident.
                                    </div>
                                </div>
                            ) : null}

                            {/* Raw details display */}
                            {incident.details &&
                                typeof incident.details === 'object' &&
                                Object.keys(incident.details).length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                            Technical Context
                                        </h4>
                                        <div className="border-border/80 bg-muted/40 text-muted-foreground max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-3.5 font-mono text-[11px]">
                                            {Object.entries(incident.details).map(([key, val]) => (
                                                <div
                                                    key={key}
                                                    className="border-border/40 flex justify-between border-b pb-1 last:border-0 last:pb-0"
                                                >
                                                    <span className="text-foreground mr-2 shrink-0 font-semibold">
                                                        {key}:
                                                    </span>
                                                    <span
                                                        className="max-w-[240px] truncate"
                                                        title={String(val)}
                                                    >
                                                        {String(val)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </>
                    )}

                    {/* Review Notes Input */}
                    <div className="space-y-2">
                        <label className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Review Notes</span>
                        </label>
                        <Textarea
                            placeholder="Add administrative notes regarding this incident review..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[100px] resize-none rounded-md text-sm"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-foreground text-xs font-bold tracking-wider uppercase">
                            After Confirm
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => setLifecycleAction(null)}
                                className={cn(
                                    'justify-start rounded-md text-left',
                                    lifecycleAction === null && 'border-primary text-primary',
                                )}
                            >
                                Confirm only
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => setLifecycleAction('LOCK_ATTEMPT')}
                                className={cn(
                                    'justify-start rounded-md text-left',
                                    lifecycleAction === 'LOCK_ATTEMPT' &&
                                        'border-primary text-primary',
                                )}
                            >
                                Confirm and lock attempt
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => setLifecycleAction('CLOSE_ATTEMPT')}
                                className={cn(
                                    'justify-start rounded-md text-left',
                                    lifecycleAction === 'CLOSE_ATTEMPT' &&
                                        'border-primary text-primary',
                                )}
                            >
                                Confirm and close attempt
                            </Button>
                        </div>

                        {lifecycleAction ? (
                            <Textarea
                                placeholder="Add follow-up notes for the attempt lifecycle action..."
                                value={lifecycleNotes}
                                onChange={(e) => setLifecycleNotes(e.target.value)}
                                className="min-h-[88px] resize-none rounded-md text-sm"
                                disabled={isSubmitting}
                            />
                        ) : null}
                    </div>
                </div>

                {/* Confirm/Dismiss actions */}
                <div className="border-border mt-6 flex gap-3 border-t pt-4">
                    <Button
                        onClick={handleDismiss}
                        disabled={isSubmitting}
                        variant="outline"
                        className="h-10 flex-1 gap-2 rounded-md border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                    >
                        <X className="h-4 w-4" />
                        Dismiss
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="h-10 flex-1 gap-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                        <Check className="h-4 w-4" />
                        Confirm Violation
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
