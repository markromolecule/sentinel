import { type DbClient } from '@sentinel/db';
import { EnrollStudentsBody } from '../enrollments.dto';
import { getAccessibleClassroomOrThrow } from '../../../core/classroom/services/classroom-access-query.service';
import { normalizeStudentNumbers } from './normalize-student-numbers';

export async function enrollStudentsData({
    dbClient,
    institutionId,
    userId,
    userRole,
    payload,
}: {
    dbClient: DbClient;
    institutionId: string;
    userId: string;
    userRole?: string;
    payload: EnrollStudentsBody;
}) {
    const classGroupId = payload.classGroupId;
    const studentNumbers = normalizeStudentNumbers(payload.studentNumbers);

    await getAccessibleClassroomOrThrow(dbClient, {
        classGroupId,
        userId,
        institutionId,
        userRole,
    });

    if (!studentNumbers.length) {
        return {
            enrolledCount: 0,
            failedCount: 0,
            results: [],
        };
    }

    // 1. Get Class Group context (Subject and Section)
    const classGroup = await dbClient
        .selectFrom('class_groups as cg')
        .leftJoin('subjects as s', 's.subject_id', 'cg.subject_id')
        .leftJoin('sections as sec', 'sec.section_id', 'cg.section_id')
        .select([
            'cg.class_group_id',
            's.subject_id',
            'sec.department_id as section_department_id',
            'sec.course_id as section_course_id',
        ])
        .where('cg.class_group_id', '=', classGroupId)
        .executeTakeFirst();

    if (!classGroup) {
        throw new Error('Class group not found.');
    }

    // 2. Fetch Whitelist records for these students
    const whitelistRecords = await dbClient
        .selectFrom('student_whitelist')
        .selectAll()
        .where('institution_id', '=', institutionId)
        .where('student_number', 'in', studentNumbers)
        .execute();

    const studentRecords = await dbClient
        .selectFrom('students')
        .select(['student_id', 'user_id', 'student_number'])
        .where('institution_id', '=', institutionId)
        .where('student_number', 'in', studentNumbers)
        .execute();

    const studentMap = new Map(
        studentRecords.map((studentRecord) => [studentRecord.student_number, studentRecord]),
    );

    const existingEnrollmentRows =
        studentRecords.length > 0
            ? await dbClient
                  .selectFrom('enrollments')
                  .select('student_id')
                  .where('class_group_id', '=', classGroupId)
                  .where(
                      'student_id',
                      'in',
                      studentRecords.map((studentRecord) => studentRecord.student_id),
                  )
                  .execute()
            : [];
    const existingEnrollmentStudentIds = new Set(
        existingEnrollmentRows
            .map((enrollment) => enrollment.student_id)
            .filter((studentId): studentId is string => Boolean(studentId)),
    );

    const results: { studentNumber: string; status: 'SUCCESS' | 'FAILED'; reason?: string }[] = [];
    let enrolledCount = 0;
    let failedCount = 0;

    for (const studentNumber of studentNumbers) {
        const whitelist = whitelistRecords.find((w) => w.student_number === studentNumber);

        if (!whitelist) {
            results.push({
                studentNumber,
                status: 'FAILED',
                reason: 'Student not found in whitelist.',
            });
            failedCount++;
            continue;
        }

        // Validation: Existing on the course & department
        if (
            classGroup.section_department_id &&
            whitelist.department_id !== classGroup.section_department_id
        ) {
            results.push({ studentNumber, status: 'FAILED', reason: 'Department mismatch.' });
            failedCount++;
            continue;
        }

        if (classGroup.section_course_id && whitelist.course_id !== classGroup.section_course_id) {
            results.push({ studentNumber, status: 'FAILED', reason: 'Course mismatch.' });
            failedCount++;
            continue;
        }

        // 3. Find or create student record
        let student = studentMap.get(studentNumber);

        try {
            if (!student) {
                const created = await dbClient
                    .insertInto('students')
                    .values({
                        student_number: whitelist.student_number,
                        institution_id: whitelist.institution_id,
                        department_id: whitelist.department_id,
                        course_id: whitelist.course_id,
                        user_id: whitelist.claimed_user_id ?? null,
                    })
                    .onConflict((oc) =>
                        oc.columns(['institution_id', 'student_number']).doUpdateSet({
                            department_id: whitelist.department_id,
                            course_id: whitelist.course_id,
                            user_id: whitelist.claimed_user_id ?? null,
                            updated_at: new Date(),
                        }),
                    )
                    .returning(['student_id', 'user_id', 'student_number'])
                    .executeTakeFirstOrThrow();

                student = created;
                studentMap.set(studentNumber, student);
            } else if (whitelist.claimed_user_id && !student.user_id) {
                await dbClient
                    .updateTable('students')
                    .set({
                        user_id: whitelist.claimed_user_id,
                        updated_at: new Date(),
                    })
                    .where('student_id', '=', student.student_id)
                    .execute();

                student.user_id = whitelist.claimed_user_id;
            }

            if (existingEnrollmentStudentIds.has(student.student_id)) {
                results.push({
                    studentNumber,
                    status: 'FAILED',
                    reason: 'Student is already enrolled in the selected classroom.',
                });
                failedCount++;
                continue;
            }

            // 4. Enroll the student
            await dbClient
                .insertInto('enrollments')
                .values({
                    class_group_id: classGroupId,
                    student_id: student.student_id,
                })
                .onConflict((oc) => oc.columns(['class_group_id', 'student_id']).doNothing())
                .execute();

            results.push({ studentNumber, status: 'SUCCESS' });
            enrolledCount++;
            existingEnrollmentStudentIds.add(student.student_id);
        } catch (error: any) {
            results.push({
                studentNumber,
                status: 'FAILED',
                reason: error?.message || 'Failed to enroll.',
            });
            failedCount++;
        }
    }

    return {
        enrolledCount,
        failedCount,
        results,
    };
}
