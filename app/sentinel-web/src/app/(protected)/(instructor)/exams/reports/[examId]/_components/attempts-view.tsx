import * as React from 'react';
import type { ExamReport, ExamReportStudentSummary } from '@sentinel/shared/types';
import {
    DataTable,
    FacetedFilter,
    Button,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@sentinel/ui';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { CalendarPlus } from 'lucide-react';
import { BatchMakeupDialog } from './batch-makeup-dialog';

type AttemptsViewProps = {
    report: ExamReport;
    columns: ColumnDef<any>[];
    searchValue: string;
    setSearchValue: (v: string) => void;
    sectionFilter: string | undefined;
    setSectionFilter: (v: string | undefined) => void;
    sectionOptions: readonly (readonly [string, string])[];
    studentPage: number;
    setStudentPage: (page: number) => void;
    pageSize: number;
    onFinalizeAll?: () => Promise<void> | void;
    isFinalizingAll?: boolean;
    onRefresh?: () => void;
};


/**
 * Renders the Attempt Summary View containing:
 * - A descriptive header
 * - The primary Attempts DataTable (with custom search handler, manual pagination,
 *   column visibility defaults, and a section FacetedFilter inside the toolbar actions).
 */
export function AttemptsView({
    report,
    columns,
    searchValue,
    setSearchValue,
    sectionFilter,
    setSectionFilter,
    sectionOptions,
    studentPage,
    setStudentPage,
    pageSize,
    onFinalizeAll,
    isFinalizingAll,
    onRefresh,
}: AttemptsViewProps) {
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [isBatchMakeupOpen, setIsBatchMakeupOpen] = React.useState(false);
    const hasSubmittedAttempts = report.summary.totalSubmitted > 0;

    const selectedStudents: ExamReportStudentSummary[] = React.useMemo(() => {
        return Object.keys(rowSelection)
            .filter((key) => rowSelection[key])
            .map((indexStr) => report.students[Number(indexStr)])
            .filter((s): s is ExamReportStudentSummary => Boolean(s));
    }, [rowSelection, report.students]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Attempt Summary Report</h2>
                    <p className="text-muted-foreground text-sm">
                        Absentees stay in the list so instructors can manage makeup and retake
                        workflows in one place.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedStudents.length > 0 && (
                        <Button
                            variant="default"
                            className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                            onClick={() => setIsBatchMakeupOpen(true)}
                        >
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            Schedule Group Make-Up ({selectedStudents.length})
                        </Button>
                    )}
                    {onFinalizeAll && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-[#323d8f] text-[#323d8f] hover:bg-[#323d8f]/10"
                                    disabled={!hasSubmittedAttempts || isFinalizingAll}
                                >
                                    {isFinalizingAll ? 'Finalizing...' : 'Finalize All'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Finalize All Submissions</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to finalize all submitted attempts for
                                        this exam? This will release the final grades and feedback to
                                        all students. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={onFinalizeAll}
                                        className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                                    >
                                        Confirm Finalize
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            <DataTable
                columns={columns}
                data={report.students}
                searchKey="name"
                searchPlaceholder="Search student..."
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                manualPagination
                pageCount={Math.max(report.studentsPagination.totalPages, 1)}
                totalCount={report.studentsPagination.total}
                pagination={{
                    pageIndex: studentPage - 1,
                    pageSize,
                }}
                onPaginationChange={(state) => setStudentPage(state.pageIndex + 1)}
                initialColumnVisibility={{ startedAt: false }}
                toolbarActions={
                    <FacetedFilter
                        title="Section"
                        options={sectionOptions.map(([id, name]) => ({
                            label: name,
                            value: id,
                        }))}
                        selectedValues={sectionFilter ? new Set([sectionFilter]) : new Set()}
                        onSelect={(val) => {
                            setSectionFilter(sectionFilter === val ? undefined : val);
                        }}
                        onClear={() => setSectionFilter(undefined)}
                    />
                }
            />

            <BatchMakeupDialog
                open={isBatchMakeupOpen}
                onOpenChange={setIsBatchMakeupOpen}
                examId={report.exam.id}
                students={selectedStudents}
                onSuccess={() => {
                    setRowSelection({});
                    onRefresh?.();
                }}
            />
        </div>
    );
}

