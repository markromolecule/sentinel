import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DbClient } from '@sentinel/db';
import {
    DummyDriver,
    Kysely,
    PostgresAdapter,
    PostgresIntrospector,
    PostgresQueryCompiler,
    sql,
} from 'kysely';
import { resolveExaminationGlobalSettings } from '../../configuration/configuration.service';
import { buildStaffExamVisibilityPredicates } from '../../assign/services/exam-access.service';
import { getExamReportsList } from './get-exam-reports-list';

vi.mock('../../configuration/configuration.service', () => ({
    resolveExaminationGlobalSettings: vi.fn(),
}));

vi.mock('../../assign/services/exam-access.service', () => ({
    buildStaffExamVisibilityPredicates: vi.fn(),
}));

vi.mock('../../exams/services/map-exam-response.service', () => ({
    mapExamSummaryResponse: vi.fn((record) => record),
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

describe('getExamReportsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveExaminationGlobalSettings).mockResolvedValue({
            defaultDurationMinutes: 60,
            defaultPassingScore: 68,
        } as any);
        vi.mocked(buildStaffExamVisibilityPredicates).mockResolvedValue([
            sql<boolean>`(
                e.is_public = true
                and e.institution_id = ${'inst-1'}
            )`,
            sql<boolean>`e.created_by = ${'instructor-1'}`,
            sql<boolean>`e.exam_id in (
                select es.exam_id
                from exam_shares as es
                where es.user_id = ${'instructor-1'}
            )`,
        ]);
    });

    it('uses the shared staff visibility contract when listing reportable exams', async () => {
        const db = createCompilerDb();
        const executeSpy = vi.spyOn(db.getExecutor(), 'executeQuery');
        executeSpy.mockResolvedValueOnce({
            rows: [{ total_count: 12 }],
            insertId: undefined,
            numAffectedRows: undefined,
        } as any);
        executeSpy.mockResolvedValueOnce({
            rows: [
                {
                    exam_id: 'exam-1',
                    title: 'Math Test',
                    duration_minutes: 60,
                    passing_score: null,
                    status: 'PUBLISHED',
                },
            ],
            insertId: undefined,
            numAffectedRows: undefined,
        } as any);

        const result = await getExamReportsList({
            dbClient: db as DbClient,
            filters: {
                page: 2,
                limit: 5,
            },
            role: 'instructor',
            userId: 'instructor-1',
            institutionId: 'inst-1',
        });

        expect(buildStaffExamVisibilityPredicates).toHaveBeenCalledWith({
            dbClient: db,
            userId: 'instructor-1',
            institutionId: 'inst-1',
            includePublicInstitutionExams: true,
        });
        expect(executeSpy.mock.calls[1][0].sql).toContain('e.created_by = $');
        expect(executeSpy.mock.calls[1][0].sql).toContain('from exam_shares as es');
        expect(executeSpy.mock.calls[1][0].sql).toContain('e.is_public = true');
        expect(executeSpy.mock.calls[1][0].sql).toContain('e.institution_id = $');
        expect(result.total).toBe(12);
        expect(result.totalPages).toBe(3);
        expect(result.data[0].exam_id).toBe('exam-1');
        expect(result.data[0].passing_score).toBe(68);

        void db.destroy();
    });
});
