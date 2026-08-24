import { type DbClient, type DB } from '@sentinel/db';
import { type Insertable } from 'kysely';
import { syncInstructorCourses } from './sync-instructor-courses';
import { supportsInstructorCourseTable } from '../helper/instructor-course-compat';

export type CreateUserDataArgs = {
    dbClient: DbClient;
    userId: string;
    profile: Insertable<DB['user_profiles']>;
    student?: Insertable<DB['students']>;
    instructor?: Insertable<DB['instructors']>;
    instructorCourseIds?: string[];
    email: string;
    role: string;
};

export async function createUserData({
    dbClient,
    userId,
    profile,
    student,
    instructor,
    instructorCourseIds = [],
    email,
    role,
}: CreateUserDataArgs) {
    const supportsInstructorCourses = await supportsInstructorCourseTable(dbClient);

    // 1. Upsert user profile (handle trigger conflicts)
    await dbClient
        .insertInto('user_profiles')
        .values({
            ...profile,
            user_id: userId,
            status: 'ACTIVE',
        })
        .onConflict((oc: any) =>
            oc.column('user_id').doUpdateSet({
                ...profile,
                status: 'ACTIVE',
            }),
        )
        .execute();

    // 2. Create student record if role is student
    if (role === 'student' && student) {
        if (student.institution_id && student.student_number) {
            const existingStudent = await dbClient
                .selectFrom('students')
                .where('institution_id', '=', student.institution_id)
                .where('student_number', '=', student.student_number)
                .selectAll()
                .executeTakeFirst();

            if (existingStudent && existingStudent.user_id && existingStudent.user_id !== userId) {
                throw new Error(
                    `Student number "${student.student_number}" is already registered to another account.`,
                );
            }

            await dbClient
                .insertInto('students')
                .values({
                    ...student,
                    user_id: userId,
                })
                .onConflict((oc: any) =>
                    oc.columns(['institution_id', 'student_number']).doUpdateSet({
                        ...student,
                        user_id: userId,
                        updated_at: new Date(),
                    }),
                )
                .execute();

            // Sync student_whitelist claimed status if matching unclaimed record exists
            await dbClient
                .updateTable('student_whitelist')
                .set({
                    claimed_user_id: userId,
                    claimed_at: new Date(),
                    updated_at: new Date(),
                    updated_by: userId,
                })
                .where('institution_id', '=', student.institution_id)
                .where('student_number', '=', student.student_number)
                .where('claimed_user_id', 'is', null)
                .execute();
        } else {
            await dbClient
                .insertInto('students')
                .values({
                    ...student,
                    user_id: userId,
                })
                .onConflict((oc: any) =>
                    oc.column('user_id').doUpdateSet({
                        ...student,
                    }),
                )
                .execute();
        }
    }

    // 2.1 Create instructor record if role is staff
    const staffRoles = ['admin', 'instructor', 'proctor', 'disciplinary_officer'];
    let instructorRecord: { instructor_id: string } | undefined;

    if (staffRoles.includes(role.toLowerCase()) && instructor) {
        instructorRecord = await dbClient
            .insertInto('instructors')
            .values({
                ...instructor,
                user_id: userId,
            })
            .onConflict((oc: any) =>
                oc.column('user_id').doUpdateSet({
                    ...instructor,
                }),
            )
            .returning('instructor_id')
            .executeTakeFirstOrThrow();

        await syncInstructorCourses({
            dbClient,
            instructorId: instructorRecord.instructor_id,
            courseIds: role.toLowerCase() === 'instructor' ? instructorCourseIds : [],
        });
    }

    // 3. Assign role in user_roles
    const normalizedRole = role.toLowerCase();
    const roleRecord = await dbClient
        .selectFrom('roles')
        .select('role_id')
        .where('role_name', '=', normalizedRole)
        .executeTakeFirst();

    if (roleRecord) {
        await dbClient
            .insertInto('user_roles')
            .values({
                user_id: userId,
                role_id: roleRecord.role_id as any,
            })
            .onConflict((oc) => oc.columns(['user_id', 'role_id']).doNothing())
            .execute();
    }

    // 4. Build response using dbClient to fetch human-readable names
    const deptId = profile.department_id ?? student?.department_id ?? instructor?.department_id;
    const crsId = profile.course_id ?? student?.course_id ?? (instructor as any)?.course_id;
    const selectedCourseIds = Array.from(
        new Set(
            role.toLowerCase() === 'instructor' && supportsInstructorCourses
                ? instructorCourseIds
                : crsId
                  ? [crsId]
                  : [],
        ),
    );

    const d = deptId
        ? await dbClient
              .selectFrom('departments')
              .where('department_id', '=', deptId)
              .select(['department_name', 'department_code'])
              .executeTakeFirst()
        : null;

    const selectedCourses = selectedCourseIds.length
        ? await dbClient
              .selectFrom('courses')
              .where('course_id', 'in', selectedCourseIds)
              .select(['course_id', 'title'])
              .orderBy('title', 'asc')
              .execute()
        : [];

    const i = profile.institution_id
        ? await dbClient
              .selectFrom('institutions')
              .where('id', '=', profile.institution_id)
              .select('name')
              .executeTakeFirst()
        : null;

    return {
        user_id: userId,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email,
        role,
        department: d?.department_code?.trim() ?? d?.department_name?.trim() ?? null,
        departmentCode: d?.department_code?.trim() ?? null,
        course: selectedCourses.map((course) => course.title?.trim()).join(', ') || null,
        courseId: crsId,
        courseIds: selectedCourseIds,
        courses: selectedCourses.map((course) => course.title?.trim()),
        studentNo: student?.student_number ?? null,
        employeeNo: instructor?.employee_number ?? null,
        institution: i?.name ?? null,
        institution_id: profile.institution_id ?? null,
        status: 'active',
        created_at: new Date(),
        updated_at: null,
        created_by: null,
        updated_by: null,
    };
}

export type CreateUserDataResponse = Awaited<ReturnType<typeof createUserData>>;
