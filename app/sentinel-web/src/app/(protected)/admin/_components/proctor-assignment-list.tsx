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
import { Badge } from "@/components/ui/badge";
import { Plus, SlidersHorizontal } from "lucide-react";
import { ProctorAssignment } from "../_types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ProctorAssignmentListProps {
    assignments: ProctorAssignment[];
}

export function ProctorAssignmentList({ assignments }: ProctorAssignmentListProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle>Active Assignments</CardTitle>
                    <CardDescription>
                        Overview of current exam proctor allocations.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Load Balance
                    </Button>
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Assign Proctor
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proctor</TableHead>
                                <TableHead>Exam / Course</TableHead>
                                <TableHead>Assigned Students</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.map((assignment) => (
                                <TableRow key={assignment.id}>
                                    <TableCell className="font-medium">{assignment.proctorName}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{assignment.examName}</span>
                                            <span className="text-xs text-muted-foreground">{assignment.examId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{assignment.assignedStudents}</TableCell>
                                    <TableCell>
                                        <Badge variant={assignment.status === "active" ? "default" : "secondary"}>
                                            {assignment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
