import { type DbClient } from '@sentinel/db';

export type DeactivateActiveRubricArgs = {
    dbClient: DbClient;
    scope: 'BASELINE' | 'EXAM_OVERRIDE';
    examId?: string | null;
};

/**
 * Locks and deactivates the currently active rubric version for a given scope.
 * Should be called within a transaction to guarantee atomic replacement.
 *
 * @param args - Database client, scope, and optional exam ID.
 * @returns The rubric version ID of the deactivated row, or null if none was active.
 */
export async function deactivateActiveRubric({
    dbClient,
    scope,
    examId = null,
}: DeactivateActiveRubricArgs) {
    let selectQuery = dbClient
        .selectFrom('essay_rubric_versions')
        .select('rubric_version_id')
        .where('scope', '=', scope)
        .where('is_active', '=', true)
        .forUpdate();

    if (scope === 'EXAM_OVERRIDE') {
        if (!examId) {
            throw new Error('examId is required for EXAM_OVERRIDE scope');
        }
        selectQuery = selectQuery.where('exam_id', '=', examId);
    } else {
        selectQuery = selectQuery.where('exam_id', 'is', null);
    }

    const activeRow = await selectQuery.executeTakeFirst();

    if (activeRow) {
        await dbClient
            .updateTable('essay_rubric_versions')
            .set({ is_active: false, updated_at: new Date() })
            .where('rubric_version_id', '=', activeRow.rubric_version_id)
            .execute();
        return activeRow.rubric_version_id;
    }

    return null;
}
