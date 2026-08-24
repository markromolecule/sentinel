import { executeTransaction, type DbClient } from '@sentinel/db';

type UnclaimedWhitelistPlaceholderKey = {
    institution_id: string;
    student_number: string;
};

async function deleteUnclaimedPlaceholderStudents({
    dbClient,
    records,
}: {
    dbClient: DbClient;
    records: UnclaimedWhitelistPlaceholderKey[];
}) {
    if (records.length === 0) {
        return;
    }

    await dbClient
        .deleteFrom('students')
        .where('user_id', 'is', null)
        .where((eb) =>
            eb.or(
                records.map((record) =>
                    eb.and([
                        eb('institution_id', '=', record.institution_id),
                        eb('student_number', '=', record.student_number),
                    ]),
                ),
            ),
        )
        .execute();
}

export async function purgeStudentWhitelistData({
    dbClient,
    institutionId,
    departmentId,
    courseId,
    status,
    includeClaimed,
}: {
    dbClient: DbClient;
    institutionId?: string;
    departmentId?: string;
    courseId?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
    includeClaimed?: boolean;
}) {
    let selectQuery = dbClient
        .selectFrom('student_whitelist')
        .select(['whitelist_id', 'claimed_user_id', 'institution_id', 'student_number']);

    if (institutionId) {
        selectQuery = selectQuery.where('institution_id', '=', institutionId);
    }

    if (departmentId) {
        selectQuery = selectQuery.where('department_id', '=', departmentId);
    }

    if (courseId) {
        selectQuery = selectQuery.where('course_id', '=', courseId);
    }

    if (status) {
        selectQuery = selectQuery.where('status', '=', status);
    }

    const matchingRecords = await selectQuery.execute();
    const claimedRecords = matchingRecords.filter((record) => !!record.claimed_user_id);
    const deletableIds = matchingRecords
        .filter((record) => includeClaimed || !record.claimed_user_id)
        .map((record) => record.whitelist_id);
    const unclaimedPlaceholderKeys = matchingRecords
        .filter((record) => !record.claimed_user_id)
        .map((record) => ({
            institution_id: record.institution_id,
            student_number: record.student_number,
        }));

    if (deletableIds.length > 0) {
        await executeTransaction(dbClient, async (trx) => {
            await deleteUnclaimedPlaceholderStudents({
                dbClient: trx,
                records: unclaimedPlaceholderKeys,
            });

            await trx
                .deleteFrom('student_whitelist')
                .where('whitelist_id', 'in', deletableIds)
                .execute();
        });
    }

    return {
        deletedCount: deletableIds.length,
        skippedClaimedCount: includeClaimed ? 0 : claimedRecords.length,
    };
}
