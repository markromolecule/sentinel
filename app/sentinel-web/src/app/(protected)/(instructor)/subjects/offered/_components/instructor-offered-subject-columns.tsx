'use client';

import { format } from 'date-fns';
import { type ColumnDef } from '@tanstack/react-table';
import { type SubjectOffering } from '@sentinel/shared/types';
import { Badge, Button, DataTableColumnHeader } from '@sentinel/ui';
import { StatusBadge } from '@/components/common/displays/status-badge';
import { RequestOfferedSubjectBuilderDialog } from './request-offered-subject-builder-dialog';
import { useState } from 'react';
import { useActivePermissions } from '@sentinel/hooks';

interface CreateInstructorOfferedSubjectColumnsArgs {
    existingRequestStatusMap: Map<string, 'APPROVED' | 'PENDING'>;
}

function SummaryBadges({ labels, emptyLabel }: { labels: string[]; emptyLabel: string }) {
    if (labels.length === 0) {
        return <span className="text-muted-foreground text-sm">{emptyLabel}</span>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {labels.slice(0, 2).map((label) => (
                <Badge key={label} variant="secondary" className="font-medium">
                    {label}
                </Badge>
            ))}
            {labels.length > 2 && (
                <span className="text-muted-foreground self-center text-xs">
                    +{labels.length - 2} more
                </span>
            )}
        </div>
    );
}

function mapLabels(ids: string[], labelMap: Map<string, string>) {
    return ids.map((id) => labelMap.get(id)).filter((label): label is string => Boolean(label));
}

function RequestActionCell({
    offering,
    existingStatus,
}: {
    offering: SubjectOffering;
    existingStatus?: 'APPROVED' | 'PENDING';
}) {
    const { hasPermission } = useActivePermissions();
    const [open, setOpen] = useState(false);
    const canRequest = hasPermission('subject_requests:request');
    const isRequestable = offering.status === 'OPEN';
    const isAlreadyHandled = Boolean(existingStatus);

    if (!canRequest) {
        return <span className="text-muted-foreground text-sm">No access</span>;
    }

    const actionLabel =
        existingStatus === 'APPROVED'
            ? 'Added'
            : existingStatus === 'PENDING'
              ? 'Requested'
              : 'Request';

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!isRequestable || isAlreadyHandled}
                onClick={() => {
                    if (!isRequestable || isAlreadyHandled) {
                        return;
                    }
                    setOpen(true);
                }}
            >
                {actionLabel}
            </Button>
            {!isAlreadyHandled ? (
                <RequestOfferedSubjectBuilderDialog
                    mode="locked-offering"
                    open={open}
                    onOpenChange={setOpen}
                    offering={offering}
                />
            ) : null}
        </>
    );
}

export function createInstructorOfferedSubjectColumns({
    existingRequestStatusMap,
}: CreateInstructorOfferedSubjectColumnsArgs): ColumnDef<SubjectOffering>[] {
    return [
        {
            accessorKey: 'subjectCode',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Subject Code" />,
            cell: ({ row }) => <span className="font-medium">{row.original.subjectCode}</span>,
        },
        {
            accessorKey: 'subjectTitle',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Description / Title" />
            ),
            cell: ({ row }) => {
                const title = row.original.subjectTitle;
                return (
                    <div className="max-w-[300px] truncate font-medium" title={title}>
                        {title}
                    </div>
                );
            },
        },
        {
            id: 'term',
            accessorFn: (row) => `${row.termAcademicYear} • ${row.termSemester}`,
            header: ({ column }) => <DataTableColumnHeader column={column} title="Term" />,
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-medium">
                        {row.original.termAcademicYear} • {row.original.termSemester}
                    </div>
                    <div className="text-muted-foreground text-xs">
                        {row.original.termStartDate || row.original.termEndDate
                            ? `${row.original.termStartDate ? format(new Date(row.original.termStartDate), 'MMM d, yyyy') : 'TBD'} - ${row.original.termEndDate ? format(new Date(row.original.termEndDate), 'MMM d, yyyy') : 'TBD'}`
                            : 'Dates not set'}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'departments',
            accessorFn: (row) =>
                row.departments.map((department) => department.code || department.name).join(', '),
            header: ({ column }) => <DataTableColumnHeader column={column} title="Departments" />,
            cell: ({ row }) => (
                <SummaryBadges
                    labels={row.original.departments.map(
                        (department) => department.code?.trim() || department.name,
                    )}
                    emptyLabel="No departments"
                />
            ),
        },
        {
            id: 'courses',
            accessorFn: (row) =>
                row.courses.map((course) => course.code || course.title).join(', '),
            header: ({ column }) => <DataTableColumnHeader column={column} title="Courses" />,
            cell: ({ row }) => (
                <SummaryBadges
                    labels={row.original.courses.map(
                        (course) => course.code?.trim() || course.title,
                    )}
                    emptyLabel="No courses"
                />
            ),
        },
        {
            id: 'yearLevels',
            accessorFn: (row) => row.yearLevels.map((level) => `Year ${level}`).join(', '),
            header: ({ column }) => <DataTableColumnHeader column={column} title="Year Levels" />,
            cell: ({ row }) => (
                <SummaryBadges
                    labels={row.original.yearLevels.map((level) => `Year ${level}`)}
                    emptyLabel="No year levels"
                />
            ),
        },
        {
            id: 'sections',
            accessorFn: (row) => row.sections.map((section) => section.name).join(', '),
            header: ({ column }) => <DataTableColumnHeader column={column} title="Sections" />,
            cell: ({ row }) => (
                <SummaryBadges
                    labels={row.original.sections.map((section) => section.name)}
                    emptyLabel="No sections"
                />
            ),
        },
        {
            accessorKey: 'updatedAt',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Updated At" />,
            cell: ({ row }) => {
                const date = row.original.updatedAt;
                if (!date) {
                    return <span className="text-muted-foreground">None</span>;
                }

                return format(new Date(date), 'MMM d, yyyy');
            },
        },
        {
            id: 'actions',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
            cell: ({ row }) => (
                <RequestActionCell
                    offering={row.original}
                    existingStatus={existingRequestStatusMap.get(row.original.id)}
                />
            ),
        },
    ];
}
