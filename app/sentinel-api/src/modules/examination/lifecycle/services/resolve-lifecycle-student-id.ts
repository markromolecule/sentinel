import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';

/**
 * Resolves a lifecycle route/student payload ID into the canonical students.student_id value.
 * Accepts either a student record ID or the linked user ID.
 */
export async function resolveLifecycleStudentId(
    dbClient: DbClient,
    studentIdOrUserId: string,
): Promise<string> {
    const student = await dbClient
        .selectFrom('students')
        .select(['student_id'])
        .where((eb) =>
            eb.or([
                eb('student_id', '=', studentIdOrUserId),
                eb('user_id', '=', studentIdOrUserId),
            ]),
        )
        .executeTakeFirst();

    if (!student) {
        throw new HTTPException(404, {
            message: 'Student not found.',
        });
    }

    return student.student_id;
}
