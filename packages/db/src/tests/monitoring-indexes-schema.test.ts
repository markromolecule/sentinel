import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const schemaSource = readFileSync(join(repoRoot, 'prisma/schema.prisma'), 'utf8');
const migrationSource = readFileSync(
    join(repoRoot, 'prisma/migrations/20260829140000_add_monitoring_and_leases_indexes/migration.sql'),
    'utf8',
);

describe('monitoring and leases index optimization schema', () => {
    it('declares composite index on flagged_incidents for fast attempt monitoring aggregation', () => {
        expect(schemaSource).toContain('@@index([attempt_id, timestamp(sort: Desc)], map: "flagged_incidents_attempt_timestamp_idx")');
        expect(migrationSource).toContain('CREATE INDEX IF NOT EXISTS "flagged_incidents_attempt_timestamp_idx" ON "flagged_incidents"("attempt_id", "timestamp" DESC);');
    });

    it('declares attempt and exam foreign key indexes on live_inspection_leases', () => {
        expect(schemaSource).toContain('@@index([attempt_id], map: "live_inspection_leases_attempt_idx")');
        expect(schemaSource).toContain('@@index([exam_id], map: "live_inspection_leases_exam_idx")');
        expect(migrationSource).toContain('CREATE INDEX IF NOT EXISTS "live_inspection_leases_attempt_idx" ON "live_inspection_leases"("attempt_id");');
        expect(migrationSource).toContain('CREATE INDEX IF NOT EXISTS "live_inspection_leases_exam_idx" ON "live_inspection_leases"("exam_id");');
    });
});
