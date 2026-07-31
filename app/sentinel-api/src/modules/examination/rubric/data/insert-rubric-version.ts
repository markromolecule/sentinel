import { type DbClient, type DB } from '@sentinel/db';
import { type Insertable } from 'kysely';

export type InsertRubricVersionArgs = {
    dbClient: DbClient;
    values: Insertable<DB['essay_rubric_versions']>;
};

/**
 * Inserts a new essay rubric version row.
 *
 * @param args - Database client and values to insert.
 * @returns The inserted rubric version record.
 */
export async function insertRubricVersion({ dbClient, values }: InsertRubricVersionArgs) {
    return await dbClient
        .insertInto('essay_rubric_versions')
        .values(values)
        .returningAll()
        .executeTakeFirstOrThrow();
}
