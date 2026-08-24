import { executeTransaction, type DbClient } from '@sentinel/db';

export async function deleteStudentWhitelistData({
    dbClient,
    id,
    institutionId,
    studentNumber,
}: {
    dbClient: DbClient;
    id: string;
    institutionId: string;
    studentNumber: string;
}) {
    await executeTransaction(dbClient, async (trx) => {
        await trx
            .deleteFrom('students')
            .where('institution_id', '=', institutionId)
            .where('student_number', '=', studentNumber)
            .where('user_id', 'is', null)
            .execute();

        await trx
            .deleteFrom('student_whitelist')
            .where('whitelist_id', '=', id)
            .executeTakeFirstOrThrow();
    });
}
