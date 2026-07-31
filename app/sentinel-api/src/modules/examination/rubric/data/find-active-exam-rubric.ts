import { type DbClient } from '@sentinel/db';

/**
 * Finds the currently active override rubric version for a specific exam.
 *
 * @param dbClient - Kysely database client.
 * @param examId - The UUID of the exam.
 * @returns The active exam override rubric or undefined if not found.
 */
export async function findActiveExamRubric(dbClient: DbClient, examId: string) {
    return await dbClient
        .selectFrom('essay_rubric_versions')
        .selectAll()
        .where('exam_id', '=', examId)
        .where('scope', '=', 'EXAM_OVERRIDE')
        .where('is_active', '=', true)
        .executeTakeFirst();
}
