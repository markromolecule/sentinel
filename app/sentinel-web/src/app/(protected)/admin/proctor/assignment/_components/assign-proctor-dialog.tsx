"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useEffect } from "react";
import { AssignProctorDialogProps } from "../_types";
import { assignmentFormSchema, AssignmentFormValues } from "@sentinel/shared";

// Mock data for dropdowns (replace with API data later)
const MOCK_PROCTORS = [
    { id: "proc_1", name: "Sarah Connor" },
    { id: "proc_2", name: "John Wick" },
    { id: "proc_3", name: "Ellen Ripley" },
];

const MOCK_EXAMS = [
    { id: "exam_1", name: "CS101: Introduction to Programming" },
    { id: "exam_2", name: "MATH202: Advanced Calculus" },
    { id: "exam_3", name: "PHYS101: Physics I" },
];

export function AssignProctorDialog({ assignment, open, onOpenChange }: AssignProctorDialogProps) {
    const isEditing = !!assignment;

    const form = useForm<AssignmentFormValues>({
        resolver: zodResolver(assignmentFormSchema),
        defaultValues: {
            proctorId: "",
            examId: "",
            notes: "",
        },
    });

    useEffect(() => {
        if (assignment) {
            form.reset({
                proctorId: assignment.proctorId,
                examId: assignment.examId,
                notes: "", // Assuming notes aren't in the type yet
            });
        } else {
            form.reset({
                proctorId: "",
                examId: "",
                notes: "",
            });
        }
    }, [assignment, form, open]);

    function onSubmit(values: AssignmentFormValues) {
        console.log("Submitting assignment:", values);

        // Find names for toast message
        const proctor = MOCK_PROCTORS.find(p => p.id === values.proctorId);
        const exam = MOCK_EXAMS.find(e => e.id === values.examId);

        if (isEditing) {
            toast.success(`Assignment updated for ${proctor?.name || 'Proctor'}`);
        } else {
            toast.success(`${proctor?.name || 'Proctor'} assigned to ${exam?.name || 'Exam'} successfully`);
        }

        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Assignment" : "Assign Proctor"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modify the existing proctor assignment details."
                            : "Allocate a proctor to oversee a specific exam session."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="proctorId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Proctor</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a proctor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {MOCK_PROCTORS.map((proctor) => (
                                                <SelectItem key={proctor.id} value={proctor.id}>
                                                    {proctor.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="examId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Exam</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an exam" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {MOCK_EXAMS.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.id}>
                                                    {exam.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Add specific instructions..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">{isEditing ? "Update Assignment" : "Create Assignment"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
