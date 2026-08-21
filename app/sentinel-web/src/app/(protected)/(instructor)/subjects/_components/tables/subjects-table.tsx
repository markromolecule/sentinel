'use client';

import { DataTable } from '@sentinel/ui';
import { type Subject } from '@sentinel/shared/types';
import {
    type ColumnDef,
    type PaginationState,
    type RowSelectionState,
    type VisibilityState,
} from '@tanstack/react-table';
import { columns as defaultColumns } from '@/app/(protected)/(instructor)/subjects/_components/tables/columns';

const DEFAULT_INITIAL_COLUMN_VISIBILITY: VisibilityState = {
    approved_at: false,
    approved_by: false,
};

interface SubjectsTableProps {
    data: Subject[];
    columns?: (args?: { showSelection?: boolean }) => ColumnDef<Subject>[];
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    facets?: {
        columnKey: string;
        title: string;
        options: {
            label: string;
            value: string;
            icon?: React.ComponentType<{ className?: string }>;
        }[];
    }[];
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    pageCount?: number;
    totalCount?: number;
    manualPagination?: boolean;
    initialColumnVisibility?: VisibilityState;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
    toolbarActions?: React.ReactNode;
}

export function SubjectsTable({
    data,
    columns = defaultColumns,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search subjects...',
    facets,
    pagination,
    onPaginationChange,
    pageCount,
    totalCount,
    manualPagination = false,
    initialColumnVisibility = DEFAULT_INITIAL_COLUMN_VISIBILITY,
    rowSelection,
    onRowSelectionChange,
    toolbarActions,
}: SubjectsTableProps) {
    return (
        <DataTable
            columns={columns({ showSelection: Boolean(onRowSelectionChange) })}
            data={data}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            facets={facets}
            pagination={pagination}
            onPaginationChange={onPaginationChange}
            pageCount={pageCount}
            totalCount={totalCount}
            manualPagination={manualPagination}
            initialColumnVisibility={initialColumnVisibility}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            toolbarActions={toolbarActions}
        />
    );
}
