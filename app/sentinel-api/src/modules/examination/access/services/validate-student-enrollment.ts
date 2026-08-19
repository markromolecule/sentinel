import { type DbClient } from '@sentinel/db';
import { EntitlementsRepository } from '../data/entitlements.repository';
import type { ExamAccessEligibility } from '../access.dto';

/**
 * Validates whether the student is actively enrolled in the targeted subject, section, or classroom.
 *
 * @param args - The enrollment validation parameters.
 * @returns An eligibility result object.
 */
export async function validateStudentEnrollment(args: {
    dbClient: DbClient;
    resolvedStudent: {
        student_id: string;
    };
    resolvedExam: {
        remediation_id?: string | null;
        class_group_id?: string | null;
        subject_id: string | null;
        section_id?: string | null;
        assigned_section_ids: string[] | null;
    };
    startsAt: Date | null;
    endsAt: Date | null;
}): Promise<{ isEligible: true } | { isEligible: false; errorResponse: ExamAccessEligibility }> {
    const { dbClient, resolvedStudent, resolvedExam, startsAt, endsAt } = args;
    const isRemediationExam = Boolean(resolvedExam.remediation_id);

    const isEnrolled = isRemediationExam
        ? true
        : await EntitlementsRepository.hasStudentExamEnrollment(dbClient, {
            studentId: resolvedStudent.student_id,
            classGroupId: resolvedExam.class_group_id,
            subjectId: resolvedExam.subject_id!,
            sectionId: resolvedExam.section_id,
            sectionIds: resolvedExam.assigned_section_ids,
        });

    if (!isEnrolled) {
        return {
            isEligible: false,
            errorResponse: {
                isEligible: false,
                reason: 'Student is not actively enrolled in the exam subject or assigned section.',
                reasonCode: 'CLOSED',
                runtimeAccess: {
                    state: 'closed',
                    reasonCode: 'CLOSED',
                    message:
                        'Student is not actively enrolled in the exam subject or assigned section.',
                    canStart: false,
                    canResume: false,
                    hasActiveAttempt: false,
                    startsAt,
                    endsAt,
                    reopenedUntil: null,
                },
            },
        };
    }

    return { isEligible: true };
}
