import { type DbClient, type DB } from '@sentinel/db';
import { type Updateable } from 'kysely';
import { type UpdateUserBody } from '../user.dto';
import { HTTPException } from 'hono/http-exception';
import { getUserData } from './get-user';
import { resolveTargetUserRole } from './resolve-target-user-role';
import { syncInstructorCourses } from './sync-instructor-courses';
import { supportsInstructorCourseTable } from '../helper/instructor-course-compat';

export type UpdateUserDataArgs = {
    dbClient: DbClient;
    id: string;
    values: UpdateUserBody;
    requesterRole?: string;
};

export async function updateUserData({ dbClient, id, values, requesterRole }: UpdateUserDataArgs) {
    const supportsInstructorCourses = await supportsInstructorCourseTable(dbClient);
    const targetRole = await resolveTargetUserRole(dbClient, id);

    if (
        targetRole === 'superadmin' &&
        requesterRole !== 'support' &&
        requesterRole !== 'superadmin'
    ) {
        throw new HTTPException(403, {
            message: 'Forbidden: Cannot update superadmin account',
        });
    }

    if (requesterRole === 'support' && targetRole !== 'superadmin' && targetRole !== 'support') {
        throw new HTTPException(403, {
            message: 'Forbidden: Support can only update superadmin or support accounts',
        });
    }

    const existingProfile = await dbClient
        .selectFrom('user_profiles as up')
        .leftJoin('students as s', 's.user_id', 'up.user_id')
        .leftJoin('instructors as ins', 'ins.user_id', 'up.user_id')
        .where('up.user_id', '=', id)
        .select([
            'up.institution_id',
            'up.department_id',
            'up.course_id',
            's.student_number',
            'ins.employee_number',
            'ins.instructor_id',
        ])
        .executeTakeFirst();

    if (!existingProfile) {
        throw new HTTPException(404, { message: 'User profile not found' });
    }

    const existingInstructorCourseIds =
        supportsInstructorCourses && existingProfile.instructor_id
            ? (
                await dbClient
                    .selectFrom('instructor_courses')
                    .where('instructor_id', '=', existingProfile.instructor_id)
                    .select('course_id')
                    .execute()
            ).map((record) => record.course_id)
            : [];

    // 1. Update user_profiles
    const normalizeId = (value?: string | null) => (value && value !== '' ? value : null);
    const newRoleName = values.role?.toLowerCase() ?? targetRole ?? 'student';
    const normalizedCourseIds = Array.from(
        new Set(
            (newRoleName === 'instructor'
                ? values.courseIds?.length
                    ? supportsInstructorCourses
                        ? values.courseIds
                        : [values.courseIds[0]].filter(Boolean)
                    : values.course
                        ? [values.course]
                        : existingInstructorCourseIds.length
                            ? existingInstructorCourseIds
                            : existingProfile.course_id
                                ? [existingProfile.course_id]
                                : []
                : values.course !== undefined
                    ? values.course
                        ? [values.course]
                        : []
                    : existingProfile.course_id
                        ? [existingProfile.course_id]
                        : []
            ).filter(Boolean),
        ),
    );
    const primaryCourseId = normalizedCourseIds[0] ?? null;
    const profileUpdates: Updateable<DB['user_profiles']> = {
        updated_at: new Date().toISOString(),
    };

    if (values.firstName) profileUpdates.first_name = values.firstName;
    if (values.lastName) profileUpdates.last_name = values.lastName;
    if (values.institution !== undefined)
        profileUpdates.institution_id = normalizeId(values.institution);
    if (values.department !== undefined)
        profileUpdates.department_id = normalizeId(values.department);
    if (
        values.course !== undefined ||
        values.courseIds !== undefined ||
        values.role !== undefined
    ) {
        profileUpdates.course_id = primaryCourseId;
    }

    if (Object.keys(profileUpdates).length > 1) {
        await dbClient
            .updateTable('user_profiles')
            .set(profileUpdates)
            .where('user_id', '=', id)
            .execute();
    }

    // 2. Update user_roles if role changed
    if (values.role) {
        const roleRecord = await dbClient
            .selectFrom('roles')
            .where('role_name', '=', newRoleName)
            .select('role_id')
            .executeTakeFirst();

        if (!roleRecord) {
            throw new HTTPException(400, { message: `Invalid role: ${newRoleName}` });
        }

        // Replace existing role
        await dbClient.deleteFrom('user_roles').where('user_id', '=', id).execute();
        await dbClient
            .insertInto('user_roles')
            .values({ user_id: id, role_id: roleRecord.role_id })
            .execute();
    }

    // 3. Update Student/Instructor Records using Upserts
    const staffRoles = ['admin', 'instructor', 'proctor', 'disciplinary_officer'];
    const isStudent = newRoleName === 'student';
    const isStaff = newRoleName && staffRoles.includes(newRoleName);
    const resolvedInstitutionId =
        normalizeId(values.institution) ?? existingProfile.institution_id ?? null;
    const resolvedDepartmentId =
        normalizeId(values.department) ?? existingProfile.department_id ?? null;

    if (isStudent) {
        // Insert or Update student
        const studentNumber = values.studentNo ?? existingProfile.student_number ?? '';

        if (resolvedInstitutionId && studentNumber) {
            const conflictingStudent = await dbClient
                .selectFrom('students')
                .where('institution_id', '=', resolvedInstitutionId)
                .where('student_number', '=', studentNumber)
                .selectAll()
                .executeTakeFirst();

            if (
                conflictingStudent &&
                conflictingStudent.user_id &&
                conflictingStudent.user_id !== id
            ) {
                throw new Error(
                    `Student number "${studentNumber}" is already registered to another account.`,
                );
            }

            if (conflictingStudent && conflictingStudent.student_id) {
                await dbClient
                    .deleteFrom('students')
                    .where('user_id', '=', id)
                    .where('student_id', '!=', conflictingStudent.student_id)
                    .execute();
            }

            await dbClient
                .insertInto('students')
                .values({
                    user_id: id,
                    student_number: studentNumber,
                    department_id: resolvedDepartmentId,
                    course_id: primaryCourseId,
                    institution_id: resolvedInstitutionId,
                })
                .onConflict((oc) =>
                    oc.columns(['institution_id', 'student_number']).doUpdateSet({
                        user_id: id,
                        department_id: resolvedDepartmentId,
                        course_id: primaryCourseId,
                        updated_at: new Date(),
                    }),
                )
                .execute();

            // Sync student_whitelist claimed status if matching unclaimed record exists
            await dbClient
                .updateTable('student_whitelist')
                .set({
                    claimed_user_id: id,
                    claimed_at: new Date(),
                    updated_at: new Date(),
                    updated_by: id,
                })
                .where('institution_id', '=', resolvedInstitutionId)
                .where('student_number', '=', studentNumber)
                .where('claimed_user_id', 'is', null)
                .execute();
        } else {
            await dbClient
                .insertInto('students')
                .values({
                    user_id: id,
                    student_number: studentNumber,
                    department_id: resolvedDepartmentId,
                    course_id: primaryCourseId,
                    institution_id: resolvedInstitutionId,
                })
                .onConflict((oc) =>
                    oc.column('user_id').doUpdateSet({
                        student_number: studentNumber,
                        department_id: resolvedDepartmentId,
                        course_id: primaryCourseId,
                        institution_id: resolvedInstitutionId,
                    }),
                )
                .execute();
        }

        // Strict cleanup
        await dbClient.deleteFrom('instructors').where('user_id', '=', id).execute();
    } else if (isStaff) {
        // Upsert Instructor
        const instructorRecord = await dbClient
            .insertInto('instructors')
            .values({
                user_id: id,
                employee_number:
                    values.employeeNo ?? existingProfile.employee_number ?? `EMP-${id.slice(0, 8)}`,
                department_id: resolvedDepartmentId,
                course_id: primaryCourseId,
                institution_id: resolvedInstitutionId,
            })
            .onConflict((oc) =>
                oc.column('user_id').doUpdateSet({
                    employee_number:
                        values.employeeNo ??
                        existingProfile.employee_number ??
                        `EMP-${id.slice(0, 8)}`,
                    department_id: resolvedDepartmentId,
                    course_id: primaryCourseId,
                    institution_id: resolvedInstitutionId,
                }),
            )
            .returning('instructor_id')
            .executeTakeFirstOrThrow();

        await syncInstructorCourses({
            dbClient,
            instructorId: instructorRecord.instructor_id,
            courseIds: newRoleName === 'instructor' ? normalizedCourseIds : [],
        });

        // Cleanup
        await dbClient.deleteFrom('students').where('user_id', '=', id).execute();
    }

    // 4. Retrieve the updated data
    const profile = await dbClient
        .selectFrom('user_profiles')
        .where('user_id', '=', id)
        .select('institution_id')
        .executeTakeFirst();

    return await getUserData({
        dbClient,
        id,
        institutionId: profile?.institution_id ?? undefined,
        requesterRole,
    });
}

export type UpdateUserDataResponse = Awaited<ReturnType<typeof updateUserData>>;
