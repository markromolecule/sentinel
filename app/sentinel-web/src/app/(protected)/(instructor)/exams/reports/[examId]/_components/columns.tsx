import { ColumnDef } from '@tanstack/react-table';
import type { ExamReport } from '@sentinel/shared/types';
import { Badge, Button, Checkbox } from '@sentinel/ui';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

type StudentRow = ExamReport['students'][number];


function formatDateTime(value?: string | Date | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Not available';
    }

    return date.toLocaleString();
}

function formatPercent(value?: number | null) {
    if (typeof value !== 'number') {
        return 'N/A';
    }

    return `${value.toFixed(1)}%`;
}

function getStatusBadgeVariant(status: StudentRow['status']) {
    switch (status) {
        case 'flagged':
            return 'destructive';
        case 'submitted':
            return 'default';
        case 'absent':
            return 'secondary';
        default:
            return 'outline';
    }
}

function getStatusLabel(status: StudentRow['status']) {
    switch (status) {
        case 'flagged':
            return 'Needs review';
        case 'submitted':
            return 'Submitted';
        case 'absent':
            return 'Absent';
        default:
            return 'In progress';
    }
}

function getSubmissionTypeLabel(submissionType: StudentRow['submissionType']) {
    switch (submissionType) {
        case 'manual_submit':
            return 'Manual submit';
        case 'auto_submit':
            return 'Auto-submit';
        case 'force_close':
            return 'Force close';
        case 'absent':
            return 'Absent';
        case 'retake':
            return 'Retake';
        default:
            return 'Pending end state';
    }
}

function getAttemptKindLabel(attemptKind: StudentRow['attemptKind']) {
    switch (attemptKind) {
        case 'makeup':
            return 'Makeup attempt';
        case 'retake':
            return 'Retake attempt';
        case 'primary':
            return 'Primary attempt';
        default:
            return 'No completed attempt';
    }
}

export const getColumns = (examId: string): ColumnDef<StudentRow>[] => [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all students"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select student"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'lastName',
        header: 'Student',

        cell: ({ row }) => {
            const student = row.original;
            return (
                <div className="min-w-[14rem] space-y-1">
                    <div className="font-medium">
                        {student.lastName}, {student.firstName}
                    </div>
                    <div className="text-muted-foreground text-sm">{student.studentNo}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {student.needsReview && (
                            <Badge variant="destructive">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Review
                            </Badge>
                        )}
                        {student.needsMakeup && <Badge variant="secondary">Makeup</Badge>}
                        {student.needsRetake && <Badge variant="outline">Retake</Badge>}
                        {student.lifecycleState === 'LOCKED' && (
                            <Badge variant="destructive">Locked</Badge>
                        )}
                        {student.lifecycleState === 'CLOSED' && (
                            <Badge variant="secondary">Closed</Badge>
                        )}
                        {student.lifecycleState === 'SUPERSEDED' && (
                            <Badge variant="outline">Superseded</Badge>
                        )}
                        {student.isFinalized && <Badge variant="default">Finalized</Badge>}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'sectionName',
        header: 'Section',
        cell: ({ row }) => row.original.sectionName ?? 'Unassigned',
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
            <Badge variant={getStatusBadgeVariant(row.original.status)}>
                {getStatusLabel(row.original.status)}
            </Badge>
        ),
    },
    {
        accessorKey: 'score',
        header: 'Score',
        cell: ({ row }) => {
            const student = row.original;
            return (
                <div>
                    <div className="font-medium">
                        {student.score ?? 'N/A'} / {student.totalScore ?? 'N/A'}
                    </div>
                    <div className="text-muted-foreground text-sm">
                        {formatPercent(student.percentage)}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'incidentCount',
        header: 'Incidents',
        cell: ({ row }) => {
            const student = row.original;
            return (
                <div>
                    <div className="font-medium">{student.incidentCount} total</div>
                    <div className="text-muted-foreground text-sm">
                        {student.openIncidentCount} open
                    </div>
                    {student.primaryIncidentType && (
                        <div className="text-muted-foreground mt-2 text-xs">
                            Primary: {student.primaryIncidentType.replaceAll('_', ' ')}
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: 'submissionType',
        header: 'Submission',
        cell: ({ row }) => {
            const student = row.original;
            return (
                <div>
                    <div className="font-medium">
                        {getSubmissionTypeLabel(student.submissionType)}
                    </div>
                    <div className="text-muted-foreground text-sm">
                        {student.attemptCount} attempt{student.attemptCount === 1 ? '' : 's'}
                    </div>
                    <div className="text-muted-foreground text-xs">
                        {getAttemptKindLabel(student.attemptKind)}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'incidentOutcomes',
        header: 'Review Outcomes',
        cell: ({ row }) => {
            const student = row.original;
            return (
                <div>
                    <div className="text-sm">Pending {student.incidentOutcomes.pending}</div>
                    <div className="text-muted-foreground text-sm">
                        Reviewed {student.incidentOutcomes.reviewed} • Confirmed{' '}
                        {student.incidentOutcomes.confirmed} • Dismissed{' '}
                        {student.incidentOutcomes.dismissed}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'startedAt',
        header: 'Timeline',
        cell: ({ row }) => {
            const student = row.original;
            return (
                <div className="min-w-[14rem] space-y-0.5">
                    <div className="text-sm">Started: {formatDateTime(student.startedAt)}</div>
                    <div className="text-muted-foreground text-sm">
                        Completed: {formatDateTime(student.completedAt)}
                    </div>
                    <div className="text-muted-foreground text-sm">
                        Time spent:{' '}
                        {student.timeSpentMinutes !== null
                            ? `${student.timeSpentMinutes} min`
                            : 'N/A'}
                    </div>
                </div>
            );
        },
    },
    {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
            const student = row.original;
            return student.attemptId ? (
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/exams/reports/${examId}/${student.attemptId}`}>
                        {student.isFinalized ? 'View Results' : 'View Attempt'}
                    </Link>
                </Button>
            ) : (
                <span className="text-muted-foreground text-sm">No attempt</span>
            );
        },
    },
];
