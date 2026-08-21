import { useState } from 'react';
import {
    useCoursesQuery,
    useDepartmentsQuery,
    useStableValue,
    useBulkUnenrollInstructorSubjectsMutation,
} from '@sentinel/hooks';
import { type Subject } from '@sentinel/shared/types';
import {
    type ColumnDef,
    type PaginationState,
    type RowSelectionState,
    type VisibilityState,
} from '@tanstack/react-table';
import { columns as defaultColumns } from '@/app/(protected)/(instructor)/subjects/_components/tables/columns';
import { SubjectsTable } from '@/app/(protected)/(instructor)/subjects/_components/tables/subjects-table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
} from '@sentinel/ui';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type SubjectsListProps = {
    subjects: Subject[];
    columns?: (args?: { showSelection?: boolean }) => ColumnDef<Subject>[];
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    pageCount?: number;
    totalCount?: number;
    manualPagination?: boolean;
    initialColumnVisibility?: VisibilityState;
};

export function SubjectsList({
    subjects,
    columns = defaultColumns,
    searchTerm,
    onSearchChange,
    pagination,
    onPaginationChange,
    pageCount,
    totalCount,
    manualPagination = false,
    initialColumnVisibility,
}: SubjectsListProps) {
    const { data: departments = [] } = useDepartmentsQuery();
    const { data: courses = [] } = useCoursesQuery();

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [unenrollOpen, setUnenrollOpen] = useState(false);

    const selectedSubjects = useStableValue(
        () => subjects.filter((_, index) => rowSelection[String(index)]),
        [subjects, rowSelection],
    );

    const selectedPayload = useStableValue(
        () =>
            selectedSubjects.map((subject) => ({
                id: subject.subjectOfferingId || subject.id,
                status: subject.status,
                classGroupIds: subject.sectionIds,
            })),
        [selectedSubjects],
    );

    const bulkUnenroll = useBulkUnenrollInstructorSubjectsMutation({
        onSuccess: () => {
            setUnenrollOpen(false);
            setRowSelection({});
            toast.success(`Successfully unenrolled from ${selectedPayload.length} subjects`);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to unenroll from some subjects');
        },
    });

    const toolbarActions = useStableValue(
        () =>
            selectedPayload.length > 0 ? (
                <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                    onClick={() => setUnenrollOpen(true)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Unenroll Selected ({selectedPayload.length})
                </Button>
            ) : null,
        [selectedPayload.length],
    );

    const facets = [
        {
            columnKey: 'department_code',
            title: 'Dept',
            options: departments
                .filter((dept) => !!dept.code)
                .map((dept) => ({
                    label: dept.code!,
                    value: dept.code!,
                })),
        },
        {
            columnKey: 'course_code',
            title: 'Course',
            options: courses
                .filter((course) => !!course.code)
                .map((course) => ({
                    label: course.code!,
                    value: course.code!,
                })),
        },
    ];

    return (
        <>
            <SubjectsTable
                columns={columns}
                data={subjects}
                searchValue={searchTerm}
                onSearchChange={onSearchChange}
                facets={facets}
                pagination={pagination}
                onPaginationChange={onPaginationChange}
                pageCount={pageCount}
                totalCount={totalCount}
                manualPagination={manualPagination}
                initialColumnVisibility={initialColumnVisibility}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                toolbarActions={toolbarActions}
            />

            {selectedPayload.length > 0 && (
                <AlertDialog open={unenrollOpen} onOpenChange={setUnenrollOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Unenroll from selected subjects?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will unenroll you from {selectedPayload.length} selected
                                subject
                                {selectedPayload.length === 1 ? '' : 's'} across all assigned
                                sections. Any pending enrollment requests for these subjects will
                                also be canceled.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={bulkUnenroll.isPending}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90 text-white"
                                disabled={bulkUnenroll.isPending}
                                onClick={(event) => {
                                    event.preventDefault();
                                    bulkUnenroll.mutate(selectedPayload);
                                }}
                            >
                                {bulkUnenroll.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Unenrolling...
                                    </>
                                ) : (
                                    `Unenroll Selected (${selectedPayload.length})`
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
