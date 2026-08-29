'use client';

import * as React from 'react';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Textarea,
} from '@sentinel/ui';
import { useBatchCreateExamOverridesMutation } from '@sentinel/hooks';
import type { ExamReportStudentSummary } from '@sentinel/shared/types';
import { Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

interface BatchMakeupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    examId: string;
    students: ExamReportStudentSummary[];
    onSuccess?: () => void;
}

export function BatchMakeupDialog({
    open,
    onOpenChange,
    examId,
    students,
    onSuccess,
}: BatchMakeupDialogProps) {
    const [availableFrom, setAvailableFrom] = React.useState('');
    const [availableUntil, setAvailableUntil] = React.useState('');
    const [notes, setNotes] = React.useState('');

    // Default dates when opening
    React.useEffect(() => {
        if (open) {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            
            // Format for datetime-local (YYYY-MM-DDTHH:mm)
            const formatForInput = (d: Date) => {
                const pad = (n: number) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            setAvailableFrom(formatForInput(now));
            setAvailableUntil(formatForInput(tomorrow));
            setNotes('Batch make-up exam schedule granted.');
        }
    }, [open]);

    const mutation = useBatchCreateExamOverridesMutation({
        onSuccess: () => {
            toast.success(`Successfully scheduled make-up exam for ${students.length} student${students.length !== 1 ? 's' : ''}.`);
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to schedule batch make-up');
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!availableFrom || !availableUntil) {
            toast.error('Please specify both start and end availability times.');
            return;
        }

        const fromDate = new Date(availableFrom);
        const untilDate = new Date(availableUntil);

        if (untilDate <= fromDate) {
            toast.error('The availability end time must be after the start time.');
            return;
        }

        await mutation.mutateAsync({
            id: examId,
            studentIds: students.map((s) => s.studentId),
            overrideType: 'MAKEUP',
            availableFrom: fromDate.toISOString(),
            availableUntil: untilDate.toISOString(),
            allowedAttempts: 1,
            notes: notes.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#323d8f]/10 text-[#323d8f]">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle>Schedule Group Make-Up</DialogTitle>
                                <DialogDescription>
                                    Grant make-up exam access windows for {students.length} selected student{students.length !== 1 ? 's' : ''}.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="rounded-md border bg-muted/40 p-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Users className="h-3.5 w-3.5 text-[#323d8f]" />
                                <span>Selected Students ({students.length})</span>
                            </div>
                            <div className="mt-2 max-h-24 overflow-y-auto text-xs text-muted-foreground space-y-0.5">
                                {students.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between">
                                        <span>{s.firstName} {s.lastName}</span>
                                        <span className="font-mono text-[10px]">{s.studentNo}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="availableFrom" className="text-xs">Available From</Label>
                                <Input
                                    id="availableFrom"
                                    type="datetime-local"
                                    value={availableFrom}
                                    onChange={(e) => setAvailableFrom(e.target.value)}
                                    required
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="availableUntil" className="text-xs">Available Until</Label>
                                <Input
                                    id="availableUntil"
                                    type="datetime-local"
                                    value={availableUntil}
                                    onChange={(e) => setAvailableUntil(e.target.value)}
                                    required
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs">Notes / Reason (Optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="e.g., Authorized make-up for hospital excused absence."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="text-xs resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                            disabled={mutation.isPending || students.length === 0}
                        >
                            {mutation.isPending ? 'Scheduling...' : 'Grant Make-Up Access'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
