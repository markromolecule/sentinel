import { type DbClient } from '@sentinel/db';
import { getAccessibleClassroomOrThrow } from '../../../core/classroom/services/classroom-access-query.service';
import { normalizeStudentNumbers } from './normalize-student-numbers';

export async function previewStudentEnrollmentData({
    dbClient,
    institutionId,
    userId,
    userRole,
    studentNumbers,
    classGroupId,
}: {
    dbClient: DbClient;
    institutionId: string;
    userId: string;
    userRole?: string;
    studentNumbers: string[];
    classGroupId?: string;
}) {
    const normalizedStudentNumbers = normalizeStudentNumbers(studentNumbers);

    if (!normalizedStudentNumbers.length) {
        return [];
    }

    const whitelistRecords = await dbClient
        .selectFrom('student_whitelist')
        .select(['student_number', 'claimed_user_id'])
        .where('institution_id', '=', institutionId)
        .where('student_number', 'in', normalizedStudentNumbers)
        .execute();

    const whitelistMap = new Map(
        whitelistRecords.map((record) => [record.student_number, record]),
    );
    const alreadyEnrolledStudentNumbers = new Set<string>();

    if (classGroupId) {
        await getAccessibleClassroomOrThrow(dbClient, {
            classGroupId,
            userId,
            institutionId,
            userRole,
        });

        const existingEnrollments = await dbClient
            .selectFrom('enrollments as e')
            .innerJoin('students as s', 's.student_id', 'e.student_id')
            .select('s.student_number')
            .where('e.class_group_id', '=', classGroupId)
            .where('s.institution_id', '=', institutionId)
            .where('s.student_number', 'in', normalizedStudentNumbers)
            .execute();

        existingEnrollments.forEach((record) => {
            if (record.student_number) {
                alreadyEnrolledStudentNumbers.add(record.student_number);
            }
        });
    }

    return normalizedStudentNumbers.map((studentNumber) => {
        const record = whitelistMap.get(studentNumber);

        if (!record) {
            return {
                studentNumber,
                claimStatus: 'NOT_WHITELISTED' as const,
                reason: 'Student not found in whitelist.',
            };
        }

        if (classGroupId && alreadyEnrolledStudentNumbers.has(studentNumber)) {
            return {
                studentNumber,
                claimStatus: 'ALREADY_ENROLLED' as const,
                reason: 'Student is already enrolled in the selected classroom.',
            };
        }

        if (!record.claimed_user_id) {
            return {
                studentNumber,
                claimStatus: 'UNCLAIMED' as const,
                reason: 'Account not yet claimed (ready to enroll).',
            };
        }

        return {
            studentNumber,
            claimStatus: 'CLAIMED' as const,
            reason: null,
        };
    });
}
