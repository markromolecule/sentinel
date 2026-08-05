import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DummyDriver,
    Kysely,
    PostgresAdapter,
    PostgresIntrospector,
    PostgresQueryCompiler,
    sql,
} from 'kysely';
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

describe('buildGetGradingStudentsQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(buildStaffExamVisibilityPredicates).mockResolvedValue([
            sql<boolean>`e.created_by = ${'user-1'}`,
        ]);
    });

    it('selects the enrolled class-group section while keeping the assigned section filter', async () => {
        const db = createCompilerDb();
        const query = await buildGetGradingStudentsQuery({
            dbClient: db as any,
            examId: 'exam-1',
            userId: 'user-1',
            institutionId: 'institution-1',
            sectionId: 'section-assigned-1',
            search: 'alice',
        });
        const compiled = query.compile();

        expect(buildStaffExamVisibilityPredicates).toHaveBeenCalledWith({
            dbClient: db,
            userId: 'user-1',
            institutionId: 'institution-1',
            includePublicInstitutionExams: true,
        });
        expect(compiled.sql).toContain('"cg"."section_id" as "sectionId"');
        expect(compiled.sql).toContain('"sec"."section_name" as "sectionName"');
        expect(compiled.sql).toContain(
            'left join "sections" as "sec" on "sec"."section_id" = "cg"."section_id"',
        );
        expect(compiled.sql).toContain('"eas"."section_id" = $');
        expect(compiled.parameters).toContain('%alice%');

        void db.destroy();
    });
});
