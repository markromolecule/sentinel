'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CLASSROOM_QUERY_KEYS } from '@sentinel/shared/constants';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@sentinel/ui';
import { FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentEnrollment } from '@/app/(protected)/(instructor)/students/_hooks/use-student-enrollment';
import { EnrollmentDropzone } from '@/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-dropzone';
import { EnrollmentSummary } from '@/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-summary';
import { EnrollmentPreview } from '@/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-preview';
import { enrollStudentNumbers } from '@/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-api';

type ClassroomStudentEnrollmentDialogProps = {
    open: boolean;
    onOpenChangeAction: (open: boolean) => void;
    classroomId: string;
    classroomName: string;
    subjectLabel: string;
    sectionLabel: string;
};

type EnrollmentResult = {
    enrolledCount: number;
    failedCount: number;
    results: Array<{
        studentNumber: string;
        status: 'SUCCESS' | 'FAILED';
        reason?: string;
    }>;
};

export function ClassroomStudentEnrollmentDialog({
    open,
    onOpenChangeAction,
    classroomId,
    classroomName,
    subjectLabel,
    sectionLabel,
}: ClassroomStudentEnrollmentDialogProps) {
    const queryClient = useQueryClient();
    const [studentNumber, setStudentNumber] = useState('');
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);
    const {
        file,
        parseResult,
        isLoading,
        processFile,
        refreshPreview,
        enrollStudents,
        resetState,
    } = useStudentEnrollment({
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: CLASSROOM_QUERY_KEYS.details(classroomId),
            });
            await queryClient.invalidateQueries({ queryKey: CLASSROOM_QUERY_KEYS.all });
            await queryClient.invalidateQueries({ queryKey: ['instructor-students'] });
            onOpenChangeAction(false);
        },
    });

    useEffect(() => {
        if (!file || !open) {
            return;
        }

        void refreshPreview(classroomId);
    }, [classroomId, file, open, refreshPreview]);

    const handleClose = () => {
        resetState();
        setStudentNumber('');
        onOpenChangeAction(false);
    };

    const handleManualSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!studentNumber.trim()) {
            toast.error('Student number is required.');
            return;
        }

        setIsSubmittingManual(true);

        try {
            const result: EnrollmentResult = await enrollStudentNumbers({
                studentNumbers: [studentNumber.trim()],
                classGroupId: classroomId,
            });

            const failure = result.results.find((row) => row.status === 'FAILED');

            if (failure) {
                toast.error(failure.reason || 'Failed to enroll student.');
                return;
            }

            await queryClient.invalidateQueries({
                queryKey: CLASSROOM_QUERY_KEYS.details(classroomId),
            });
            await queryClient.invalidateQueries({ queryKey: CLASSROOM_QUERY_KEYS.all });
            await queryClient.invalidateQueries({ queryKey: ['instructor-students'] });
            setStudentNumber('');
            toast.success('Student enrolled successfully');
            onOpenChangeAction(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to enroll student.';
            toast.error(message);
        } finally {
            setIsSubmittingManual(false);
        }
    };

    const importableStudents =
        parseResult?.students.filter(
            (student) =>
                student.claimStatus === 'CLAIMED' || student.claimStatus === 'UNCLAIMED',
        ) || [];
    const claimedStudentCount = importableStudents.filter(
        (student) => student.claimStatus === 'CLAIMED',
    ).length;
    const unclaimedStudentCount = importableStudents.filter(
        (student) => student.claimStatus === 'UNCLAIMED',
    ).length;
    const hasUnverifiedStudents =
        parseResult?.students.some((student) => student.claimStatus === 'UNKNOWN') ?? false;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col overflow-y-auto sm:max-w-4xl lg:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Add Students</DialogTitle>
                    <DialogDescription>
                        Enroll student accounts into{' '}
                        <span className="font-medium">{classroomName}</span>. Both claimed and
                        unclaimed whitelisted accounts will be added.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/30 rounded-lg border p-4 text-sm">
                    <div className="font-medium">{subjectLabel}</div>
                    <div className="text-muted-foreground">{sectionLabel}</div>
                </div>

                <Tabs defaultValue="manual" className="flex w-full flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="import">Import File</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="py-4">
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="classroom-student-number">Student Number</Label>
                                <Input
                                    id="classroom-student-number"
                                    placeholder="2024-00123"
                                    value={studentNumber}
                                    onChange={(event) => setStudentNumber(event.target.value)}
                                />
                                <p className="text-muted-foreground text-xs">
                                    The student must exist on the institutional whitelist.
                                    Unclaimed accounts will automatically activate when the student
                                    claims their account.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmittingManual || !studentNumber.trim()}
                                    className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                                >
                                    {isSubmittingManual ? 'Adding...' : 'Add Student'}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="import" className="space-y-4 py-4">
                        {!file ? (
                            <EnrollmentDropzone onFileSelectAction={processFile} />
                        ) : (
                            <div className="space-y-4">
                                <div className="border-border bg-muted/50 flex items-start justify-between gap-3 rounded-lg border p-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#323d8f]" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">{file.name}</p>
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
                                            Processing enrollment file...
                                        </p>
                                    </div>
                                ) : parseResult ? (
                                    <div className="space-y-4">
                                        <EnrollmentSummary result={parseResult} />
                                        <EnrollmentPreview students={parseResult.students} />
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => enrollStudents(classroomId)}
                                disabled={
                                    !parseResult ||
                                    importableStudents.length === 0 ||
                                    hasUnverifiedStudents ||
                                    isLoading
                                }
                                className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                            >
                                {isLoading
                                    ? 'Processing...'
                                    : importableStudents.length > 0
                                      ? `Import ${importableStudents.length} Students (${claimedStudentCount} Claimed, ${unclaimedStudentCount} Unclaimed)`
                                      : 'Import Students'}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
