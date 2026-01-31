"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    useEffect(() => {
        if (open) {
            setTitle("");
            setDescription("");
            setType("event");
            setTargetAudience("all");
            setStartTime("");
            setEndTime("");
        }
    }, [open]);

    const handleSave = () => {
        if (!title || !selectedDate) return;

        onSave({
            date: selectedDate,
            title,
            description,
            type,
            targetAudience,
            startTime,
            endTime,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start">Start Time</Label>
                            <Input
                                id="start"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end">End Time</Label>
                            <Input
                                id="end"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
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
