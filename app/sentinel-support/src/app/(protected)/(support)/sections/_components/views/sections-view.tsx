'use client';

import { useState, useMemo } from 'react';
import { ColumnFiltersState } from '@tanstack/react-table';
import {
    DataTable,
    PageHeader,
    PermissionDeniedState,
    Separator,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@sentinel/ui';
import { RevertPreviewDialog } from '@/app/(protected)/(support)/_components/revert-preview-dialog';
import { useSectionsPageState } from '@/app/(protected)/(support)/sections/_hooks/use-sections-page-state';
import { getSectionColumns } from '@/app/(protected)/(support)/sections/_components/tables/section-columns';
import { SectionFormDialog } from '@/app/(protected)/(support)/sections/_components/forms/section-form-dialog';
import { BulkCreateSectionsDialog } from '@/app/(protected)/(support)/sections/_components/dialogs/bulk-create-sections-dialog';
import {
    isPermissionDeniedError,
    useStableValue,
    useDeleteSectionsMutation,
    PermissionGuard,
} from '@sentinel/hooks';
import { useInstitutionFacet, useDataTableFilterSync } from '@/hooks';
import { Trash2 } from 'lucide-react';

export function SectionsView() {
    const {
        searchTerm,
        setSearchTerm,
        selectedInstitutionId,
        setSelectedInstitutionId,
        formOpen,
        setFormOpen,
        editingSectionId,
        setEditingSectionId,
        sectionToRevert,
        setSectionToRevert,
        form,
        namingConvention,
        institutions,
        sections,
        isLoading,
        isError,
        error,
        departments,
        courses,
        parentSection,
        handleEdit,
        handleDelete,
        handleRevert,
        onSubmit,
        createSectionMutation,
        updateSectionMutation,
        deleteSectionMutation,
        pagination,
        setPagination,
        pageCount,
        totalCount,
    } = useSectionsPageState();

    const [rowSelection, setRowSelection] = useState({});
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const deleteSectionsMutation = useDeleteSectionsMutation({
        onSuccess: () => {
            setIsDeleteDialogOpen(false);
            setRowSelection({});
        },
    });

    const selectedIds = useMemo(() => {
        return Object.keys(rowSelection)
            .filter((index) => rowSelection[index as keyof typeof rowSelection])
            .map((index) => sections[parseInt(index)]?.id)
            .filter(Boolean);
    }, [rowSelection, sections]);

    const handleBulkDelete = () => {
        if (selectedIds.length > 0) {
            deleteSectionsMutation.mutate(selectedIds);
        }
    };

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
        selectedInstitutionId ? [{ id: 'institution', value: [selectedInstitutionId] }] : [],
    );

    const isViewDenied = isPermissionDeniedError(error, 'sections:view');

    const columns = useMemo(
        () =>
            getSectionColumns({
                departments,
                courses,
                onEdit: handleEdit,
                onDelete: handleDelete,
                onRevert: setSectionToRevert,
            }),
        [departments, courses, handleEdit, handleDelete, setSectionToRevert],
    );

    const institutionOptions = useInstitutionFacet({ institutions });

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
        ],
        [institutionOptions],
    );

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <PageHeader title="Section Management" description="Manage template sections.">
                {!isViewDenied && (
                    <PermissionGuard permission="sections:create">
                        <div className="flex items-center gap-2">
                            <BulkCreateSectionsDialog
                                defaultInstitutionId={selectedInstitutionId}
                            />
                            <Button
                                onClick={() => {
                                    setEditingSectionId(null);
                                    form.reset({
                                        name: '',
                                        institution_id: selectedInstitutionId || '',
                                        department_id: '',
                                        course_id: '',
                                        year_level: undefined,
                                    });
                                    setFormOpen(true);
                                }}
                                className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                            >
                                Add Section
                            </Button>
                        </div>
                    </PermissionGuard>
                )}
            </PageHeader>
            <Separator />

            {isViewDenied ? (
                <PermissionDeniedState resourceName="sections" className="h-[360px]" />
            ) : (
                <>
                    <DataTable
                        columns={columns}
                        data={sections}
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        columnFilters={columnFilters}
                        onColumnFiltersChange={setColumnFilters}
                        searchPlaceholder="Search sections..."
                        facets={facets}
                        isLoading={isLoading}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        pageCount={pageCount}
                        totalCount={totalCount}
                        manualPagination={true}
                        toolbarActions={
                            selectedIds.length > 0 ? (
                                <PermissionGuard permission="sections:delete">
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
                            Error loading sections. Contact support if this continues.
                        </div>
                    ) : null}
                </>
            )}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Selected Sections?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedIds.length} selected
                            section(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={deleteSectionsMutation.isPending}
                        >
                            {deleteSectionsMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SectionFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editingSectionId={editingSectionId}
                form={form}
                institutions={institutions}
                departments={departments}
                courses={courses}
                namingConvention={namingConvention}
                isPending={createSectionMutation.isPending || updateSectionMutation.isPending}
                onSubmit={onSubmit}
            />

            <RevertPreviewDialog
                open={Boolean(sectionToRevert)}
                onOpenChange={(open) => {
                    if (!open) setSectionToRevert(null);
                }}
                title="Revert section override?"
                description="Review the parent template value that will become effective after this local override is removed."
                fields={[
                    {
                        label: 'Section',
                        currentValue: sectionToRevert?.name,
                        parentValue: parentSection?.name,
                    },
                    {
                        label: 'Year level',
                        currentValue: sectionToRevert?.yearLevel,
                        parentValue: parentSection?.yearLevel,
                    },
                    {
                        label: 'Department',
                        currentValue:
                            sectionToRevert?.departmentName ||
                            departments.find(
                                (department) => department.id === sectionToRevert?.departmentId,
                            )?.name ||
                            sectionToRevert?.departmentId,
                        parentValue:
                            departments.find(
                                (department) => department.id === parentSection?.departmentId,
                            )?.name ?? parentSection?.departmentId,
                    },
                    {
                        label: 'Course',
                        currentValue:
                            sectionToRevert?.courseTitle ||
                            sectionToRevert?.courseCode ||
                            courses.find((course) => course.id === sectionToRevert?.courseId)
                                ?.title ||
                            sectionToRevert?.courseId,
                        parentValue:
                            courses.find((course) => course.id === parentSection?.courseId)
                                ?.title ?? parentSection?.courseId,
                    },
                ]}
                isPending={deleteSectionMutation.isPending}
                onConfirm={handleRevert}
            />
        </div>
    );
}
