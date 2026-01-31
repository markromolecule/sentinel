"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck } from "lucide-react";
import { MOCK_PROCTOR_EXAMS, MOCK_PROCTOR } from "../_constants";

export default function ProctorAssignmentPage() {
    const [searchTerm, setSearchTerm] = useState("");

    // Enhanced mock data to include proctor assignment info
    // In a real app, this would come from the backend joining Exam and Proctor tables
    const assignedExams = MOCK_PROCTOR_EXAMS.map(exam => ({
        ...exam,
        assignedProctor: exam.id === "2" ? "John Doe" : MOCK_PROCTOR.name, // Mock assignments
        assignedProctorId: exam.id === "2" ? "2" : MOCK_PROCTOR.id,
    }));

    const filteredExams = assignedExams.filter(
        (exam) =>
            exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Proctor Assignment</h1>
                    <p className="text-muted-foreground">
                        Manage proctor assignments for examinations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button className="bg-[#323d8f] hover:bg-[#323d8f]/90">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Assign Proctor
                    </Button>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search exams..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Exam Title</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Assigned Proctor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExams.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No exams found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredExams.map((exam) => (
                                    <TableRow key={exam.id}>
                                        <TableCell className="font-medium">{exam.title}</TableCell>
                                        <TableCell>{exam.subject}</TableCell>
                                        <TableCell>
                                            {exam.scheduledDate || "Unscheduled"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {exam.assignedProctor.split(" ").map(n => n[0]).join("")}
                                                </div>
                                                {exam.assignedProctor}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={exam.status === 'active' ? 'default' : 'secondary'}>
                                                {exam.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                Reassign
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
