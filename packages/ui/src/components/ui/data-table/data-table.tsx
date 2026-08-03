'use client';

import * as React from 'react';
import {
    ColumnDef,
    ColumnFiltersState,
    PaginationState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { cn } from '../../../lib/utils';
import { DataTablePagination } from './data-table-pagination';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { X } from 'lucide-react';
import { Button } from '../button';
import { SearchBar } from '../search-bar';
import { Skeleton } from '../skeleton';

export interface DataTableFacet {
    columnKey: string;
    title: string;
    options: {
        label: string;
        value: string;
        icon?: React.ComponentType<{ className?: string }>;
    }[];
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    toolbarActions?: React.ReactNode;
    meta?: any;
    facets?: DataTableFacet[];
    onRowClick?: (row: TData) => void;
    rowSelection?: any;
    onRowSelectionChange?: (selection: any) => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    pageCount?: number;
    totalCount?: number;
    manualPagination?: boolean;
    initialColumnVisibility?: VisibilityState;
    emptyContent?: React.ReactNode;
    isLoading?: boolean;
    columnFilters?: ColumnFiltersState;
    onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
    rowClassName?: string | ((row: TData) => string);
    paginationVariant?: 'standard' | 'modern';
    getRowId?: (originalRow: TData, index: number) => string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Search...',
    toolbarActions,
    meta,
    facets,
    onRowClick,
    rowSelection,
    onRowSelectionChange,
    searchValue,
    onSearchChange,
    pagination,
    onPaginationChange,
    pageCount,
    totalCount,
    manualPagination = false,
    initialColumnVisibility = {},
    emptyContent,
    isLoading,
    columnFilters,
    onColumnFiltersChange,
    rowClassName,
    paginationVariant = 'standard',
    getRowId,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>(
        [],
    );
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>(initialColumnVisibility);
    const [internalRowSelection, setInternalRowSelection] = React.useState({});
    const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId,
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: (updaterOrValue) => {
            const currentFilters = columnFilters || internalColumnFilters;
            const nextFilters =
                typeof updaterOrValue === 'function'
                    ? (updaterOrValue as (old: ColumnFiltersState) => ColumnFiltersState)(
                          currentFilters,
                      )
                    : updaterOrValue;

            if (onColumnFiltersChange) {
                onColumnFiltersChange(nextFilters);
                return;
            }

            setInternalColumnFilters(nextFilters);
        },
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: onRowSelectionChange || setInternalRowSelection,
        onPaginationChange: (updater) => {
            const currentPagination = pagination || internalPagination;
            const nextPagination =
                typeof updater === 'function' ? updater(currentPagination) : updater;

            if (onPaginationChange) {
                onPaginationChange(nextPagination);
                return;
            }

            setInternalPagination(nextPagination);
        },
        manualPagination,
        pageCount,
        state: {
            sorting,
            columnFilters: columnFilters || internalColumnFilters,
            columnVisibility,
            rowSelection: rowSelection || internalRowSelection,
            pagination: pagination || internalPagination,
        },
        meta,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-1 items-center space-x-2">
                    {(searchKey || onSearchChange) && (
                        <SearchBar
                            placeholder={searchPlaceholder}
                            value={
                                onSearchChange
                                    ? searchValue
                                    : ((table.getColumn(searchKey!)?.getFilterValue() as string) ??
                                      '')
                            }
                            onChange={(event) =>
                                onSearchChange
                                    ? onSearchChange(event.target.value)
                                    : table
                                          .getColumn(searchKey!)
                                          ?.setFilterValue(event.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                }
                            }}
                            containerClassName="max-w-sm"
                        />
                    )}

                    {facets &&
                        facets.map((facet) => {
                            const column = table.getColumn(facet.columnKey);
                            if (!column) return null;
                            return (
                                <DataTableFacetedFilter
                                    key={facet.columnKey}
                                    column={column}
                                    title={facet.title}
                                    options={facet.options}
                                />
                            );
                        })}

                    {table.getState().columnFilters.length > 0 && (
                        <Button
                            variant="ghost"
                            onClick={() => table.resetColumnFilters()}
                            className="h-8 px-2 lg:px-3"
                        >
                            Reset
                            <X className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {toolbarActions}
                </div>
                <DataTableViewOptions table={table} />
            </div>
            <div className="rounded-none">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="bg-muted/5 border-t border-r border-l border-[#323d8f]/10"
                            >
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {columns.map((_, j) => (
                                        <TableCell key={`skeleton-${i}-${j}`}>
                                            <Skeleton className="h-6 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    onClick={() => onRowClick?.(row.original)}
                                    className={cn(
                                        onRowClick && 'hover:bg-muted/50 cursor-pointer',
                                        typeof rowClassName === 'function'
                                            ? rowClassName(row.original)
                                            : rowClassName,
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 border-none text-center"
                                >
                                    {emptyContent || 'No results.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} totalCount={totalCount} />
        </div>
    );
}
