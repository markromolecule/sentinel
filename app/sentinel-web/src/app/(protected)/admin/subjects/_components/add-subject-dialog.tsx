"use client";

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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useSubjectStore } from "@/stores/use-subject-store";
import { subjectFormSchema, SubjectFormValues } from "../_constants/subject-schema";

export function AddSubjectDialog() {
    const [open, setOpen] = useState(false);
    const addSubject = useSubjectStore((state) => state.addSubject);

    const form = useForm<SubjectFormValues>({
        resolver: zodResolver(subjectFormSchema),
        defaultValues: {
            code: "",
            title: "",
            section: "",
        },
    });

    function onSubmit(values: SubjectFormValues) {
        // Mock ID generation
        const newSubject = {
            id: `SUB-${Math.floor(Math.random() * 1000)}`,
            ...values,
            department: "General", // Default department
            createdBy: "Admin",
            createdAt: new Date(),
        };
        addSubject(newSubject);
        toast.success(`Subject ${values.code} added successfully`);
        setOpen(false);
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#323d8f] hover:bg-[#323d8f]/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Subject</DialogTitle>
                    <DialogDescription>
                        Register a new subject for the academic term.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Course Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="CS101" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descriptive Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Introduction to Computer Science" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="section"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Section</FormLabel>
                                    <FormControl>
                                        <Input placeholder="A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" className="bg-[#323d8f] hover:bg-[#323d8f]/90">Create Subject</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
