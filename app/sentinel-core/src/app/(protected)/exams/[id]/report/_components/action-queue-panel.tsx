import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import { Badge, Button, DataTable, FacetedFilter } from '@sentinel/ui';
import { getActionQueueColumns } from './action-queue-columns';
import { paginateItems } from '../_helpers/report-helpers';

type ActionQueuePanelProps = {
    title: string;
    description: string;
    icon: React.ReactNode;
    items: ExamReportActionItem[];
    actionLabel?: string;
    onAction?: (item: ExamReportActionItem) => void;
    onBatchAction?: (items: ExamReportActionItem[]) => void;
    activeActionId?: string | null;
    page: number;
    onPageChange: (page: number) => void;
    examId: string;
    sectionOptions: readonly (readonly [string, string])[];
    isSelectable?: boolean;
};

/**
 * Renders an Action Queue sub-section table (Needs Review, Needs Makeup, Needs Retake) in sentinel-core.
 * Features a local search bar, a section faceted filter, client-side pagination, and batch actions.
 */
export function ActionQueuePanel({
    title,
    description,
    icon,
    items,
    actionLabel,
    onAction,
    onBatchAction,
    activeActionId,
    page,
    onPageChange,
    examId,
    sectionOptions,
    isSelectable = false,
}: ActionQueuePanelProps) {
    const [searchValue, setSearchValue] = useState('');
    const [sectionFilter, setSectionFilter] = useState<string | undefined>(undefined);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setRowSelection({});
    }, [searchValue, sectionFilter]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch =
                !searchValue ||
                `${item.firstName} ${item.lastName}`
                    .toLowerCase()
                    .includes(searchValue.toLowerCase()) ||
                item.studentNo.toLowerCase().includes(searchValue.toLowerCase()) ||
                item.reason.toLowerCase().includes(searchValue.toLowerCase());

            const matchesSection = !sectionFilter || item.sectionId === sectionFilter;

            return matchesSearch && matchesSection;
        });
    }, [items, searchValue, sectionFilter]);

    const paginated = paginateItems(filteredItems, page, 8);

    const selectedItems = useMemo(() => {
        if (!isSelectable) return [];
        return items.filter((item) => rowSelection[item.studentId]);
    }, [items, rowSelection, isSelectable]);

    const columns = useMemo(() => {
        return getActionQueueColumns({
            actionLabel,
            onAction,
            activeActionId,
            examId,
            isSelectable,
        });
    }, [actionLabel, onAction, activeActionId, examId, isSelectable]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{description}</p>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-sm">
                    No students in this queue right now.
                </div>
            ) : (
                <div className="space-y-3">
                    {selectedItems.length > 0 && actionLabel && onBatchAction && (
                        <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-accent/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="font-semibold">
                                    {selectedItems.length} selected
                                </Badge>
                                <span className="text-muted-foreground text-xs">
                                    Students selected for batch {actionLabel.toLowerCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRowSelection({})}
                                    className="h-8 text-xs"
                                >
                                    Clear Selection
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => onBatchAction(selectedItems)}
                                    disabled={Boolean(activeActionId)}
                                    className="h-8 text-xs font-medium"
                                >
                                    {actionLabel} ({selectedItems.length})
                                </Button>
                            </div>
                        </div>
                    )}

                    <DataTable
                        columns={columns}
                        data={paginated.items}
                        manualPagination
                        pageCount={paginated.pagination.totalPages}
                        totalCount={paginated.pagination.total}
                        pagination={{
                            pageIndex: paginated.pagination.page - 1,
                            pageSize: paginated.pagination.pageSize,
                        }}
                        onPaginationChange={(state) => {
                            setRowSelection({});
                            onPageChange(state.pageIndex + 1);
                        }}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        getRowId={(row) => row.studentId}
                        searchKey="name"
                        searchPlaceholder="Search student..."
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        toolbarActions={
                            <FacetedFilter
                                title="Section"
                                options={sectionOptions.map(([id, name]) => ({
                                    label: name,
                                    value: id,
                                }))}
                                selectedValues={sectionFilter ? new Set([sectionFilter]) : new Set()}
                                onSelect={(val) => {
                                    setSectionFilter((current) =>
                                        current === val ? undefined : val,
                                    );
                                }}
                                onClear={() => setSectionFilter(undefined)}
                            />
                        }
                    />
                </div>
            )}
        </div>
    );
}
