'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
    useActivePermissions,
    useBulkDeleteClassroomStudentsMutation,
    useClassroomQuery,
    useStableValue,
} from '@sentinel/hooks';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Checkbox,
    DataTableColumnHeader,
    PageHeader,
    Separator,
} from '@sentinel/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, Trash2, Users, UserPlus } from 'lucide-react';
import { type ClassroomStudent } from '@sentinel/shared/types';
import { ClassroomInstructorsDialog } from '../_components/classroom-instructors-dialog';
import { ClassroomRosterSection } from '../_components/classroom-roster-section';
import { ClassroomStudentEnrollmentDialog } from '../_components/classroom-student-enrollment-dialog';
import { ClassroomStudentActionCell } from '../_components/classroom-student-action-cell';

function buildStudentColumns(classroomId: string): ColumnDef<ClassroomStudent>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(status) => table.toggleAllPageRowsSelected(!!status)}
                    aria-label="Select all students"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <div onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(status) => row.toggleSelected(!!status)}
                        aria-label={`Select ${row.original.fullName || row.original.studentNumber}`}
                        className="translate-y-[2px]"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'studentNumber',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Student No." />,
        },
        {
            accessorKey: 'fullName',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => row.original.fullName || 'Unnamed student',
        },
        {
            id: 'course',
            accessorFn: (row) => [row.courseCode, row.courseTitle].filter(Boolean).join(' - '),
            header: ({ column }) => <DataTableColumnHeader column={column} title="Course" />,
            cell: ({ row }) =>
                [row.original.courseCode, row.original.courseTitle].filter(Boolean).join(' - ') ||
                'No course',
        },
        {
            id: 'department',
            accessorFn: (row) => row.departmentCode || row.departmentName || '',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
            cell: ({ row }) =>
                row.original.departmentCode || row.original.departmentName || 'No department',
        },
        {
            id: 'status',
            accessorFn: (row) => (row.isClaimed ?? Boolean(row.userId) ? 'CLAIMED' : 'UNCLAIMED'),
            header: ({ column }) => <DataTableColumnHeader column={column} title="Account Status" />,
            cell: ({ row }) => {
                const isClaimed = row.original.isClaimed ?? Boolean(row.original.userId);
                return isClaimed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Claimed
                    </span>
                ) : (
                    <span
                        title="Account exists on whitelist; student has not completed registration yet. It will activate automatically upon student login."
                        className="inline-flex cursor-help items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Pending Claim
                    </span>
                );
            },
        },
        {
            accessorKey: 'enrolledAt',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Enrolled" />,
            cell: ({ row }) =>
                row.original.enrolledAt
                    ? new Date(row.original.enrolledAt).toLocaleDateString()
                    : 'Unknown',
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <ClassroomStudentActionCell classroomId={classroomId} student={row.original} />
            ),
        },
    ];
}

export default function ClassroomDetailPage() {
    const params = useParams<{ id: string }>();
    const classroomId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const [searchTerm, setSearchTerm] = useState('');
    const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
    const [isInstructorsOpen, setIsInstructorsOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [isBulkUnenrollOpen, setIsBulkUnenrollOpen] = useState(false);
    const { data: classroom, isLoading, error } = useClassroomQuery(classroomId);
    const { hasPermission } = useActivePermissions();
    const bulkDeleteStudentsMutation = useBulkDeleteClassroomStudentsMutation({
        onSuccess: () => {
            setRowSelection({});
            setIsBulkUnenrollOpen(false);
        },
    });

    const filteredStudents = useStableValue(
        () =>
            (classroom?.students ?? []).filter((student) =>
                [
                    student.fullName,
                    student.studentNumber,
                    student.courseCode,
                    student.courseTitle,
                    student.departmentCode,
                    student.departmentName,
                ]
                    .filter(Boolean)
                    .some((value) =>
                        value?.toLowerCase().includes(searchTerm.trim().toLowerCase()),
                    ),
            ),
        [classroom?.students, searchTerm],
    );

    const studentColumns = useStableValue(
        () => buildStudentColumns(classroomId ?? ''),
        [classroomId],
    );

    const selectedIndexes = Object.keys(rowSelection).filter((key) => rowSelection[key]);
    const selectedStudents = selectedIndexes
        .map((index) => filteredStudents[Number(index)])
        .filter(Boolean);
    const canUnenrollStudents = hasPermission('classrooms:unenroll_students');
    const toolbarActions =
        canUnenrollStudents && selectedStudents.length > 0 ? (
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkUnenrollOpen(true)}
                disabled={bulkDeleteStudentsMutation.isPending}
                className="h-8"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Unenroll Selected ({selectedStudents.length})
            </Button>
        ) : undefined;

    const handleBulkUnenroll = () => {
        if (!classroomId || selectedStudents.length === 0) {
            return;
        }

        bulkDeleteStudentsMutation.mutate(
            selectedStudents.map((student) => ({
                classroomId,
                studentId: student.studentId,
            })),
        );
    };

    if (!classroomId) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <PageHeader title="Classroom" description="The classroom ID is missing." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <PageHeader title="Classroom" description="Unable to load classroom details." />
                <Separator />
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error.message}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <PageHeader
                title={classroom?.className || (isLoading ? 'Loading classroom...' : 'Classroom')}
                description={
                    classroom
                        ? `${classroom.scopeSummary.subjectLabel} • ${classroom.scopeSummary.sectionLabel}`
                        : 'View classroom scope and manage enrolled students.'
                }
            >
                <Button asChild variant="outline">
                    <Link href="/classrooms">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Link>
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setIsInstructorsOpen(true)}
                    disabled={!classroom}
                    className="border-[#323d8f] text-[#323d8f] hover:bg-[#323d8f]/5"
                >
                    <Users className="mr-2 h-4 w-4" />
                    Instructors
                </Button>
                <Button
                    onClick={() => setIsEnrollmentOpen(true)}
                    disabled={!classroom}
                    className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Students
                </Button>
            </PageHeader>
            <Separator />

            <ClassroomRosterSection
                columns={studentColumns}
                students={filteredStudents}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                isLoading={isLoading}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                toolbarActions={toolbarActions}
            />

            {classroom ? (
                <>
                    <ClassroomInstructorsDialog
                        open={isInstructorsOpen}
                        onOpenChange={setIsInstructorsOpen}
                        classroom={classroom}
                    />
                    <ClassroomStudentEnrollmentDialog
                        open={isEnrollmentOpen}
                        onOpenChangeAction={setIsEnrollmentOpen}
                        classroomId={classroom.id}
                        classroomName={classroom.className || classroom.scopeSummary.sectionLabel}
                        subjectLabel={classroom.scopeSummary.subjectLabel}
                        sectionLabel={classroom.scopeSummary.sectionLabel}
                    />
                </>
            ) : null}

            <AlertDialog open={isBulkUnenrollOpen} onOpenChange={setIsBulkUnenrollOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unenroll selected students?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove {selectedStudents.length} selected student
                            {selectedStudents.length === 1 ? '' : 's'} from the classroom roster.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkDeleteStudentsMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkUnenroll}
                            disabled={bulkDeleteStudentsMutation.isPending}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {bulkDeleteStudentsMutation.isPending
                                ? 'Removing...'
                                : 'Unenroll Selected'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
