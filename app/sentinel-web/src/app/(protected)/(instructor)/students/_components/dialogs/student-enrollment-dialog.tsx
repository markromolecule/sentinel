'use client';

import { useEffect } from 'react';
import { useStableValue } from '@sentinel/hooks';
import { Button } from '@sentinel/ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@sentinel/ui';
import { FileSpreadsheet, X } from 'lucide-react';
import { useStudentEnrollment } from '@/app/(protected)/(instructor)/students/_hooks/use-student-enrollment';
import { EnrollmentDropzone } from '@/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-dropzone';
import { EnrollmentSummary } from '@/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-summary';
import { EnrollmentPreview } from '@/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-preview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sentinel/ui';
import { ManualEntryForm } from '@/app/(protected)/(instructor)/students/_components/forms/manual-entry-form';
import { EnrollmentDetails } from '@/app/(protected)/(instructor)/students/_components/forms/enrollment-details';
import { useManualEntry } from '@/app/(protected)/(instructor)/students/_hooks/use-manual-entry';

type StudentEnrollmentDialogProps = {
    open: boolean;
    onOpenChangeAction: (open: boolean) => void;
};

export function StudentEnrollmentDialog({
    open,
    onOpenChangeAction,
}: StudentEnrollmentDialogProps) {
    const handleClose = () => {
        resetState();
        onOpenChangeAction(false);
    };

    const {
        file,
        parseResult,
        isLoading: isParsing,
        processFile,
        refreshPreview,
        enrollStudents,
        resetState,
    } = useStudentEnrollment({
        onSuccess: handleClose,
    });

    // We reuse the subject selection logic from useManualEntry for the import tab target
    const {
        selectedSubjectId,
        selectedClassGroupId,
        handleSubjectSelect,
        section,
        setSection,
        handleSectionSelect,
        yearLevel,
        setYearLevel,
        term,
        setTerm,
        subjects,
        filteredSections,
        isYearLevelLocked,
        isLoading: isEnrolling,
    } = useManualEntry({ onSuccess: () => {} });

    useEffect(() => {
        if (!file || !selectedClassGroupId) {
            return;
        }

        void refreshPreview(selectedClassGroupId);
    }, [file, refreshPreview, selectedClassGroupId]);

    const handleImport = async () => {
        if (!selectedSubjectId || !section || !selectedClassGroupId) {
            console.error('Subject and Section are required for import');
            return;
        }

        await enrollStudents(selectedClassGroupId);
    };

    const isLoading = isParsing || isEnrolling;
    const importableStudentCount = useStableValue(
        () =>
            parseResult?.students.filter(
                (student) =>
                    student.claimStatus === 'CLAIMED' || student.claimStatus === 'UNCLAIMED',
            ).length || 0,
        [parseResult],
    );
    const claimedStudentCount = useStableValue(
        () =>
            parseResult?.students.filter((student) => student.claimStatus === 'CLAIMED').length ||
            0,
        [parseResult],
    );
    const unclaimedStudentCount = useStableValue(
        () =>
            parseResult?.students.filter((student) => student.claimStatus === 'UNCLAIMED').length ||
            0,
        [parseResult],
    );
    const hasUnverifiedStudents = useStableValue(
        () => parseResult?.students.some((student) => student.claimStatus === 'UNKNOWN') ?? false,
        [parseResult],
    );

    return (
        <Dialog open={open} onOpenChange={handleClose} modal={true}>
            <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col overflow-y-auto outline-hidden sm:max-w-4xl lg:max-w-5xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Add Students</DialogTitle>
                    <DialogDescription>
                        Add students manually or upload a CSV/Excel file.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="manual" className="flex w-full flex-col">
                    <TabsList className="grid w-full shrink-0 grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="import">Import File</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 py-4">
                        <ManualEntryForm onSuccess={handleClose} />
                    </TabsContent>

                    <TabsContent value="import" className="space-y-4 py-4">
                        <div className="min-w-0 space-y-4">
                            {!file ? (
                                <EnrollmentDropzone onFileSelectAction={processFile} />
                            ) : (
                                /* File Preview */
                                <div className="min-w-0 space-y-4">
                                    {/* Selected File */}
                                    <div className="border-border bg-muted/50 flex min-w-0 items-start justify-between gap-3 rounded-lg border p-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#323d8f]" />
                                            <div className="min-w-0">
                                                <p className="text-foreground text-sm font-medium">
                                                    {file.name}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={resetState}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {isLoading ? (
                                        <div className="py-4 text-center">
                                            <p className="text-muted-foreground text-sm">
                                                {isParsing
                                                    ? 'Parsing file...'
                                                    : 'Enrolling students...'}
                                            </p>
                                        </div>
                                    ) : parseResult ? (
                                        <div className="min-w-0 space-y-6">
                                            <div className="border-border bg-muted/30 space-y-3 rounded-lg border p-4">
                                                <p className="text-sm font-medium">
                                                    Target Enrollment Details
                                                </p>
                                                <EnrollmentDetails
                                                    subjects={subjects}
                                                    selectedSubjectId={selectedSubjectId}
                                                    onSubjectSelect={handleSubjectSelect}
                                                    filteredSections={filteredSections}
                                                    section={section}
                                                    setSection={setSection}
                                                    onSectionSelect={handleSectionSelect}
                                                    yearLevel={yearLevel}
                                                    setYearLevel={setYearLevel}
                                                    term={term}
                                                    setTerm={setTerm}
                                                    isYearLevelLocked={isYearLevelLocked}
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <EnrollmentSummary result={parseResult} />
                                                <EnrollmentPreview
                                                    students={parseResult.students}
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {/* Import Actions */}
                        <div className="bg-background sticky bottom-0 flex flex-wrap justify-end gap-3 border-t pt-4">
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={
                                    !parseResult ||
                                    importableStudentCount === 0 ||
                                    hasUnverifiedStudents ||
                                    !selectedSubjectId ||
                                    !section ||
                                    !selectedClassGroupId ||
                                    isLoading
                                }
                                className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                            >
                                {isLoading
                                    ? 'Processing...'
                                    : importableStudentCount > 0
                                      ? `Import ${importableStudentCount} Students (${claimedStudentCount} Claimed, ${unclaimedStudentCount} Unclaimed)`
                                      : 'Import Students'}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
