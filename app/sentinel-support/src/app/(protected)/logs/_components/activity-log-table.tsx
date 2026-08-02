'use client';

import { useState } from 'react';
import { useActivityLogsQuery } from '@sentinel/hooks';
import { AuditLogTable } from './audit-log-table';
import { PaginationState } from '@tanstack/react-table';

/**
 * ActivityLogTable displays a paginated table of system user activity logs.
 * It manages its own state and fetches data using the useActivityLogsQuery hook.
 */
export function ActivityLogTable() {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    });

    const { data, isLoading, isError, error } = useActivityLogsQuery({
        params: {
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
        },
    });

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;
    const totalCount = data?.total ?? 0;

    return (
        <div className="space-y-4">
            {isError && (
                <div className="bg-destructive/10 text-destructive border-destructive/20 mt-4 rounded-lg border p-4 text-xs">
                    Failed to fetch activity logs: {error?.message || 'Unknown error occurred.'}
                </div>
            )}

            <AuditLogTable
                logs={items}
                isLoading={isLoading}
                pagination={pagination}
                onPaginationChange={setPagination}
                pageCount={totalPages}
                totalCount={totalCount}
                hideDetails={true}
            />
        </div>
    );
}
