import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { essay_rubric_scope, type essay_rubric_versions } from '../generated/types';
import type { Selectable } from 'kysely';

describe('Essay Rubric Schema', () => {
    it('generates correct types with essay_rubric_scope enum and essay_rubric_versions model', () => {
        expect(essay_rubric_scope.BASELINE).toBe('BASELINE');
        expect(essay_rubric_scope.EXAM_OVERRIDE).toBe('EXAM_OVERRIDE');

        const record: Partial<Selectable<essay_rubric_versions>> = {
            rubric_version_id: 'd8c7c945-89db-4845-82df-e12d1b82e2c1',
            scope: 'BASELINE',
            exam_id: null,
            version_number: 1,
            definition: { criteria: [] },
            is_active: true,
            supersedes_version_id: null,
            created_by: null,
        };

        expect(record.scope).toBe('BASELINE');
        expect(record.version_number).toBe(1);
    });

    it('verifies migration.sql exists and contains expected table, enum, partial indexes, and seed baseline', () => {
        const migrationPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260731090000_add_essay_rubric_versions/migration.sql',
        );

        expect(fs.existsSync(migrationPath)).toBe(true);

        const content = fs.readFileSync(migrationPath, 'utf8');

        // Check enum creation
        expect(content).toContain('CREATE TYPE public.essay_rubric_scope AS ENUM');

        // Check table creation
        expect(content).toContain('CREATE TABLE public.essay_rubric_versions');

        // Check unique index constraints (partial indexes)
        expect(content).toContain('CREATE UNIQUE INDEX active_baseline_idx');
        expect(content).toContain('CREATE UNIQUE INDEX active_exam_override_idx');
        expect(content).toContain('CREATE UNIQUE INDEX baseline_version_uniq_idx');
        expect(content).toContain('CREATE UNIQUE INDEX exam_override_version_uniq_idx');

        // Check seed
        expect(content).toContain('INSERT INTO public.essay_rubric_versions');
        expect(content).toContain("'BASELINE'");
        expect(content).toContain("'d8c7c945-89db-4845-82df-e12d1b82e2c1'");
    });

    it('verifies rollback.sql exists and drops the table and enum safely', () => {
        const rollbackPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260731090000_add_essay_rubric_versions/rollback.sql',
        );

        expect(fs.existsSync(rollbackPath)).toBe(true);

        const content = fs.readFileSync(rollbackPath, 'utf8');

        expect(content).toContain('DROP TABLE IF EXISTS public.essay_rubric_versions');
        expect(content).toContain('DROP TYPE IF EXISTS public.essay_rubric_scope');
    });
});
