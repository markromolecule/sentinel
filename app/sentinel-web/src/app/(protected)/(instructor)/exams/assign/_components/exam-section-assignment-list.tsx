'use client';

import * as React from 'react';
import { Button, DataTable, Spinner } from '@sentinel/ui';
import { Trash2, MapPin, User, Plus } from 'lucide-react';
import { useClassroomsQuery } from '@sentinel/hooks';
import { type ClassroomSummary } from '@sentinel/shared/types';
import { type ExamSectionAssignmentRecord } from '@sentinel/services';
import { type ColumnDef } from '@tanstack/react-table';
import { DeleteAssignmentDialog } from './delete-assignment-dialog';

interface ResolvedAssignment extends ExamSectionAssignmentRecord {
    resolvedName: string;
}

interface DeleteTarget {
    id: string;
    classroomName: string;
}

export interface ExamSectionAssignmentListProps {
    examId: string;
    subjectId?: string;
    assignments: ExamSectionAssignmentRecord[];
    isLoading: boolean;
    onAssignClick: () => void;
}

function createColumns(
    handleDelete: (id: string, classroomName: string) => void,
): ColumnDef<ResolvedAssignment>[] {
    return [
        {
            accessorKey: 'resolvedName',
            header: 'Classroom',
            cell: ({ row }) => (
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.original.resolvedName}
                </span>
            ),
        },
        {
            accessorKey: 'roomName',
            header: 'Room',
            cell: ({ row }) => {
                const roomName = row.original.roomName;
                return roomName ? (
                    <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                        <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                        {roomName}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs italic">No room assigned</span>
                );
            },
        },
        {
            accessorKey: 'instructorName',
            header: 'Instructor / Proctor',
            cell: ({ row }) => {
                const instructorName = row.original.instructorName;
                return instructorName ? (
                    <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                        <User className="text-muted-foreground h-3.5 w-3.5" />
                        {instructorName}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs italic">No instructor</span>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        onClick={() => handleDelete(row.original.id, row.original.resolvedName)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];
}

/**
 * ExamSectionAssignmentList renders the current section assignments for the selected exam.
 */
export function ExamSectionAssignmentList({
    examId,
    subjectId,
    assignments,
    isLoading,
    onAssignClick,
}: ExamSectionAssignmentListProps) {
    const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);
    const { data: classrooms = [] } = useClassroomsQuery(
        subjectId
            ? {
                  subjectId,
              }
            : undefined,
    );

    const resolvedAssignments = React.useMemo(() => {
        return assignments.map((assignment) => {
            const classroom = (classrooms as ClassroomSummary[]).find(
                (entry) =>
                    (assignment.classGroupId && entry.id === assignment.classGroupId) ||
                    (!assignment.classGroupId && entry.sectionId === assignment.sectionId),
            );

            return {
                ...assignment,
                resolvedName:
                    classroom?.className || assignment.sectionName || 'Unassigned classroom',
            };
        });
    }, [assignments, classrooms]);

    const handleDelete = React.useCallback((assignmentId: string, classroomName: string) => {
        setDeleteTarget({ id: assignmentId, classroomName });
    }, []);

    const columns = React.useMemo(() => createColumns(handleDelete), [handleDelete]);

    if (isLoading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Spinner className="text-primary size-8" />
            </div>
        );
    }

    return (
        <>
            <DataTable<ResolvedAssignment, unknown>
                columns={columns}
                data={resolvedAssignments}
                toolbarActions={
                    <Button
                        onClick={onAssignClick}
                        className="bg-[#323d8f] font-semibold text-white hover:bg-[#323d8f]/90"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Assign Classroom
                    </Button>
                }
                emptyContent={
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-[#323d8f]/10 p-3 text-[#323d8f]">
                            <Plus className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">No Classrooms Assigned</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                            This exam hasn&apos;t been assigned to any classrooms yet. Assign a
                            classroom to make the exam available.
                        </p>
                        <Button
                            onClick={onAssignClick}
                            className="mt-4 bg-[#323d8f] hover:bg-[#323d8f]/90"
                        >
                            Assign Classroom
                        </Button>
                    </div>
                }
            />
            {deleteTarget ? (
                <DeleteAssignmentDialog
                    open={Boolean(deleteTarget)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteTarget(null);
                        }
                    }}
                    assignmentId={deleteTarget.id}
                    examId={examId}
                    classroomName={deleteTarget.classroomName}
                />
            ) : null}
        </>
    );
}
