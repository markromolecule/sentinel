import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { question_type, type exam_sections } from '../generated/types';
import type { Selectable } from 'kysely';

describe('Exam Section Question Type Schema', () => {
    it('generates correct types with question_type nullable enum on exam_sections', () => {
        expect(question_type.MULTIPLE_CHOICE).toBe('MULTIPLE_CHOICE');
        expect(question_type.TRUE_FALSE).toBe('TRUE_FALSE');

        const record: Partial<Selectable<exam_sections>> = {
            exam_section_id: 'd3b07384-d113-4956-a5a0-b423366cae66',
            exam_id: '1fd52d94-e6d9-4519-b38a-b17b6ccddf74',
            title: 'Multiple Choice Section',
            description: null,
            order_index: 0,
            question_type: null, // nullable for legacy/empty/mixed
        };

        expect(record.question_type).toBeNull();
    });

    it('verifies migration.sql exists and contains expected nullable column, homogeneous backfill, and index', () => {
        const migrationPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260730080000_add_exam_section_question_type/migration.sql',
        );

        expect(fs.existsSync(migrationPath)).toBe(true);

        const content = fs.readFileSync(migrationPath, 'utf8');

        // Reuse public.question_type enum
        expect(content).toContain('ADD COLUMN "question_type" "public"."question_type"');

        // Homogeneous non-empty sections backfill logic
        expect(content).toContain('UPDATE "public"."exam_sections"');
        expect(content).toContain('HAVING COUNT(DISTINCT "question_type") = 1');

        // Index creation on question_type
        expect(content).toContain('CREATE INDEX');
        expect(content).toContain('"exam_sections"("question_type")');
    });

    it('verifies rollback.sql exists and drops the optional index and column safely', () => {
        const rollbackPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260730080000_add_exam_section_question_type/rollback.sql',
        );

        expect(fs.existsSync(rollbackPath)).toBe(true);

        const content = fs.readFileSync(rollbackPath, 'utf8');

        // Drops optional index and column
        expect(content).toContain('DROP INDEX IF EXISTS');
        expect(content).toContain('DROP COLUMN IF EXISTS "question_type"');

        // Does not touch title, description, or question tables
        expect(content).not.toContain('DROP TABLE');
        expect(content).not.toContain('DROP TYPE');
    });
});
