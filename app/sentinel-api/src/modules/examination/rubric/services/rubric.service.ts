import { type DbClient } from '@sentinel/db';
import { LEGACY_ESSAY_RUBRIC, type EssayRubricDefinition } from '@sentinel/shared';
import { findActiveExamRubric } from '../data/find-active-exam-rubric';
import { findActiveBaselineRubric } from '../data/find-active-baseline-rubric';
import { deactivateActiveRubric } from '../data/deactivate-active-rubric';
import { insertRubricVersion } from '../data/insert-rubric-version';
import type { ResolvedEssayRubric } from '../rubric.dto';

export class RubricService {
    /**
     * Helper to safely execute a callback inside a Kysely transaction, falling back if not supported.
     */
    static async executeWithTransactionFallback<T>(
        db: DbClient,
        callback: (trx: DbClient) => Promise<T>,
    ): Promise<T> {
        if (typeof db.transaction !== 'function') {
            return callback(db);
        }

        try {
            return await db.transaction().execute(callback);
        } catch (error) {
            if (error instanceof Error && error.message.includes('does not support transactions')) {
                return callback(db);
            }

            throw error;
        }
    }

    /**
     * Resolves the effective essay rubric for a given exam.
     *
     * @param dbClient - Database client.
     * @param examId - The UUID of the exam (optional).
     * @returns The resolved effective rubric metadata and definition.
     */
    static async resolveEffectiveEssayRubric(
        dbClient: DbClient,
        examId?: string | null,
    ): Promise<ResolvedEssayRubric> {
        if (examId) {
            const activeOverride = await findActiveExamRubric(dbClient, examId);
            if (activeOverride) {
                return {
                    rubricVersionId: activeOverride.rubric_version_id,
                    versionNumber: activeOverride.version_number,
                    source: 'EXAM_OVERRIDE',
                    definition: activeOverride.definition as unknown as EssayRubricDefinition,
                };
            }
        }

        const activeBaseline = await findActiveBaselineRubric(dbClient);
        if (activeBaseline) {
            return {
                rubricVersionId: activeBaseline.rubric_version_id,
                versionNumber: activeBaseline.version_number,
                source: 'BASELINE',
                definition: activeBaseline.definition as unknown as EssayRubricDefinition,
            };
        }

        return {
            rubricVersionId: null,
            versionNumber: null,
            source: 'LEGACY',
            definition: LEGACY_ESSAY_RUBRIC,
        };
    }

    /**
     * Transactionally creates a new essay rubric version.
     *
     * @param dbClient - Database client.
     * @param scope - BASELINE or EXAM_OVERRIDE.
     * @param examId - The UUID of the exam (optional).
     * @param definition - The rubric definition details.
     * @param createdBy - The user ID creating this version.
     * @returns The created rubric version record.
     */
    static async createEssayRubricVersion(
        dbClient: DbClient,
        scope: 'BASELINE' | 'EXAM_OVERRIDE',
        examId: string | null,
        definition: EssayRubricDefinition,
        createdBy: string,
    ) {
        return await this.executeWithTransactionFallback(dbClient, async (trx) => {
            let versionQuery = trx
                .selectFrom('essay_rubric_versions')
                .select(trx.fn.max('version_number').as('max_version'))
                .where('scope', '=', scope);

            if (scope === 'EXAM_OVERRIDE') {
                if (!examId) {
                    throw new Error('examId is required for EXAM_OVERRIDE scope');
                }
                versionQuery = versionQuery.where('exam_id', '=', examId);
            } else {
                versionQuery = versionQuery.where('exam_id', 'is', null);
            }

            const versionResult = await versionQuery.executeTakeFirst();
            const nextVersion = (Number(versionResult?.max_version) || 0) + 1;

            const supersededId = await deactivateActiveRubric({
                dbClient: trx,
                scope,
                examId,
            });

            const newVersion = await insertRubricVersion({
                dbClient: trx,
                values: {
                    scope,
                    exam_id: examId,
                    version_number: nextVersion,
                    definition: JSON.stringify(definition),
                    is_active: true,
                    supersedes_version_id: supersededId,
                    created_by: createdBy,
                    updated_at: new Date(),
                },
            });

            return newVersion;
        });
    }
}
