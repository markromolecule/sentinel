import { describe, expect, it } from 'vitest';
import { testWithDbClient } from '../../../../lib/test-with-db-client';
import { RubricService } from './rubric.service';
import { LEGACY_ESSAY_RUBRIC, type EssayRubricDefinition } from '@sentinel/shared';
import { deactivateActiveRubric } from '../data/deactivate-active-rubric';

describe('RubricService', () => {
    testWithDbClient(
        'should resolve to legacy rubric when no active baseline or override exists',
        async ({ dbClient }) => {
            // Find or create test exam and user
            const testUser = await dbClient
                .selectFrom('users')
                .selectAll()
                .limit(1)
                .executeTakeFirst();
            const testExam = await dbClient
                .selectFrom('exams')
                .selectAll()
                .limit(1)
                .executeTakeFirst();

            expect(testUser).toBeDefined();
            expect(testExam).toBeDefined();

            // Deactivate any baseline and overrides to guarantee legacy resolution
            await dbClient.updateTable('essay_rubric_versions').set({ is_active: false }).execute();

            const resolved = await RubricService.resolveEffectiveEssayRubric(
                dbClient,
                testExam!.exam_id,
            );
            expect(resolved.rubricVersionId).toBeNull();
            expect(resolved.versionNumber).toBeNull();
            expect(resolved.source).toBe('LEGACY');
            expect(resolved.definition).toEqual(LEGACY_ESSAY_RUBRIC);
        },
    );

    testWithDbClient(
        'should resolve to baseline rubric when active baseline exists and no override',
        async ({ dbClient }) => {
            const testUser = await dbClient
                .selectFrom('users')
                .selectAll()
                .limit(1)
                .executeTakeFirst();
            const testExam = await dbClient
                .selectFrom('exams')
                .selectAll()
                .limit(1)
                .executeTakeFirst();

            // Deactivate all first
            await dbClient.updateTable('essay_rubric_versions').set({ is_active: false }).execute();

            const baselineDef: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'content',
                        name: 'Content Quality',
                        weight: 1.0,
                        levels: {
                            '4': 'Exceptional content',
                            '3': 'Good content',
                            '2': 'Fair content',
                            '1': 'Poor content',
                            '0': 'No content',
                        },
                    },
                ],
            };

            const baselineVersion = await RubricService.createEssayRubricVersion(
                dbClient,
                'BASELINE',
                null,
                baselineDef,
                testUser!.id,
            );

            const resolved = await RubricService.resolveEffectiveEssayRubric(
                dbClient,
                testExam!.exam_id,
            );
            expect(resolved.rubricVersionId).toBe(baselineVersion.rubric_version_id);
            expect(resolved.versionNumber).toBe(baselineVersion.version_number);
            expect(resolved.source).toBe('BASELINE');
            expect(resolved.definition).toEqual(baselineDef);
        },
    );

    testWithDbClient(
        'should resolve to override rubric when override exists for specific exam',
        async ({ dbClient }) => {
            const testUser = await dbClient
                .selectFrom('users')
                .selectAll()
                .limit(1)
                .executeTakeFirst();
            const testExam = await dbClient
                .selectFrom('exams')
                .selectAll()
                .limit(1)
                .executeTakeFirst();

            // Deactivate all first
            await dbClient.updateTable('essay_rubric_versions').set({ is_active: false }).execute();

            const baselineDef: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'baseline_criterion',
                        name: 'Baseline Criterion',
                        weight: 1.0,
                        levels: {
                            '4': 'Desc 4',
                            '3': 'Desc 3',
                            '2': 'Desc 2',
                            '1': 'Desc 1',
                            '0': 'Desc 0',
                        },
                    },
                ],
            };

            await RubricService.createEssayRubricVersion(
                dbClient,
                'BASELINE',
                null,
                baselineDef,
                testUser!.id,
            );

            const overrideDef: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'override_criterion',
                        name: 'Override Criterion',
                        weight: 1.0,
                        levels: {
                            '4': 'Over 4',
                            '3': 'Over 3',
                            '2': 'Over 2',
                            '1': 'Over 1',
                            '0': 'Over 0',
                        },
                    },
                ],
            };

            const overrideVersion = await RubricService.createEssayRubricVersion(
                dbClient,
                'EXAM_OVERRIDE',
                testExam!.exam_id,
                overrideDef,
                testUser!.id,
            );

            const resolved = await RubricService.resolveEffectiveEssayRubric(
                dbClient,
                testExam!.exam_id,
            );
            expect(resolved.rubricVersionId).toBe(overrideVersion.rubric_version_id);
            expect(resolved.versionNumber).toBe(overrideVersion.version_number);
            expect(resolved.source).toBe('EXAM_OVERRIDE');
            expect(resolved.definition).toEqual(overrideDef);
        },
    );

    testWithDbClient(
        'should increment version numbers correctly and set supersedes link',
        async ({ dbClient }) => {
            const testUser = await dbClient
                .selectFrom('users')
                .selectAll()
                .limit(1)
                .executeTakeFirst();
            const testExam = await dbClient
                .selectFrom('exams')
                .selectAll()
                .limit(1)
                .executeTakeFirst();

            // Deactivate all first
            await dbClient.updateTable('essay_rubric_versions').set({ is_active: false }).execute();

            const rub1: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'crit1',
                        name: 'Crit 1',
                        weight: 1.0,
                        levels: { '4': 'A', '3': 'B', '2': 'C', '1': 'D', '0': 'F' },
                    },
                ],
            };

            const v1 = await RubricService.createEssayRubricVersion(
                dbClient,
                'EXAM_OVERRIDE',
                testExam!.exam_id,
                rub1,
                testUser!.id,
            );
            expect(v1.version_number).toBe(1);
            expect(v1.is_active).toBe(true);
            expect(v1.supersedes_version_id).toBeNull();

            const rub2: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'crit2',
                        name: 'Crit 2',
                        weight: 1.0,
                        levels: { '4': 'A', '3': 'B', '2': 'C', '1': 'D', '0': 'F' },
                    },
                ],
            };

            const v2 = await RubricService.createEssayRubricVersion(
                dbClient,
                'EXAM_OVERRIDE',
                testExam!.exam_id,
                rub2,
                testUser!.id,
            );
            expect(v2.version_number).toBe(2);
            expect(v2.is_active).toBe(true);
            expect(v2.supersedes_version_id).toBe(v1.rubric_version_id);

            // Verify v1 is deactivated
            const v1Db = await dbClient
                .selectFrom('essay_rubric_versions')
                .selectAll()
                .where('rubric_version_id', '=', v1.rubric_version_id)
                .executeTakeFirst();
            expect(v1Db!.is_active).toBe(false);
        },
    );

    testWithDbClient(
        'Support baseline changes affect future inherited attempts but not exams with active overrides, and reset makes future attempts inherit latest baseline',
        async ({ dbClient }) => {
            const testUser = await dbClient
                .selectFrom('users')
                .selectAll()
                .limit(1)
                .executeTakeFirst();

            // Fetch or create two test exams to use for the test
            const exams = await dbClient.selectFrom('exams').selectAll().limit(2).execute();
            expect(exams.length).toBeGreaterThanOrEqual(2);
            const examA = exams[0];
            const examB = exams[1];

            // Deactivate all existing rubrics first
            await dbClient.updateTable('essay_rubric_versions').set({ is_active: false }).execute();

            const baselineDef1: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'c1',
                        name: 'Baseline V1',
                        weight: 1.0,
                        levels: { '4': 'A', '3': 'B', '2': 'C', '1': 'D', '0': 'F' },
                    },
                ],
            };

            const baselineDef2: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'c1',
                        name: 'Baseline V2',
                        weight: 1.0,
                        levels: { '4': 'A2', '3': 'B2', '2': 'C2', '1': 'D2', '0': 'F2' },
                    },
                ],
            };

            const overrideDef: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'c2',
                        name: 'Exam B Override',
                        weight: 1.0,
                        levels: { '4': 'X', '3': 'Y', '2': 'Z', '1': 'W', '0': 'O' },
                    },
                ],
            };

            // 1. Create baseline v1
            const baselineV1 = await RubricService.createEssayRubricVersion(
                dbClient,
                'BASELINE',
                null,
                baselineDef1,
                testUser!.id,
            );

            // 2. Create exam override for Exam B
            const examBOverride = await RubricService.createEssayRubricVersion(
                dbClient,
                'EXAM_OVERRIDE',
                examB.exam_id,
                overrideDef,
                testUser!.id,
            );

            // 3. Resolve both. Exam A should inherit baseline v1. Exam B should use its override.
            const resA1 = await RubricService.resolveEffectiveEssayRubric(dbClient, examA.exam_id);
            expect(resA1.source).toBe('BASELINE');
            expect(resA1.rubricVersionId).toBe(baselineV1.rubric_version_id);
            expect(resA1.definition.criteria[0].name).toBe('Baseline V1');

            const resB1 = await RubricService.resolveEffectiveEssayRubric(dbClient, examB.exam_id);
            expect(resB1.source).toBe('EXAM_OVERRIDE');
            expect(resB1.rubricVersionId).toBe(examBOverride.rubric_version_id);
            expect(resB1.definition.criteria[0].name).toBe('Exam B Override');

            // 4. Create baseline v2 (Support baseline changes)
            const baselineV2 = await RubricService.createEssayRubricVersion(
                dbClient,
                'BASELINE',
                null,
                baselineDef2,
                testUser!.id,
            );

            // 5. Resolve again. Exam A (inherited) should now resolve to baseline v2.
            // Exam B (override) should still resolve to its override (not affected).
            const resA2 = await RubricService.resolveEffectiveEssayRubric(dbClient, examA.exam_id);
            expect(resA2.source).toBe('BASELINE');
            expect(resA2.rubricVersionId).toBe(baselineV2.rubric_version_id);
            expect(resA2.definition.criteria[0].name).toBe('Baseline V2');

            const resB2 = await RubricService.resolveEffectiveEssayRubric(dbClient, examB.exam_id);
            expect(resB2.source).toBe('EXAM_OVERRIDE');
            expect(resB2.rubricVersionId).toBe(examBOverride.rubric_version_id);
            expect(resB2.definition.criteria[0].name).toBe('Exam B Override');

            // 6. Reset (deactivate override) Exam B
            await deactivateActiveRubric({
                dbClient,
                scope: 'EXAM_OVERRIDE',
                examId: examB.exam_id,
            });

            // 7. Resolve Exam B again. It should now inherit the latest baseline v2.
            const resB3 = await RubricService.resolveEffectiveEssayRubric(dbClient, examB.exam_id);
            expect(resB3.source).toBe('BASELINE');
            expect(resB3.rubricVersionId).toBe(baselineV2.rubric_version_id);
            expect(resB3.definition.criteria[0].name).toBe('Baseline V2');
        },
    );
});
