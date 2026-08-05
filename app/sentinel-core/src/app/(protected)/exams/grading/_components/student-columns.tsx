'use client';

import { ColumnDef } from '@tanstack/react-table';
import { GradingStudent } from '@sentinel/shared/types';
import { Badge } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { MoreHorizontal, FileText, CheckCircle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@sentinel/ui';

export const studentColumns: ColumnDef<GradingStudent>[] = [
    {
        accessorKey: 'name',
        header: 'Student Name',
        cell: ({ row }) => (
            <div>
                <div className="font-medium">{row.getValue('name')}</div>
                <div className="text-muted-foreground text-xs">{row.original.studentId}</div>
            </div>
        ),
    },
    {
        accessorKey: 'sectionName',
        header: 'Section',
        cell: ({ row }) => {
            const sectionName = row.original.sectionName;
            return <div>{sectionName || <span className="text-muted-foreground">-</span>}</div>;
        },
    },
    {
        accessorKey: 'submissionDate',
        header: 'Submission Date',
        cell: ({ row }) => {
            const dateStr = row.getValue('submissionDate') as string | null;
            if (!dateStr) return <span className="text-muted-foreground">-</span>;
            const date = new Date(dateStr);
            return <div>{date.toLocaleString()}</div>;
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string;
            return (
                <Badge
                    variant={
                        status === 'GRADED'
                            ? 'default'
                            : status === 'SUBMITTED'
                              ? 'secondary'
                              : 'destructive'
                    }
                >
                    {status.replace('_', ' ')}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'score',
        header: 'Score',
        cell: ({ row }) => {
            const score = row.getValue('score') as number | null;
            const maxScore = row.original.maxScore;

            if (score === null || score === undefined)
                return <span className="text-muted-foreground">-/{maxScore}</span>;

            return (
                <div className="font-medium">
                    {score}/{maxScore}
                </div>
            );
        },
    },
    {
        id: 'actions',
        cell: () => {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            View Submission
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Grade Submission
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
