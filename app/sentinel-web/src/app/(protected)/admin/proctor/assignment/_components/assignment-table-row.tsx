"use client";

import {
    TableCell,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProctorAssignment } from "../_types";

interface AssignmentTableRowProps {
    assignment: ProctorAssignment;
    onEdit: (assignment: ProctorAssignment) => void;
}

export function AssignmentTableRow({ assignment, onEdit }: AssignmentTableRowProps) {
    return (
        <TableRow>
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
                <Button variant="ghost" size="sm" onClick={() => onEdit(assignment)}>
                    Edit
                </Button>
            </TableCell>
        </TableRow>
    );
}
