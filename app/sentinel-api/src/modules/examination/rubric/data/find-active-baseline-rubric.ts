import { type DbClient } from '@sentinel/db';

/**
 * Finds the currently active baseline rubric version.
 *
 * @param dbClient - Kysely database client.
 * @returns The active baseline rubric or undefined if not found.
 */
export async function findActiveBaselineRubric(dbClient: DbClient) {
    return await dbClient
        .selectFrom('essay_rubric_versions')
        .selectAll()
        .where('scope', '=', 'BASELINE')
        .where('is_active', '=', true)
        .executeTakeFirst();
}
