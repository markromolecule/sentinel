import { type DbClient } from '@sentinel/db';

const countDeletedRows = (result: { numDeletedRows?: bigint | number | string } | undefined) =>
    Number(result?.numDeletedRows ?? 0);

export const unenrollInstructorSubjectData = async ({
    dbClient,
    userId,
    subjectId,
    status,
    classGroupIds,
}: {
    dbClient: DbClient;
    userId: string;
    subjectId: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    classGroupIds?: string[];
}) => {
    if (!classGroupIds || classGroupIds.length === 0) {
        return {
            deletedRequestCount: 0,
            deletedClassRoleCount: 0,
            deletedInstructorAssignmentCount: 0,
            deletedCount: 0,
            classGroupIds: [],
        };
    }

    const requestedIds = Array.from(new Set(classGroupIds));
    const resolvedClassGroups = await dbClient
        .selectFrom('class_groups')
        .select('class_group_id')
        .where('subject_offering_id', '=', subjectId)
        .where((eb) =>
            eb.or([eb('class_group_id', 'in', requestedIds), eb('section_id', 'in', requestedIds)]),
        )
        .execute();

    const resolvedClassGroupIds = resolvedClassGroups.map(
        (classGroup) => classGroup.class_group_id,
    );

    if (resolvedClassGroupIds.length === 0) {
        return {
            deletedRequestCount: 0,
            deletedClassRoleCount: 0,
            deletedInstructorAssignmentCount: 0,
            deletedCount: 0,
            classGroupIds: [],
        };
    }

    // 1. Delete enrollment_requests
    let requestQuery = dbClient
        .deleteFrom('enrollment_requests')
        .where('user_id', '=', userId)
        .where('class_group_id', 'in', resolvedClassGroupIds);

    if (status) {
        requestQuery = requestQuery.where('status', '=', status);
    }

    const requestResult = await requestQuery.executeTakeFirst();
    let deletedClassRoleCount = 0;
    let deletedInstructorAssignmentCount = 0;

    // 3. Delete class_roles (only if they were already approved AND we are unenrolling approved or everything)
    if (!status || status === 'APPROVED') {
        const classRoleResult = await dbClient
            .deleteFrom('class_roles')
            .where('user_id', '=', userId)
            .where('class_group_id', 'in', resolvedClassGroupIds)
            .executeTakeFirst();

        // Also delete from classroom_instructor_assignments to remove them from teaching classrooms
        const instructorAssignmentResult = await dbClient
            .deleteFrom('classroom_instructor_assignments')
            .where('instructor_user_id', '=', userId)
            .where('class_group_id', 'in', resolvedClassGroupIds)
            .executeTakeFirst();

        deletedClassRoleCount = countDeletedRows(classRoleResult);
        deletedInstructorAssignmentCount = countDeletedRows(instructorAssignmentResult);
    }

    const deletedRequestCount = countDeletedRows(requestResult);
    const deletedCount =
        deletedRequestCount + deletedClassRoleCount + deletedInstructorAssignmentCount;

    return {
        deletedRequestCount,
        deletedClassRoleCount,
        deletedInstructorAssignmentCount,
        deletedCount,
        classGroupIds: resolvedClassGroupIds,
    };
};
