import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { unenrollInstructorSubjectData } from '../data/unenroll-instructor-subject';
import { LogsService } from '../../../general/logs/logs.service';

export type UnenrollInstructorSubjectServiceArgs = {
    dbClient: DbClient;
    userId: string;
    subjectId: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    classGroupIds?: string[];
};

/**
 * Removes an instructor from a subject offering (and optionally specific class
 * groups). Logs a telemetry event against the instructor's institution.
 *
 * @param args.dbClient - Database client
 * @param args.userId - Instructor user ID
 * @param args.subjectId - Subject offering ID
 * @param args.status - Optional request status filter
 * @param args.classGroupIds - Optional class group scope
 * @returns Data access result
 */
export async function unenrollInstructorSubjectService({
    dbClient,
    userId,
    subjectId,
    status,
    classGroupIds,
}: UnenrollInstructorSubjectServiceArgs) {
    const result = await unenrollInstructorSubjectData({
        dbClient,
        userId,
        subjectId,
        status,
        classGroupIds,
    });

    if (result.deletedCount === 0) {
        throw new HTTPException(404, {
            message: 'No matching instructor assignment found to unenroll.',
        });
    }

    try {
        const profile = await dbClient
            .selectFrom('user_profiles')
            .select(['institution_id'])
            .where('user_id', '=', userId)
            .executeTakeFirst();

        if (profile?.institution_id) {
            await LogsService.createLog(dbClient, {
                userId: userId,
                action: 'enrollment.deleted',
                resourceType: 'enrollment',
                resourceId: subjectId,
                activeInstitutionId: profile.institution_id,
                details: { subjectId, classGroupIds: result.classGroupIds, status },
            });
        }
    } catch (logErr) {
        console.error('Failed to log instructor enrollment.deleted:', logErr);
    }

    return result;
}

export type UnenrollInstructorSubjectServiceResponse = Awaited<
    ReturnType<typeof unenrollInstructorSubjectService>
>;
