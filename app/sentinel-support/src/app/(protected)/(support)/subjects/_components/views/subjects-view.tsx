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
import { RevertPreviewDialog } from '@/app/(protected)/(support)/_components/revert-preview-dialog';
import { useSubjectsPageState } from '@/app/(protected)/(support)/subjects/_hooks/use-subjects-page-state';
import { getSubjectColumns } from '@/app/(protected)/(support)/subjects/_components/tables/subject-columns';
import { SubjectFormDialog } from '@/app/(protected)/(support)/subjects/_components/forms/subject-form-dialog';
import { BulkUploadDialog } from '@/app/(protected)/(support)/subjects/_components/dialogs/bulk-upload-dialog';
import { DeleteSubjectDialog } from '@/app/(protected)/(support)/subjects/_components/dialogs/delete-subject-dialog';
import { SubjectPageShell } from '@/app/(protected)/(support)/subjects/_components/layout';
import {
    isPermissionDeniedError,
    useStableValue,
    useDeleteSelectedSubjectsMutation,
    PermissionGuard,
} from '@sentinel/hooks';
import { useInstitutionFacet } from '@/hooks';
import { getSubjectId } from '@/app/(protected)/(support)/subjects/_hooks/use-subjects-page-state/_types';
import { MasterSubject } from '@sentinel/shared/types';
import { Plus, Trash2 } from 'lucide-react';

export function SubjectsView() {
    const {
        searchTerm,
        setSearchTerm,
        selectedInstitutionId,
        setSelectedInstitutionId,
        pagination,
        setPagination,
        totalCount,
        pageCount,
        formOpen,
        setFormOpen,
        form,
        setForm,
        subjectToRevert,
        setSubjectToRevert,
        institutions,
        subjects,
        isLoading,
        isError,
        error,
        parentSubject,
        handleCreate,
        handleEdit,
        handleRevert,
        submitForm,
        createSubjectMutation,
        updateSubjectMutation,
        deleteSubjectMutation,
    } = useSubjectsPageState();

    const [rowSelection, setRowSelection] = useState({});
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<MasterSubject | null>(null);

    const deleteSelectedSubjectsMutation = useDeleteSelectedSubjectsMutation({
        onSuccess: () => {
            setIsDeleteDialogOpen(false);
            setRowSelection({});
        },
    });

    const selectedIds = useMemo(() => {
        return Object.keys(rowSelection)
            .filter((index) => rowSelection[index as keyof typeof rowSelection])
            .map((index) => {
                const subject = subjects[parseInt(index)];
                return getSubjectId(subject);
            })
            .filter(Boolean) as string[];
    }, [rowSelection, subjects]);

    const handleBulkDelete = () => {
        if (selectedIds.length > 0) {
            deleteSelectedSubjectsMutation.mutate(selectedIds);
        }
    };

    const handleConfirmDeleteSubject = () => {
        if (!subjectToDelete) return;

        const subjectId = getSubjectId(subjectToDelete);
        if (!subjectId) return;

        deleteSubjectMutation.mutate(
            {
                id: subjectId,
                institutionId: selectedInstitutionId || undefined,
            },
            {
                onSuccess: () => setSubjectToDelete(null),
            },
        );
    };

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const isViewDenied = isPermissionDeniedError(error, 'subjects:view');

    const resolvedColumnFilters = useMemo(() => {
        const filters = columnFilters.filter((filter) => filter.id !== 'institution');

        if (selectedInstitutionId) {
            filters.unshift({
                id: 'institution',
                value: [selectedInstitutionId],
            });
        }

        return filters;
    }, [columnFilters, selectedInstitutionId]);

    const handleColumnFiltersChange = (nextFilters: ColumnFiltersState) => {
        const institutionFilter = nextFilters.find((filter) => filter.id === 'institution');

        setSelectedInstitutionId(
            Array.isArray(institutionFilter?.value) ? institutionFilter?.value[0] : undefined,
        );
        setColumnFilters(nextFilters.filter((filter) => filter.id !== 'institution'));
    };

    const columns = useMemo(
        () =>
            getSubjectColumns({
                onEdit: handleEdit,
                onDelete: setSubjectToDelete,
                onRevert: setSubjectToRevert,
            }),
        [handleEdit, setSubjectToRevert],
    );

    const institutionOptions = useInstitutionFacet({ institutions });

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
        ],
        [institutionOptions],
    );

    return (
        <SubjectPageShell
            title="Subject List"
            description="Browse and manage the institutional subject catalog."
            actions={
                !isViewDenied ? (
                    <PermissionGuard permission="subjects:create">
                        <div className="flex items-center gap-3">
                            <BulkUploadDialog
                                institutions={institutions}
                                defaultInstitutionId={selectedInstitutionId}
                            />
                            <Button onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Subject
                            </Button>
                        </div>
                    </PermissionGuard>
                ) : null
            }
        >
            {isViewDenied ? (
                <PermissionDeniedState resourceName="subjects" className="h-[360px]" />
            ) : (
                <>
                    <DataTable
                        columns={columns}
                        data={subjects}
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        columnFilters={resolvedColumnFilters}
                        onColumnFiltersChange={handleColumnFiltersChange}
                        searchPlaceholder="Search subjects..."
                        facets={facets}
                        isLoading={isLoading}
                        manualPagination
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        pageCount={pageCount}
                        totalCount={totalCount}
                        initialColumnVisibility={{ institution: false }}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        toolbarActions={
                            selectedIds.length > 0 ? (
                                <PermissionGuard permission="subjects:delete">
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
                            Error loading subjects. Contact support if this continues.
                        </div>
                    ) : null}
                </>
            )}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Selected Subjects?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedIds.length} selected
                            subject(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={deleteSelectedSubjectsMutation.isPending}
                        >
                            {deleteSelectedSubjectsMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteSubjectDialog
                open={Boolean(subjectToDelete)}
                subject={subjectToDelete}
                isDeleting={deleteSubjectMutation.isPending}
                onOpenChange={(open) => {
                    if (!open && !deleteSubjectMutation.isPending) {
                        setSubjectToDelete(null);
                    }
                }}
                onConfirm={handleConfirmDeleteSubject}
            />

            <SubjectFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                form={form}
                setForm={setForm}
                onSubmit={submitForm}
                isPending={createSubjectMutation.isPending || updateSubjectMutation.isPending}
                institutions={institutions}
            />

            <RevertPreviewDialog
                open={Boolean(subjectToRevert)}
                onOpenChange={(open) => {
                    if (!open) setSubjectToRevert(null);
                }}
                title="Revert subject override?"
                description="Review the parent template value that will become effective after this local override is removed."
                fields={[
                    {
                        label: 'Code',
                        currentValue: subjectToRevert?.code,
                        parentValue: parentSubject?.code,
                    },
                    {
                        label: 'Title',
                        currentValue: subjectToRevert?.title,
                        parentValue: parentSubject?.title,
                    },
                    {
                        label: 'Classifications',
                        currentValue: subjectToRevert?.classifications
                            ?.map((classification) => classification.name)
                            .join(', '),
                        parentValue: parentSubject?.classifications
                            ?.map((classification) => classification.name)
                            .join(', '),
                    },
                ]}
                isPending={deleteSubjectMutation.isPending}
                onConfirm={handleRevert}
            />
        </SubjectPageShell>
    );
}
