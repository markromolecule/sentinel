"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ExamCreateDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const subjects = [
    "Data Structures",
    "Programming Fundamentals",
    "Web Development",
    "Database Management",
    "Software Engineering",
    "Computer Networks",
    "Operating Systems",
    "Algorithms",
];

export function ExamCreateDialog({ open, onOpenChange }: ExamCreateDialogProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        subject: "",
        duration: "60",
        passingScore: "60",
        scheduledDate: "",
        assignedProctor: "user-1",
    });

    const handleClose = () => {
        setFormData({
            title: "",
            description: "",
            subject: "",
            duration: "60",
            passingScore: "60",
            scheduledDate: "",
            assignedProctor: "user-1",
        });
        onOpenChange(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real implementation, this would send the data to the backend
        console.log("Creating exam:", formData);
        handleClose();
    };

    const isValid = formData.title && formData.subject && formData.duration;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Exam</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to create a new proctored exam.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Exam Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Data Structures Midterm Exam"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what this exam covers..."
                            rows={3}
                        />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                        <Label>Subject *</Label>
                        <Select
                            value={formData.subject}
                            onValueChange={(value) => setFormData({ ...formData, subject: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map((subject) => (
                                    <SelectItem key={subject} value={subject}>
                                        {subject}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assigned Proctor */}
                    <div className="space-y-2">
                        <Label>Assign Proctor</Label>
                        <Select
                            value={formData.assignedProctor}
                            onValueChange={(value) => setFormData({ ...formData, assignedProctor: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a proctor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user-1">Me (Current User)</SelectItem>
                                <SelectItem value="proctor-2">Jane Smith</SelectItem>
                                <SelectItem value="proctor-3">Dr. Alan Turing</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            You can assign this exam to yourself or another proctor.
                        </p>
                    </div>

                    {/* Duration and Passing Score */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration (minutes) *</Label>
                            <Input
                                id="duration"
                                type="number"
                                min="5"
                                max="300"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passingScore">Passing Score (%)</Label>
                            <Input
                                id="passingScore"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.passingScore}
                                onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Scheduled Date */}
                    <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
                        <Input
                            id="scheduledDate"
                            type="datetime-local"
                            value={formData.scheduledDate}
                            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid}
                            className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                        >
                            Create Exam
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
