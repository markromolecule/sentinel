import { describe, expect, expectTypeOf, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { Selectable } from 'kysely';
import type { DB, announcements } from '../generated/types';

describe('Announcements Schema', () => {
    it('generates correct types for announcements model', () => {
        const record: Selectable<announcements> = {
            id: 'fcb4774e-698b-4aa9-863b-a50f1062bf4a',
            title: 'Test Announcement',
            slug: 'test-announcement',
            content: 'Test content for announcement.',
            published_at: new Date(),
            unpublished_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            author_id: '6d854648-305e-4eff-82d4-b64458284eeb',
            institution_id: '7d854648-305e-4eff-82d4-b64458284eec',
        };

        expect(record.id).toBe('fcb4774e-698b-4aa9-863b-a50f1062bf4a');
        expect(record.slug).toBe('test-announcement');
        expect(record.deleted_at).toBeNull();
        expectTypeOf<DB['announcements']>().toEqualTypeOf<announcements>();
    });

    it('verifies schema.prisma contains announcements model with required columns and relations', () => {
        const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
        expect(fs.existsSync(schemaPath)).toBe(true);

        const content = fs.readFileSync(schemaPath, 'utf8');
        expect(content).toContain('model announcements {');
        expect(content).toContain('slug           String        @unique @db.VarChar(255)');
        expect(content).toContain('deleted_at     DateTime?     @db.Timestamptz(6)');
        expect(content).toContain('published_at   DateTime?     @db.Timestamptz(6)');
        expect(content).toContain('unpublished_at DateTime?     @db.Timestamptz(6)');
    });

    it('verifies reshape announcements migration sql exists and contains expected alterations', () => {
        const migrationPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260602181500_reshape_announcements/migration.sql',
        );

        expect(fs.existsSync(migrationPath)).toBe(true);

        const content = fs.readFileSync(migrationPath, 'utf8');
        expect(content).toContain('ALTER TABLE "announcements" RENAME COLUMN "announcement_id" TO "id";');
        expect(content).toContain('ALTER TABLE "announcements" ADD COLUMN "deleted_at"');
        expect(content).toContain('ALTER TABLE "announcements" ADD COLUMN "slug"');
        expect(content).toContain('CREATE UNIQUE INDEX "announcements_slug_key" ON "announcements"("slug");');
        expect(content).toContain('ALTER TABLE "announcements" DROP COLUMN IF EXISTS "status";');
    });
});
