'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Student } from '@sentinel/shared/types';
import { DataTableColumnHeader, Checkbox, Avatar, AvatarImage, AvatarFallback } from '@sentinel/ui';
import { StatusBadge } from '@/components/common/displays/status-badge';
import { StudentActionCell } from './student-action-cell';

function getCondensedSubject(subject: string) {
    const subjectParts = subject
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    if (subjectParts.length === 0) {
        return '—';
    }

    if (subjectParts.length === 1) {
        return subjectParts[0];
    }

    return `${subjectParts[0]} +${subjectParts.length - 1} more`;
}

export const columns: ColumnDef<Student>[] = [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="ml-4 translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="ml-4 translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
        cell: ({ row }) => {
            const student = row.original;
            const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`;

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage
                            src={student.avatarUrl || undefined}
                            alt={`${student.firstName} ${student.lastName}`}
                            className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] text-xs font-bold text-white">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-foreground text-sm font-medium">
                            {student.firstName} {student.lastName}
                        </p>
                        {student.email && (
                            <p className="text-muted-foreground text-xs">{student.email}</p>
                        )}
                    </div>
                </div>
            );
        },
        filterFn: (row, id, value) => {
            const student = row.original;
            const searchString =
                `${student.firstName} ${student.lastName} ${student.email} ${student.studentNo} ${student.subject} ${student.section} ${student.term}`.toLowerCase();
            return searchString.includes(value.toLowerCase());
        },
    },
    {
        accessorKey: 'studentNo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Student No." />,
        cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('studentNo')}</div>,
    },
    {
        accessorKey: 'section',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Section" />,
        cell: ({ row }) => <div className="hidden md:block">{row.getValue('section')}</div>,
        enableHiding: true,
    },
    {
        accessorKey: 'subject',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Subject" />,
        cell: ({ row }) => {
            const subject = row.getValue('subject') as string;
            const condensedSubject = getCondensedSubject(subject);

            return (
                <div className="hidden max-w-[18rem] truncate lg:block" title={subject}>
                    {condensedSubject}
                </div>
            );
        },
        enableHiding: true,
    },
    {
        accessorKey: 'term',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Term" />,
        cell: ({ row }) => (
            <div className="text-muted-foreground hidden lg:block">{row.getValue('term')}</div>
        ),
        enableHiding: true,
    },
    {
        accessorKey: 'yearLevel',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Year Level" />,
        cell: ({ row }) => <div className="hidden xl:block">{row.getValue('yearLevel')}</div>,
        enableHiding: true,
    },
    {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
            const status = row.getValue('status') as string;
            return <StatusBadge status={status} />;
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <StudentActionCell student={row.original} />,
    },
];
