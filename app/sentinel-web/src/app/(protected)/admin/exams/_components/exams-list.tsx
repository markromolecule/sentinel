"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { type ProctorExam } from "@/app/(protected)/proctor/_types";

interface ExamsListProps {
    exams: ProctorExam[];
}

export function ExamsList({ exams }: ExamsListProps) {
    // Helper to get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "default"; // or generic green if available, default is usually primary (black/dark blue)
            case "completed":
                return "secondary";
            case "draft":
                return "outline";
            default:
                return "default";
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-4">Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {exams.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No exams found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        exams.map((exam) => (
                            <TableRow key={exam.id} className="hover:bg-muted/50">
                                <TableCell className="pl-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium">{exam.title}</span>
                                        {/* <span className="text-xs text-muted-foreground">{exam.description}</span> */}
                                    </div>
                                </TableCell>
                                <TableCell>{exam.subject}</TableCell>
                                <TableCell>{exam.createdBy || "Unknown"}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusColor(exam.status)} className="capitalize">
                                        {exam.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{exam.questionsCount}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {exam.scheduledDate
                                        ? format(new Date(exam.scheduledDate), "MMM d, yyyy")
                                        : "Unscheduled"
                                    }
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
