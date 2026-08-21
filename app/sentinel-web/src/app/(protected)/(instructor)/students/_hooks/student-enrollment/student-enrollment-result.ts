import type { EnrollmentResult } from '@sentinel/shared/types';
import type {
    StudentImportParseResult,
    StudentImportRow,
} from '@/app/(protected)/(instructor)/students/_types/enrollment-target';
import type {
    ParsedWorksheetResult,
    StudentEnrollmentPreviewResult,
} from './student-enrollment.types';

type EnrollmentFailure = EnrollmentResult['results'][number];

export function buildPreviewParseResult(
    parsedWorksheetResult: ParsedWorksheetResult,
    previewResults: StudentEnrollmentPreviewResult[],
): StudentImportParseResult {
    const previewMap = new Map(
        previewResults.map((previewResult) => [previewResult.studentNumber, previewResult]),
    );

    return {
        errors: parsedWorksheetResult.errors,
        students: parsedWorksheetResult.students.map((student) => {
            const preview = previewMap.get(student.studentNo);

            return {
                ...student,
                claimStatus: preview ? preview.claimStatus : 'NOT_WHITELISTED',
                reason: preview ? preview.reason : 'Student not found in whitelist.',
            };
        }),
    };
}

export function buildUnverifiedPreviewParseResult(
    parsedWorksheetResult: ParsedWorksheetResult,
    message: string,
): StudentImportParseResult {
    return {
        errors: [
            ...parsedWorksheetResult.errors,
            `Parsed the file, but couldn't verify claimed accounts yet: ${message}. If the API was just updated, restart the API server and try again.`,
        ],
        students: parsedWorksheetResult.students.map((student) => ({
            ...student,
            claimStatus: 'UNKNOWN',
            reason: "Claim status couldn't be verified yet.",
        })),
    };
}

export function getImportableStudents(students: StudentImportRow[]) {
    return students.filter(
        (student) => student.claimStatus === 'CLAIMED' || student.claimStatus === 'UNCLAIMED',
    );
}

export function getClaimedStudents(students: StudentImportRow[]) {
    return students.filter((student) => student.claimStatus === 'CLAIMED');
}

export function getUnclaimedStudents(students: StudentImportRow[]) {
    return students.filter((student) => student.claimStatus === 'UNCLAIMED');
}

export function getNonClaimedStudents(students: StudentImportRow[]) {
    return students.filter((student) => student.claimStatus !== 'CLAIMED');
}

export function buildFailedEnrollmentParseResult(
    currentParseResult: StudentImportParseResult,
    failedResults: EnrollmentFailure[],
): StudentImportParseResult {
    const failedResultsMap = new Map(
        failedResults.map((failedResult) => [failedResult.studentNumber, failedResult]),
    );

    return {
        students: currentParseResult.students
            .filter(
                (student) =>
                    student.claimStatus !== 'CLAIMED' || failedResultsMap.has(student.studentNo),
            )
            .map((student) => {
                const failedResult = failedResultsMap.get(student.studentNo);

                if (failedResult?.reason?.toLowerCase().includes('already enrolled')) {
                    return {
                        ...student,
                        claimStatus: 'ALREADY_ENROLLED' as const,
                        reason: failedResult.reason,
                    };
                }

                return student;
            }),
        errors: failedResults.map(
            (failedResult) =>
                `${failedResult.studentNumber}: ${failedResult.reason || 'Enrollment failed.'}`,
        ),
    };
}

export function buildRemainingNonClaimedParseResult(
    currentParseResult: StudentImportParseResult,
): StudentImportParseResult {
    return {
        students: getNonClaimedStudents(currentParseResult.students),
        errors: currentParseResult.errors,
    };
}
