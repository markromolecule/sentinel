'use client';

import { type LogRecord } from '@sentinel/services';
import { DataTable, Spinner } from '@sentinel/ui';
import { columns } from './columns';
import { PaginationState } from '@tanstack/react-table';

interface AuditLogTableProps {
    logs: LogRecord[];
    isLoading?: boolean;
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    pageCount?: number;
    totalCount?: number;
    hideDetails?: boolean;
}

export function AuditLogTable({
    logs,
    isLoading,
    pagination,
    onPaginationChange,
    pageCount,
    totalCount,
    hideDetails,
}: AuditLogTableProps) {
    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="size-8 text-[#323d8f]" />
            </div>
        );
    }

    const tableColumns = hideDetails
        ? columns.filter(
              (col) =>
                  (col as any).accessorKey !== 'details' && col.id !== 'details',
          )
        : columns;

    return (
        <DataTable
            columns={tableColumns}
            data={logs}
            searchKey="action"
            searchPlaceholder="Search by action name (e.g. user.login)..."
            facets={[
                {
                    columnKey: 'action',
                    title: 'Action Type',
                    options: [
                        { label: 'Login', value: 'user.login' },
                        { label: 'Exam Start', value: 'exam.start' },
                        { label: 'Exam End', value: 'exam.end' },
                        { label: 'Config Update', value: 'config.update' },
                    ],
                },
                {
                    columnKey: 'resourceType',
                    title: 'Resource Category',
                    options: [
                        { label: 'Auth', value: 'auth' },
                        { label: 'Exam', value: 'exam' },
                        { label: 'System', value: 'system' },
                        { label: 'User', value: 'user' },
                    ],
                },
            ]}
            pagination={pagination}
            onPaginationChange={onPaginationChange}
            pageCount={pageCount}
            totalCount={totalCount}
            manualPagination={!!pagination}
        />
    );
}
