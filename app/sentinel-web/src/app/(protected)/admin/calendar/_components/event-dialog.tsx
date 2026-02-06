"use client";

import { useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AdminEvent, TargetAudience } from "../_types";

interface EventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate: Date | null;
    onSave: (event: Omit<AdminEvent, "id" | "createdBy">) => void;
}

export function EventDialog({
    open,
    onOpenChange,
    selectedDate,
    onSave,
}: EventDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<AdminEvent["type"]>("event");
    const [targetAudience, setTargetAudience] = useState<TargetAudience>("all");
    const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    // Update internal state when selectedDate prop changes
    if (selectedDate && (!date || date.getTime() !== selectedDate.getTime())) {
        // This might cause infinite loop if not careful, better use useEffect or just initialize.
        // Actually, for a dialog, simpler to just rely on initial state or key change.
        // For now, I'll rely on key or open change handling.
    }



    const handleSave = () => {
        if (!title || !date) return;

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
            setTitle("");
            setDescription("");
            setType("event");
            setTargetAudience("all");
            setStartTime("");
            setEndTime("");
            setDate(selectedDate || new Date());
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Event / Announcement</DialogTitle>
                    <DialogDescription>
                        Create a new event or send a note to users for{" "}
                        {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "this date"}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="Event title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Select
                                value={startTime}
                                onValueChange={setStartTime}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent className="h-[200px]" position="popper" sideOffset={4}>
                                    {Array.from({ length: 48 }).map((_, i) => {
                                        const hour = Math.floor(i / 2).toString().padStart(2, '0');
                                        const minute = (i % 2 === 0 ? '00' : '30');
                                        const time = `${hour}:${minute}`;
                                        return (
                                            <SelectItem key={time} value={time}>
                                                {time}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Select
                                value={endTime}
                                onValueChange={setEndTime}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent className="h-[200px]" position="popper" sideOffset={4}>
                                    {Array.from({ length: 48 }).map((_, i) => {
                                        const hour = Math.floor(i / 2).toString().padStart(2, '0');
                                        const minute = (i % 2 === 0 ? '00' : '30');
                                        const time = `${hour}:${minute}`;
                                        return (
                                            <SelectItem key={time} value={time}>
                                                {time}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={type}
                                onValueChange={(value: AdminEvent["type"]) => setType(value)}
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
                                onValueChange={(value: TargetAudience) =>
                                    setTargetAudience(value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    <SelectItem value="students">Students Only</SelectItem>
                                    <SelectItem value="proctors">Proctors Only</SelectItem>
                                    <SelectItem value="specific_group">Specific Group</SelectItem>
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
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Event</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
