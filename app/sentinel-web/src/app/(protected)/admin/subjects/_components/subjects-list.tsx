"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { type Subject } from "@/stores/use-subject-store";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface SubjectsListProps {
    subjects: Subject[];
}

export function SubjectsList({ subjects }: SubjectsListProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[150px] pl-4">Code</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-[100px]">Section</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead className="w-[150px]">Created At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subjects.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No subjects found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        subjects.map((subject) => (
                            <TableRow key={subject.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium pl-4">{subject.code}</TableCell>
                                <TableCell>{subject.title}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{subject.section}</Badge>
                                </TableCell>
                                <TableCell>{subject.createdBy}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {format(new Date(subject.createdAt), "MMM d, yyyy")}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
