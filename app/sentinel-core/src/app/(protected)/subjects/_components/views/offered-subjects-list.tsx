'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    DataTable,
} from '@sentinel/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { type PaginationState } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { type SubjectOffering } from '@sentinel/shared/types';
import { SUBJECT_OFFERING_QUERY_KEYS, SUBJECT_QUERY_KEYS } from '@sentinel/shared/constants';
import { OfferedSubjectsEmptyState } from './offered-subjects-empty-state';
import { offeredSubjectsFacets } from './offered-subjects-facets';
import { useState } from 'react';
import { FloatingActionBar } from './floating-action-bar';
import { useDeleteSubjectOfferingsMutation, useActivePermissions } from '@sentinel/hooks';
import { AssignSubjectToInstructorDialog } from '../dialogs/assign-subject-to-instructor-dialog';
import { toast } from 'sonner';

interface OfferedSubjectsListProps {
    offerings: SubjectOffering[];
    columns: ColumnDef<SubjectOffering>[];
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
    isLoading?: boolean;
    canDeleteOfferings?: boolean;
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    pageCount?: number;
    totalCount?: number;
    manualPagination?: boolean;
}

export function OfferedSubjectsList({
    offerings,
    columns,
    searchTerm,
    onSearchChange,
    isLoading = false,
    canDeleteOfferings = false,
    pagination,
    onPaginationChange,
    pageCount,
    totalCount,
    manualPagination = false,
}: OfferedSubjectsListProps) {
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const queryClient = useQueryClient();

    const { hasPermission } = useActivePermissions();
    const canAssignSubjects = hasPermission('subjects:update');

    const selectedOfferings = offerings.filter((offering) => rowSelection[offering.id]);

    const deleteOfferingsMutation = useDeleteSubjectOfferingsMutation({
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBJECT_OFFERING_QUERY_KEYS.all });
            queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
            setRowSelection({});
            setBulkDeleteOpen(false);
            toast.success(`Successfully removed ${selectedOfferings.length} offered subjects`);
        },
        onError: () => {
            toast.error('Failed to remove some offered subjects. Please try again.');
        },
    });

    const isBulkUnofferPending = deleteOfferingsMutation.isPending;

    async function handleBulkUnoffer() {
        const ids = [...new Set(selectedOfferings.map((offering) => offering.id))];

        if (ids.length === 0 || isBulkUnofferPending) return;

        deleteOfferingsMutation.mutate(ids);
    }

    return (
        <div className="relative">
            <DataTable
                columns={columns}
                data={offerings}
                searchValue={searchTerm}
                onSearchChange={onSearchChange}
                searchPlaceholder="Search offered subjects..."
                isLoading={isLoading}
                facets={offeredSubjectsFacets}
                emptyContent={<OfferedSubjectsEmptyState searchTerm={searchTerm} />}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                initialColumnVisibility={{
                    subjectTitle: false,
                    inheritanceStatus: false,
                    updatedAt: false,
                }}
                pagination={pagination}
                onPaginationChange={onPaginationChange}
                pageCount={pageCount}
                totalCount={totalCount}
                manualPagination={manualPagination}
                getRowId={(offering) => offering.id}
            />

            {(canDeleteOfferings || canAssignSubjects) && (
                <FloatingActionBar
                    selectedCount={selectedOfferings.length}
                    onClear={() => setRowSelection({})}
                    onUnoffer={canDeleteOfferings ? () => setBulkDeleteOpen(true) : undefined}
                    onAssign={canAssignSubjects ? () => setBulkAssignOpen(true) : undefined}
                    isPending={isBulkUnofferPending}
                />
            )}

            {canDeleteOfferings && (
                <AlertDialog
                    open={bulkDeleteOpen}
                    onOpenChange={(open) => {
                        if (isBulkUnofferPending) return;

                        setBulkDeleteOpen(open);
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Unoffer selected subjects?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove {selectedOfferings.length} selected offered subject
                                {selectedOfferings.length === 1 ? '' : 's'} from their assigned term
                                audiences. The master subject records will remain in the catalog.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isBulkUnofferPending}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700"
                                disabled={isBulkUnofferPending || selectedOfferings.length === 0}
                                onClick={async (event) => {
                                    event.preventDefault();
                                    await handleBulkUnoffer();
                                }}
                            >
                                {isBulkUnofferPending
                                    ? 'Removing...'
                                    : `Unoffer Selected (${selectedOfferings.length})`}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {canAssignSubjects && (
                <AssignSubjectToInstructorDialog
                    open={bulkAssignOpen}
                    onOpenChange={setBulkAssignOpen}
                    subjectOfferingId={selectedOfferings.map((o) => o.id)}
                />
            )}
        </div>
    );
}
