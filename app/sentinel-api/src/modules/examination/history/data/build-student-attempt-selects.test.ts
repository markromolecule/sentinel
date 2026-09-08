import { describe, expect, it } from 'vitest';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import {
    buildStudentAttemptSelects,
    withStudentAttemptJoin,
} from './build-student-attempt-selects';

function createCompilerDb() {
    return new Kysely<any>({
        dialect: new PostgresDialect({
            pool: new Pool({
                connectionString: 'postgres://sentinel:sentinel@127.0.0.1:5432/sentinel',
            }),
        }),
    });
}

describe('buildStudentAttemptSelects & withStudentAttemptJoin', () => {
    it('compiles a single-pass lateral join with consolidated incident aggregation', () => {
        const db = createCompilerDb();
        const studentUserId = '4bb7db25-f34f-4a57-b6ae-1db2f898f142';

        const query = withStudentAttemptJoin(
            db.selectFrom('exams as e'),
            studentUserId,
        ).select(buildStudentAttemptSelects(studentUserId));

        const compiled = query.compile();

        // 1. Emits single lateral join
        expect(compiled.sql).toContain('left join lateral');
        expect(compiled.sql).toContain('as latest_attempt on true');

        // 2. Published cycle guard & user ID binding
        expect(compiled.sql).toContain('coalesce(ea.started_at, ea.created_at) >= e.published_at');
        expect(compiled.sql).toContain('st_attempt.user_id = $1');

        // 3. Consolidated incident summary aggregation
        expect(compiled.sql).toContain('as fi_summary on true');
        expect(compiled.sql).toContain('array_agg(fi.incident_type::text order by fi.timestamp desc nulls last)');

        // 4. Flat column projections from latest_attempt
        expect(compiled.sql).toContain('latest_attempt.attempt_id as "attempt_id"');
        expect(compiled.sql).toContain('latest_attempt.attempt_status as "attempt_status"');
        expect(compiled.sql).toContain('latest_attempt.attempt_score as "attempt_score"');
        expect(compiled.sql).toContain('coalesce(latest_attempt.attempt_incident_count, 0) as "attempt_incident_count"');

        // 5. Parameter count is reduced from >260 down to exactly 1
        expect(compiled.parameters).toEqual([studentUserId]);

        void db.destroy();
    });

    it('emits static null projections and no lateral join when studentUserId is absent', () => {
        const db = createCompilerDb();

        const query = withStudentAttemptJoin(
            db.selectFrom('exams as e'),
            undefined,
        ).select(buildStudentAttemptSelects(undefined));

        const compiled = query.compile();

        expect(compiled.sql).not.toContain('left join lateral');
        expect(compiled.sql).toContain('null as "attempt_id"');
        expect(compiled.sql).toContain('0 as "attempt_incident_count"');
        expect(compiled.parameters).toHaveLength(0);

        void db.destroy();
    });
});

