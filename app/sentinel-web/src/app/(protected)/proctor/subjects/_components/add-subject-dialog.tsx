"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useSubjectStore } from "@/stores/use-subject-store";

export function AddSubjectDialog() {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        code: "",
        section: "",
    });

    const addSubject = useSubjectStore((state) => state.addSubject);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.title.trim() && formData.code.trim() && formData.section.trim()) {
            addSubject({
                title: formData.title.trim(),
                code: formData.code.trim(),
                section: formData.section.trim(),
            });
            setFormData({ title: "", code: "", section: "" });
            setOpen(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subject
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Subject</DialogTitle>
                        <DialogDescription>
                            Add a new subject to manage exams and students nicely.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title
                            </Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder="e.g. Advanced Calculus"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">
                                Code
                            </Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder="e.g. MAT201"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="section" className="text-right">
                                Section
                            </Label>
                            <Input
                                id="section"
                                value={formData.section}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder="e.g. A"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={!formData.title.trim() || !formData.code.trim() || !formData.section.trim()}
                        >
                            Add Subject
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
