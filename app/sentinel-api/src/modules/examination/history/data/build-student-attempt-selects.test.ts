import { describe, expect, it } from 'vitest';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { buildStudentAttemptSelects } from './build-student-attempt-selects';

function createCompilerDb() {
    return new Kysely<any>({
        dialect: new PostgresDialect({
            pool: new Pool({
                connectionString: 'postgres://sentinel:sentinel@127.0.0.1:5432/sentinel',
            }),
        }),
    });
}

describe('buildStudentAttemptSelects', () => {
    it('only considers attempts from the current publish cycle', () => {
        const db = createCompilerDb();
        const compiled = db
            .selectFrom('exams as e')
            .select(buildStudentAttemptSelects('4bb7db25-f34f-4a57-b6ae-1db2f898f142'))
            .compile();

        expect(compiled.sql).toContain('coalesce(ea.started_at, ea.created_at) >= e.published_at');
        expect(compiled.sql).toContain('st_attempt.user_id = $1');
        expect(compiled.sql).toContain('ea.finalized_at::text');
        expect(compiled.sql).toContain("ea.answer_snapshot->'_grading'->>'finalizedAt'");

        void db.destroy();
    });
});
