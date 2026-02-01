"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useSubjectStore, type Subject } from "@/stores/use-subject-store";

interface SubjectsTableProps {
    subjects: Subject[];
}

export function SubjectsTable({ subjects }: SubjectsTableProps) {
    const removeSubject = useSubjectStore((state) => state.removeSubject);

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[150px]">Code</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-[100px]">Section</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subjects.map((subject) => (
                        <TableRow key={subject.id}>
                            <TableCell className="font-medium">{subject.code}</TableCell>
                            <TableCell>{subject.title}</TableCell>
                            <TableCell>{subject.section}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                    onClick={() => removeSubject(subject.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
