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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, SlidersHorizontal } from "lucide-react";
import { ProctorAssignment } from "@/app/(protected)/admin/_types";
import { useProctorAssignment } from "../_hooks/use-proctor-assignment";
import { AssignmentTableRow } from "./assignment-table-row";
import { AssignProctorDialog } from "./assign-proctor-dialog";

interface AssignmentListProps {
    assignments: ProctorAssignment[];
}

export function AssignmentList({ assignments }: AssignmentListProps) {
    const {
        filteredAssignments,
        editingAssignment,
        isCreateDialogOpen,
        handleEdit,
        handleCreate,
        handleCloseDialog,
    } = useProctorAssignment({ assignments });

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
                    <Button size="sm" onClick={handleCreate}>
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
                            {filteredAssignments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No assignments found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAssignments.map((assignment) => (
                                    <AssignmentTableRow
                                        key={assignment.id}
                                        assignment={assignment}
                                        onEdit={handleEdit}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <AssignProctorDialog
                open={!!editingAssignment || isCreateDialogOpen}
                onOpenChange={handleCloseDialog}
                assignment={editingAssignment}
            />
        </Card>
    );
}
