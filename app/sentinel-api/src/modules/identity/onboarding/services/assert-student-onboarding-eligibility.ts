import type { StudentOnboardingContext } from './load-student-onboarding-context';
import type { NormalizedStudentOnboardingInput } from './student-onboarding.types';

const normalizeLastName = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, '');

export function assertStudentOnboardingEligibility(
    context: StudentOnboardingContext,
    userId: string,
    studentData: NormalizedStudentOnboardingInput,
) {
    if (!context.whitelistRecord) {
        throw new Error(
            'Student number is not approved for onboarding in the selected institution.',
        );
    }

    if (context.whitelistRecord.status !== 'ACTIVE') {
        throw new Error('This whitelist record is not active.');
    }

    if (
        context.whitelistRecord.claimed_user_id &&
        context.whitelistRecord.claimed_user_id !== userId
    ) {
        throw new Error('This whitelist record has already been claimed by another account.');
    }

    if (normalizeLastName(context.whitelistRecord.last_name) !== studentData.normalizedLastName) {
        throw new Error('Last name does not match the approved whitelist record.');
    }

    if (context.whitelistRecord.department_id !== studentData.departmentId) {
        throw new Error(
            'Department does not match the approved whitelist record for this student.',
        );
    }

    if (context.whitelistRecord.course_id !== studentData.courseId) {
        throw new Error('Course does not match the approved whitelist record for this student.');
    }

    if (
        context.conflictingStudent &&
        context.conflictingStudent.user_id &&
        context.conflictingStudent.user_id !== userId
    ) {
        throw new Error(
            `Student number "${studentData.studentNumber}" is already registered to another account.`,
        );
    }

    if (!context.studentRole) {
        throw new Error('Student role not defined in the database.');
    }
}
