'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CLASSROOM_QUERY_KEYS } from '@sentinel/shared/constants';
import type { StudentImportParseResult } from '@/app/(protected)/(instructor)/students/_types/enrollment-target';
import {
    enrollStudentNumbers,
    previewStudentEnrollments,
} from '@/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-api';
import {
    INVALID_ENROLLMENT_FILE_ERROR,
    parseEnrollmentFile,
} from '@/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-parser';
import {
    buildFailedEnrollmentParseResult,
    buildPreviewParseResult,
    buildRemainingNonClaimedParseResult,
    buildUnverifiedPreviewParseResult,
    getClaimedStudents,
    getImportableStudents,
    getNonClaimedStudents,
    getUnclaimedStudents,
} from '@/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-result';
import type { ParsedWorksheetResult } from '@/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment.types';

interface UseStudentEnrollmentProps {
    onSuccess?: () => void;
}

export function useStudentEnrollment({ onSuccess }: UseStudentEnrollmentProps = {}) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [parsedWorksheetResult, setParsedWorksheetResult] =
        useState<ParsedWorksheetResult | null>(null);
    const [parseResult, setParseResult] = useState<StudentImportParseResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const resetState = useCallback(() => {
        setFile(null);
        setParsedWorksheetResult(null);
        setParseResult(null);
    }, []);

    const previewParsedWorksheet = useCallback(
        async (parsedResult: ParsedWorksheetResult, classGroupId?: string) => {
            if (!parsedResult.students.length) {
                setParseResult({
                    students: [],
                    errors: parsedResult.errors,
                });
                return;
            }

            try {
                const previewResults = await previewStudentEnrollments(
                    parsedResult.students,
                    classGroupId,
                );

                setParseResult(buildPreviewParseResult(parsedResult, previewResults));
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Couldn't verify claimed and unclaimed accounts.";

                setParseResult(buildUnverifiedPreviewParseResult(parsedResult, message));
                toast.error(
                    "Couldn't verify claimed accounts yet. Restart the API server if it was just updated.",
                );
            }
        },
        [],
    );

    const processFile = useCallback(
        async (selectedFile: File) => {
            setFile(selectedFile);
            setIsLoading(true);

            let parsedResult: ParsedWorksheetResult;

            try {
                parsedResult = await parseEnrollmentFile(selectedFile);
            } catch {
                setParseResult({
                    students: [],
                    errors: [INVALID_ENROLLMENT_FILE_ERROR],
                });
                setIsLoading(false);
                return;
            }

            if (!parsedResult.students.length) {
                setParsedWorksheetResult(parsedResult);
                setParseResult({
                    students: [],
                    errors: parsedResult.errors,
                });
                setIsLoading(false);
                return;
            }

            setParsedWorksheetResult(parsedResult);

            try {
                await previewParsedWorksheet(parsedResult);
            } finally {
                setIsLoading(false);
            }
        },
        [previewParsedWorksheet],
    );

    const refreshPreview = useCallback(
        async (classGroupId?: string) => {
            if (!parsedWorksheetResult) {
                return;
            }

            setIsLoading(true);

            try {
                await previewParsedWorksheet(parsedWorksheetResult, classGroupId);
            } finally {
                setIsLoading(false);
            }
        },
        [parsedWorksheetResult, previewParsedWorksheet],
    );

    const enrollStudents = useCallback(
        async (classGroupId: string) => {
            if (!parseResult || parseResult.students.length === 0) return;

            setIsLoading(true);
            try {
                const importableStudents = getImportableStudents(parseResult.students);

                if (importableStudents.length === 0) {
                    toast.error('No whitelisted students are ready to enroll.');
                    return;
                }

                const claimedCount = getClaimedStudents(importableStudents).length;
                const unclaimedCount = getUnclaimedStudents(importableStudents).length;

                const result = await enrollStudentNumbers({
                    studentNumbers: importableStudents.map((student) => student.studentNo),
                    classGroupId,
                });
                const failedResults = result.results.filter((row) => row.status === 'FAILED');

                if (result.enrolledCount > 0) {
                    await queryClient.invalidateQueries({
                        queryKey: ['instructor-students'],
                    });
                    await queryClient.invalidateQueries({
                        queryKey: CLASSROOM_QUERY_KEYS.all,
                    });
                }

                if (failedResults.length > 0) {
                    setParseResult((current) =>
                        current
                            ? buildFailedEnrollmentParseResult(current, failedResults)
                            : current,
                    );

                    if (result.enrolledCount > 0) {
                        toast.success(
                            `Enrolled ${result.enrolledCount} student(s) (${claimedCount} claimed, ${unclaimedCount} pending claim).`,
                        );
                    }

                    toast.error(`Failed to enroll ${result.failedCount} student(s).`);
                } else {
                    toast.success(
                        `Enrolled ${result.enrolledCount} student(s) successfully (${claimedCount} claimed, ${unclaimedCount} pending claim).`,
                    );
                    onSuccess?.();
                }
            } catch (error: unknown) {
                const message =
                    error instanceof Error ? error.message : 'Failed to enroll students';
                toast.error(message);
            } finally {
                setIsLoading(false);
            }
        },
        [onSuccess, parseResult, queryClient],
    );

    return {
        file,
        parseResult,
        isLoading,
        processFile,
        refreshPreview,
        enrollStudents,
        resetState,
    };
}
