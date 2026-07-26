'use client';

import * as React from 'react';
import { ColumnDef, type PaginationState } from '@tanstack/react-table';
import { DataTable } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { StatusBadge } from '@/components/common/status-badge';
import { Download, Loader2 } from 'lucide-react';
import { DataTableColumnHeader } from '@sentinel/ui';
import { AnalyticsReport } from '@sentinel/services';

export interface AnalyticsReportsListProps {
    reports: AnalyticsReport[];
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    pageCount?: number;
    onDownload?: (reportId: string) => void;
    activeDownloadId?: string | null;
}

const getColumns = (
    onDownload?: (reportId: string) => void,
    activeDownloadId?: string | null,
): ColumnDef<AnalyticsReport>[] => [
    {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Report Title" />,
        cell: ({ row }) => <div className="font-medium">{row.getValue('title')}</div>,
    },
    {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <div className="capitalize">{row.getValue('type')}</div>,
    },
    {
        accessorKey: 'generatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Generated At" />,
        cell: ({ row }) => {
            const val = row.getValue('generatedAt') as string | null;
            return <div>{val ? new Date(val).toLocaleString() : 'N/A'}</div>;
        },
    },
    {
        accessorKey: 'format',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Format" />,
        cell: ({ row }) => {
            const val = row.getValue('format') as string | null;
            return <div className="uppercase">{val || 'N/A'}</div>;
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string | null;
            return <StatusBadge status={status || 'pending'} />;
        },
    },
    {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
            const report = row.original;
            const status = report.status?.toLowerCase();
            const isDownloading = activeDownloadId === report.reportId;
            return (
                <div className="text-right">
                    {status === 'ready' ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDownloading}
                            onClick={() => onDownload?.(report.reportId)}
                        >
                            {isDownloading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            {isDownloading ? 'Downloading...' : 'Download'}
                        </Button>
                    ) : status === 'generating' ? (
                        <Button variant="ghost" size="sm" disabled>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </Button>
                    ) : (
                        <span className="text-muted-foreground text-sm">Unavailable</span>
                    )}
                </div>
            );
        },
    },
];

export function AnalyticsReportsList({
    reports,
    pagination,
    onPaginationChange,
    pageCount,
    onDownload,
    activeDownloadId,
}: AnalyticsReportsListProps) {
    const columns = React.useMemo(
        () => getColumns(onDownload, activeDownloadId),
        [onDownload, activeDownloadId],
    );

    const facets = [
        {
            columnKey: 'type',
            title: 'Type',
            options: [
                { label: 'Completion', value: 'completion' },
                { label: 'Incident', value: 'incident' },
                { label: 'Performance', value: 'performance' },
            ],
        },
        {
            columnKey: 'status',
            title: 'Status',
            options: [
                { label: 'Ready', value: 'ready' },
                { label: 'Generating', value: 'generating' },
                { label: 'Failed', value: 'failed' },
            ],
        },
    ];

    return (
        <section className="space-y-4">
            <DataTable
                columns={columns}
                data={reports}
                searchKey="title"
                facets={facets}
                pagination={pagination}
                onPaginationChange={onPaginationChange}
                pageCount={pageCount}
                manualPagination={!!pagination}
            />
        </section>
    );
}
