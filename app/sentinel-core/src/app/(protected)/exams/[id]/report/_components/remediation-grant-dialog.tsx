'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
} from '@sentinel/ui';

interface RemediationGrantDialogProps {
    isOpen: boolean;
    onClose: () => void;
    item?: ExamReportActionItem | null;
    items?: ExamReportActionItem[];
    overrideType: 'MAKEUP' | 'RETAKE' | null;
    onConfirm: (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        type: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => Promise<void>;
    isLoading: boolean;
}

export function RemediationGrantDialog({
    isOpen,
    onClose,
    item,
    items,
    overrideType,
    onConfirm,
    isLoading,
}: RemediationGrantDialogProps) {
    const [availableFrom, setAvailableFrom] = useState('');
    const [availableUntil, setAvailableUntil] = useState('');
    const [notes, setNotes] = useState('');

    const targetStudents = useMemo(() => {
        if (items && items.length > 0) return items;
        if (item) return [item];
        return [];
    }, [items, item]);

    const isBatch = targetStudents.length > 1;

    useEffect(() => {
        if (isOpen && targetStudents.length > 0) {
            const now = new Date();
            const formatDateTimeLocal = (date: Date) => {
                const pad = (num: number) => String(num).padStart(2, '0');
                const yyyy = date.getFullYear();
                const mm = pad(date.getMonth() + 1);
                const dd = pad(date.getDate());
                const hh = pad(date.getHours());
                const min = pad(date.getMinutes());
                return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
            };

            setAvailableFrom(formatDateTimeLocal(now));
            // default to 2 hours (120 minutes) duration
            setAvailableUntil(formatDateTimeLocal(new Date(now.getTime() + 120 * 60_000)));
            setNotes(
                overrideType === 'MAKEUP'
                    ? isBatch
                        ? `Approved batch makeup window for ${targetStudents.length} students.`
                        : 'Approved makeup window.'
                    : isBatch
                      ? `Approved batch retake window for ${targetStudents.length} students.`
                      : 'Approved retake window.',
            );
        }
    }, [isOpen, targetStudents.length, isBatch, overrideType]);

    if (targetStudents.length === 0 || !overrideType) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const fromDate = new Date(availableFrom);
        const untilDate = new Date(availableUntil);

        if (
            Number.isNaN(fromDate.getTime()) ||
            Number.isNaN(untilDate.getTime()) ||
            fromDate >= untilDate
        ) {
            return;
        }

        const payloadTarget = items && items.length > 0 ? items : targetStudents[0]!;

        await onConfirm(
            payloadTarget,
            overrideType,
            fromDate.toISOString(),
            untilDate.toISOString(),
            notes.trim() ? notes.trim() : null,
        );
        onClose();
    };

    const label = overrideType === 'MAKEUP' ? 'Makeup' : 'Retake';
    const singleStudent = targetStudents[0];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isBatch
                                ? `Setup Scheduled ${label} (${targetStudents.length} Students)`
                                : `Setup Scheduled ${label}`}
                        </DialogTitle>
                        <DialogDescription>
                            {isBatch
                                ? `Schedule cloned remediation exams with a shared window for the ${targetStudents.length} selected students.`
                                : `Schedule a cloned remediation exam with the same questions for ${singleStudent?.firstName} ${singleStudent?.lastName} (${singleStudent?.studentNo}).`}
                        </DialogDescription>
                    </DialogHeader>

                    {isBatch && (
                        <div className="rounded-md border border-border/70 bg-muted/30 p-2.5 text-xs">
                            <div className="text-muted-foreground mb-1.5 font-medium">
                                Selected Candidates ({targetStudents.length}):
                            </div>
                            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                                {targetStudents.map((s) => (
                                    <span
                                        key={s.studentId}
                                        className="bg-background border-border/60 text-foreground inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium"
                                    >
                                        {s.lastName}, {s.firstName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <label className="text-muted-foreground text-xs font-semibold">
                                Start Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                required
                                disabled={isLoading}
                                value={availableFrom}
                                onChange={(e) => setAvailableFrom(e.target.value)}
                                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-muted-foreground text-xs font-semibold">
                                End Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                required
                                disabled={isLoading}
                                value={availableUntil}
                                onChange={(e) => setAvailableUntil(e.target.value)}
                                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-muted-foreground text-xs font-semibold">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                disabled={isLoading}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={
                                    isBatch
                                        ? `E.g., Approved batch ${label.toLowerCase()} exam window.`
                                        : `E.g., Approved ${label.toLowerCase()} exam window.`
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !availableFrom || !availableUntil}
                        >
                            {isLoading
                                ? 'Scheduling...'
                                : isBatch
                                  ? `Grant ${label} (${targetStudents.length})`
                                  : `Grant ${label}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
