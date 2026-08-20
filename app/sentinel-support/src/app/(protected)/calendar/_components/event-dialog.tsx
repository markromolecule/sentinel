'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

import { Button } from '@sentinel/ui';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Label } from '@sentinel/ui';
import { Textarea } from '@sentinel/ui';
import { Calendar } from '@sentinel/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@sentinel/ui';
import { cn } from '@sentinel/ui';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sentinel/ui';
import { AdminEvent, TargetAudience } from '@sentinel/shared/types';

interface EventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate: Date | null;
    onSave: (event: Omit<AdminEvent, 'id' | 'createdBy'>) => void;
    disabled?: boolean;
    error?: Error | null;
    canAddEvent?: boolean;
}

export function EventDialog({
    open,
    onOpenChange,
    selectedDate,
    onSave,
    disabled,
    error,
    canAddEvent = true,
}: EventDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<AdminEvent['type']>('event');
    const [targetAudience, setTargetAudience] = useState<TargetAudience>('institution');
    const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        if (open) {
            setDate(selectedDate || new Date());
        }
    }, [open, selectedDate]);

    useEffect(() => {
        if (startTime && endTime && endTime <= startTime) {
            setEndTime('');
        }
    }, [startTime, endTime]);

    const hasInvalidTimeRange = useMemo(() => {
        if (!startTime || !endTime) {
            return false;
        }

        return endTime <= startTime;
    }, [startTime, endTime]);

    const scheduleSummary = useMemo(() => {
        if (!date) {
            return 'Pick a date and optional time range.';
        }

        if (!startTime && !endTime) {
            return `Scheduled for ${format(date, 'MMMM d, yyyy')}.`;
        }

        return `Scheduled for ${format(date, 'MMMM d, yyyy')} from ${startTime || '--:--'} to ${endTime || '--:--'}.`;
    }, [date, endTime, startTime]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setType('event');
        setTargetAudience('institution');
        setStartTime('');
        setEndTime('');
        setDate(selectedDate || new Date());
    };

    const handleSave = () => {
        if (!title || !date || hasInvalidTimeRange) return;

        onSave({
            date: date,
            title,
            description,
            type,
            targetAudience,
            startTime,
            endTime,
        });
        onOpenChange(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    if (!canAddEvent) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="data-[state=closed]:animate-none data-[state=open]:animate-none sm:max-w-[500px]"
                overlayClassName="data-[state=open]:animate-none data-[state=closed]:animate-none"
            >
                <DialogHeader>
                    <DialogTitle>Add Event / Announcement</DialogTitle>
                    <DialogDescription>
                        Create a new event or send a note to users for{' '}
                        {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'this date'}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {error && (
                        <div className="bg-destructive/10 border-destructive/20 text-destructive animate-shake rounded-lg border p-3 text-xs font-semibold">
                            {error.message || 'Failed to save event. Please check inputs.'}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="Event title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={disabled}
                        />
                    </div>

                    <div className="space-y-3 rounded-lg border p-3">
                        <div>
                            <Label>Schedule</Label>
                            <p className="text-muted-foreground text-xs">{scheduleSummary}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !date && 'text-muted-foreground',
                                            )}
                                            disabled={disabled}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, 'PPP') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start-time">Start Time</Label>
                                <Input
                                    id="start-time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    disabled={disabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-time">End Time</Label>
                                <Input
                                    id="end-time"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    min={startTime || undefined}
                                    disabled={disabled || !startTime}
                                />
                            </div>
                        </div>
                        {hasInvalidTimeRange ? (
                            <p className="text-destructive text-xs font-medium">
                                End time must be later than start time.
                            </p>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={type}
                                onValueChange={(value: AdminEvent['type']) => setType(value)}
                                disabled={disabled}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="announcement">Announcement</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="audience">Target Audience</Label>
                            <Select
                                value={targetAudience}
                                onValueChange={(value: TargetAudience) => setTargetAudience(value)}
                                disabled={disabled}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="institution">
                                        Institution (All Users)
                                    </SelectItem>
                                    <SelectItem value="administrator">
                                        Administrators Only
                                    </SelectItem>
                                    <SelectItem value="instructor">Instructors Only</SelectItem>
                                    <SelectItem value="student">Students Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Add details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={disabled}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={disabled}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={disabled || !title || hasInvalidTimeRange}
                    >
                        {disabled ? 'Saving...' : 'Save Event'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
