import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DummyDriver,
    Kysely,
    PostgresAdapter,
    PostgresIntrospector,
    PostgresQueryCompiler,
    sql,
} from 'kysely';
import { buildGetGradingExamsQuery } from './get-grading-exams';
import { buildGetGradingStudentsQuery } from './get-grading-students';
import { buildStaffExamVisibilityPredicates } from '../../assign/services/exam-access.service';

vi.mock('../../assign/services/exam-access.service', () => ({
    buildStaffExamVisibilityPredicates: vi.fn(),
}));

function createCompilerDb() {
    return new Kysely<any>({
        dialect: {
            createAdapter: () => new PostgresAdapter(),
            createDriver: () => new DummyDriver(),
            createIntrospector: (database) => new PostgresIntrospector(database),
            createQueryCompiler: () => new PostgresQueryCompiler(),
        },
    });
}

describe('grading visibility queries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(buildStaffExamVisibilityPredicates).mockResolvedValue([
            sql<boolean>`e.created_by = ${'user-1'}`,
            sql<boolean>`e.exam_id in (
                select pa.exam_id
                from proctor_assignments as pa
                where pa.instructor_id = ${'user-1'}
                  and pa.status in (${sql`${'ACCEPTED'}`})
            )`,
        ]);
    });

    it('uses the shared creator-or-accepted-assignee predicate for grading exam lists', async () => {
        const db = createCompilerDb();
        const query = await buildGetGradingExamsQuery({
            dbClient: db as any,
            userId: 'user-1',
            institutionId: 'institution-1',
        });
        const compiled = query.compile();

        expect(buildStaffExamVisibilityPredicates).toHaveBeenCalledWith({
            dbClient: db,
            userId: 'user-1',
            institutionId: 'institution-1',
            includePublicInstitutionExams: true,
        });
        expect(compiled.sql).toContain('e.created_by = $');
        expect(compiled.sql).toContain('from proctor_assignments as pa');
        expect(compiled.sql).toContain('pa.status in ($');

        void db.destroy();
    });

    it('uses the same predicate for grading student detail queries', async () => {
        const db = createCompilerDb();
        const query = await buildGetGradingStudentsQuery({
            dbClient: db as any,
            examId: 'exam-1',
            userId: 'user-1',
            institutionId: 'institution-1',
            sectionId: 'section-1',
        });
        const compiled = query.compile();

        expect(buildStaffExamVisibilityPredicates).toHaveBeenCalledWith({
            dbClient: db,
            userId: 'user-1',
            institutionId: 'institution-1',
            includePublicInstitutionExams: true,
        });
        expect(compiled.sql).toContain('where "e"."exam_id" = $1');
        expect(compiled.sql).toContain('e.created_by = $');
        expect(compiled.sql).toContain('from proctor_assignments as pa');
        expect(compiled.sql).toContain('pa.status in ($');
        expect(compiled.sql).toContain('"eas"."section_id" = $');

        void db.destroy();
    });

    it('applies an ilike search filter on name and student number when search is provided', async () => {
        const db = createCompilerDb();
        const query = await buildGetGradingStudentsQuery({
            dbClient: db as any,
            examId: 'exam-1',
            userId: 'user-1',
            institutionId: 'institution-1',
            search: 'alice',
        });
        const compiled = query.compile();

        expect(compiled.sql).toContain('ilike');
        expect(compiled.parameters).toContain('%alice%');

        void db.destroy();
    });
});
