'use client';

import { useState, useMemo } from 'react';
import { ColumnFiltersState } from '@tanstack/react-table';
import {
    DataTable,
    PermissionDeniedState,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@sentinel/ui';
import { SubjectPageShell } from '@/app/(protected)/(support)/subjects/_components/layout';
import { useOfferedPageState } from '@/app/(protected)/(support)/subjects/offered/_hooks/use-offered-page-state';
import {
    isPermissionDeniedError,
    useStableValue,
    useDeleteSubjectOfferingsMutation,
    PermissionGuard,
    useSectionsQuery,
    useStableIdMap,
} from '@sentinel/hooks';
import { useInstitutionFacet, useDataTableFilterSync } from '@/hooks';
import { Trash2 } from 'lucide-react';
import { createOfferedColumns } from '@/app/(protected)/(support)/subjects/offered/_components/tables/offered-columns';

export function OfferedView() {
    const {
        searchTerm,
        setSearchTerm,
        selectedInstitutionId,
        setSelectedInstitutionId,
        pagination,
        setPagination,
        totalCount,
        pageCount,
        institutions,
        offerings,
        isLoading,
        isError,
        error,
    } = useOfferedPageState();

    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const deleteOfferingsMutation = useDeleteSubjectOfferingsMutation({
        onSuccess: () => {
            setIsDeleteDialogOpen(false);
            setRowSelection({});
        },
    });

    const selectedIds = useMemo(() => {
        return Object.keys(rowSelection).filter((id) => rowSelection[id]);
    }, [rowSelection]);

    const handleBulkDelete = () => {
        if (selectedIds.length > 0) {
            deleteOfferingsMutation.mutate({
                ids: selectedIds,
                institutionId: selectedInstitutionId,
            });
        }
    };

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
        selectedInstitutionId ? [{ id: 'institution', value: [selectedInstitutionId] }] : [],
    );

    const isViewDenied = isPermissionDeniedError(error, 'subject_offerings:view');

    const institutionOptions = useInstitutionFacet({ institutions });
    const { data: sections = [] } = useSectionsQuery();
    const sectionLabelMap = useStableIdMap(sections, (section) => section.name);
    const columns = useStableValue(
        () =>
            createOfferedColumns({
                sectionLabelMap,
            }),
        [sectionLabelMap],
    );

    useDataTableFilterSync({
        columnFilters,
        syncKeys: ['institution'],
        onFilterChange: (key, value) => {
            if (key === 'institution') {
                setSelectedInstitutionId(value);
            }
        },
    });

    const facets = useStableValue(
        () => [
            {
                columnKey: 'origin',
                title: 'Origin',
                options: ['Inherited', 'Local', 'Overridden'].map((origin) => ({
                    label: origin,
                    value: origin,
                })),
            },
            {
                columnKey: 'institution',
                title: 'Institution',
                options: institutionOptions,
            },
            {
                columnKey: 'status',
                title: 'Status',
                options: ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'].map((status) => ({
                    label: status,
                    value: status,
                })),
            },
        ],
        [institutionOptions],
    );

    return (
        <SubjectPageShell
            title="Offered Subjects"
            description="Review all term-based subject offerings."
        >
            {isViewDenied ? (
                <PermissionDeniedState resourceName="subject offerings" className="h-[360px]" />
            ) : (
                <>
                    <DataTable
                        columns={columns}
                        data={offerings}
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        columnFilters={columnFilters}
                        onColumnFiltersChange={setColumnFilters}
                        searchPlaceholder="Search offered subjects..."
                        facets={facets}
                        isLoading={isLoading}
                        manualPagination
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        pageCount={pageCount}
                        totalCount={totalCount}
                        initialColumnVisibility={{ institution: false, origin: false }}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        getRowId={(offering) => offering.id}
                        toolbarActions={
                            selectedIds.length > 0 ? (
                                <PermissionGuard permission="subject_offerings:delete">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                        className="h-8"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete {selectedIds.length}
                                    </Button>
                                </PermissionGuard>
                            ) : null
                        }
                    />
                    {isError ? (
                        <div className="text-destructive bg-destructive/5 border-destructive/20 flex h-32 items-center justify-center rounded-md border">
                            Error loading offered subjects. Contact support if this continues.
                        </div>
                    ) : null}
                </>
            )}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Selected Subject Offerings?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedIds.length} selected subject
                            offering(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={deleteOfferingsMutation.isPending}
                        >
                            {deleteOfferingsMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SubjectPageShell>
    );
}
