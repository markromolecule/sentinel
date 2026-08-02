import { type DbClient } from '@sentinel/db';

export const unapproveEnrollmentRequestData = async ({
    dbClient,
    requestIds,
}: {
    dbClient: DbClient;
    requestIds: string[];
}) => {
    const results: string[] = [];
    const uniqueRequestIds = Array.from(new Set(requestIds));

    const instructorRole = await dbClient
        .selectFrom('roles')
        .select('role_id')
        .where('role_name', '=', 'instructor')
        .executeTakeFirst();

    if (!instructorRole) {
        throw new Error('Instructor role not defined in the database.');
    }

    for (const requestId of uniqueRequestIds) {
        const request = await dbClient
            .selectFrom('enrollment_requests')
            .select(['class_group_id', 'user_id', 'status'])
            .where('request_id', '=', requestId)
            .executeTakeFirst();

        if (!request) {
            throw new Error(`Enrollment request ${requestId} not found`);
        }

        if (request.status !== 'APPROVED') {
            continue;
        }

        await dbClient
            .deleteFrom('class_roles')
            .where('class_group_id', '=', request.class_group_id)
            .where('user_id', '=', request.user_id)
            .where('role_id', '=', instructorRole.role_id)
            .execute();

        await dbClient
            .deleteFrom('classroom_instructor_assignments')
            .where('class_group_id', '=', request.class_group_id)
            .where('instructor_user_id', '=', request.user_id)
            .execute();

        await dbClient
            .updateTable('enrollment_requests')
            .set({
                status: 'PENDING',
                updated_at: new Date(),
                approved_by: null,
            })
            .where('request_id', '=', requestId)
            .execute();

        results.push(requestId);
    }

    return results;
};
