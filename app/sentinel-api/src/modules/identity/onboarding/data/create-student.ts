import { DbClient } from '@sentinel/db';
import { Insertable } from 'kysely';
import { DB } from '@sentinel/db';

export type CreateStudentDataArgs = {
    dbClient: DbClient;
    values: Insertable<DB['students']>;
};

export async function createStudentData({ dbClient, values }: CreateStudentDataArgs) {
    const createdRecord = await dbClient
        .insertInto('students')
        .values(values)
        .onConflict((oc) =>
            oc.columns(['institution_id', 'student_number']).doUpdateSet({
                user_id: values.user_id,
                department_id: values.department_id,
                course_id: values.course_id,
                updated_at: new Date(),
            }),
        )
        .returning([
            'student_id',
            'user_id',
            'student_number',
            'institution_id',
            'department_id',
            'course_id',
        ])
        .executeTakeFirstOrThrow();

    return {
        ...createdRecord,
        created_at: null,
    };
}

export type CreateStudentDataResponse = Awaited<ReturnType<typeof createStudentData>>;
