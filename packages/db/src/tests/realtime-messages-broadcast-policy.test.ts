import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationSource = readFileSync(
    join(
        process.cwd(),
        'prisma/migrations/20260907204500_add_realtime_messages_broadcast_policies/migration.sql',
    ),
    'utf8',
);

const rollbackSource = readFileSync(
    join(
        process.cwd(),
        'prisma/migrations/20260907204500_add_realtime_messages_broadcast_policies/rollback.sql',
    ),
    'utf8',
);

describe('realtime messages broadcast policies', () => {
    it('creates an INSERT policy on realtime.messages for authenticated broadcast and presence', () => {
        expect(migrationSource).toContain('CREATE POLICY "authenticated_broadcast_insert"');
        expect(migrationSource).toContain('ON "realtime"."messages"');
        expect(migrationSource).toContain('FOR INSERT');
        expect(migrationSource).toContain('TO authenticated');
        expect(migrationSource).toContain('"extension" IN (\'broadcast\', \'presence\')');
        expect(migrationSource).toContain("realtime.topic() NOT LIKE 'exam-attempt:%:live-inspection'");
    });

    it('creates a SELECT policy on realtime.messages for authenticated broadcast and presence', () => {
        expect(migrationSource).toContain('CREATE POLICY "authenticated_broadcast_select"');
        expect(migrationSource).toContain('ON "realtime"."messages"');
        expect(migrationSource).toContain('FOR SELECT');
        expect(migrationSource).toContain('TO authenticated');
        expect(migrationSource).toContain('"extension" IN (\'broadcast\', \'presence\')');
        expect(migrationSource).toContain("realtime.topic() NOT LIKE 'exam-attempt:%:live-inspection'");
    });

    it('documents idempotent drops before creation', () => {
        expect(migrationSource).toContain('DROP POLICY IF EXISTS "authenticated_broadcast_insert"');
        expect(migrationSource).toContain('DROP POLICY IF EXISTS "authenticated_broadcast_select"');
    });

    it('defines clean rollback drops', () => {
        expect(rollbackSource).toContain('DROP POLICY IF EXISTS "authenticated_broadcast_insert"');
        expect(rollbackSource).toContain('DROP POLICY IF EXISTS "authenticated_broadcast_select"');
    });
});
