import { describe, expect, it, vi } from 'vitest';
import { getExamsData } from './get-exams';
import { getProctorAssignmentColumnSupport } from '../helper/exam-schema-compat';
import {
    Kysely,
    DummyDriver,
    PostgresAdapter,
    PostgresIntrospector,
    PostgresQueryCompiler,
} from 'kysely';

vi.mock('../helper/exam-schema-compat', async () => {
    const actual = await vi.importActual('../helper/exam-schema-compat');

    return {
        ...(actual as object),
        getProctorAssignmentColumnSupport: vi.fn(),
    };
});

function createMockDb(metadataRows: any[], dataRows: any[]) {
    const db = new Kysely<any>({
        dialect: {
            createAdapter: () => new PostgresAdapter(),
            createDriver: () => new DummyDriver(),
            createIntrospector: (db) => new PostgresIntrospector(db),
            createQueryCompiler: () => new PostgresQueryCompiler(),
        },
    });

    const executeSpy = vi.spyOn(db.getExecutor(), 'executeQuery');

    // First call (metadata column check)
    executeSpy.mockResolvedValueOnce({
        rows: metadataRows,
        insertId: undefined,
        numAffectedRows: undefined,
    } as any);

    // Second call (actual query)
    executeSpy.mockResolvedValueOnce({
        rows: dataRows,
        insertId: undefined,
        numAffectedRows: undefined,
    } as any);

    return { db, executeSpy };
}

describe('getExamsData', () => {
    beforeEach(() => {
        vi.mocked(getProctorAssignmentColumnSupport).mockResolvedValue({
            assigneeColumn: 'instructor_id',
        } as any);
    });

    it('should query exams without department filtering when departmentId is not provided', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
        });

        expect(executeSpy).toHaveBeenCalledTimes(2);
        const compiledQuery = executeSpy.mock.calls[1][0];

        // Should select exam_category
        expect(compiledQuery.sql).toContain('"e"."exam_category"');
        // Should filter by institution_id
        expect(compiledQuery.sql).toContain('"e"."institution_id" = $1');
        // Should NOT contain department filtering subqueries
        expect(compiledQuery.sql).not.toContain('sections as sec');
        expect(compiledQuery.sql).not.toContain('subject_departments as sd');
    });

    it('should query exams with department filtering when departmentId is provided', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
            departmentId: 'dept-456',
        });

        expect(executeSpy).toHaveBeenCalledTimes(2);
        const compiledQuery = executeSpy.mock.calls[1][0];

        // Should select exam_category
        expect(compiledQuery.sql).toContain('"e"."exam_category"');
        // Should contain department filtering subqueries
        expect(compiledQuery.sql).toContain('"sections" as "sec"');
        expect(compiledQuery.sql).toContain('"sections" as "sec_cg"');
        expect(compiledQuery.sql).toContain('"subject_departments" as "sd"');
        expect(compiledQuery.sql).toContain('"sec"."department_id" = $2');
    });

    it('should include assigned_room_names correlated subquery in compiled SQL', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        // Room names subquery targets exam_section_assignments aliased as esa_r
        expect(compiledQuery.sql).toContain('"exam_section_assignments" as "esa_r"');
        // Joins rooms table aliased as r_inner
        expect(compiledQuery.sql).toContain('"rooms" as "r_inner"');
        // Uses json_agg with distinct on room_name (raw sql template — identifier is unquoted)
        expect(compiledQuery.sql).toContain('json_agg(distinct r_inner.room_name)');
    });

    it('should include assigned_instructor_names correlated subquery in compiled SQL', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        // Instructor names subquery targets exam_section_assignments aliased as esa_i
        expect(compiledQuery.sql).toContain('"exam_section_assignments" as "esa_i"');
        // Joins user_profiles table aliased as up_inner
        expect(compiledQuery.sql).toContain('"user_profiles" as "up_inner"');
    });

    it('should aggregate classroom ids from exam section assignments', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        expect(compiledQuery.sql).toContain('"exam_section_assignments" as "esa_cg"');
        expect(compiledQuery.sql).toContain('json_agg(distinct esa_cg.class_group_id)');
        expect(compiledQuery.sql).toContain('"class_groups" as "cg_inner"');
    });

    it('should compile classroom-scoped exam queries with exact classroom matching and legacy section fallback', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: { classroomId: 'classroom-123' },
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        expect(compiledQuery.sql).toContain('where target_cg.class_group_id = $');
        expect(compiledQuery.sql).toContain('esa.class_group_id = "target_cg"."class_group_id"');
        expect(compiledQuery.sql).toContain('from exam_assigned_sections as eas');
        expect(compiledQuery.sql).toContain('esa.class_group_id is null');
    });

    it('should keep student exam visibility tied to published exact-classroom or legacy section assignments', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
            studentUserId: 'student-123',
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        expect(compiledQuery.sql).toContain('"e"."published_at" is not null');
        expect(compiledQuery.sql).toContain('lower(cast("e"."status" as text)) <>');
        expect(compiledQuery.sql).toContain('enr.class_group_id = e.class_group_id');
        expect(compiledQuery.sql).toContain('esa.class_group_id = "student_cg"."class_group_id"');
        expect(compiledQuery.sql).toContain('from exam_assigned_sections as eas');
        expect(compiledQuery.sql).toContain('esa.class_group_id is null');
        expect(compiledQuery.sql).toContain('from exam_remediation_schedules as ers');
        expect(compiledQuery.sql).toContain('ers.student_id = $');
        expect(compiledQuery.sql).toContain('not exists');
    });

    it('should keep published private classroom-assigned exams visible in student list queries', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
            studentUserId: 'student-123',
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        expect(compiledQuery.sql).toContain('"e"."is_public"');
        expect(compiledQuery.sql).toContain('esa.class_group_id = "student_cg"."class_group_id"');
        expect(compiledQuery.sql).not.toContain('"e"."is_public" = true');
    });

    it('should use the same student assignment gates for list queries without adding a public-only where clause', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
            studentUserId: 'student-123',
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        expect(compiledQuery.sql).toContain('"e"."published_at" is not null');
        expect(compiledQuery.sql).toContain('lower(cast("e"."status" as text)) <>');
        expect(compiledQuery.sql).toContain('enr.class_group_id = e.class_group_id');
        expect(compiledQuery.sql).toContain('esa.class_group_id = "student_cg"."class_group_id"');
        expect(compiledQuery.sql).not.toContain('"e"."is_public" = true');
    });

    it('should include creator/publisher joins, is_public selection, and instructorUserId filters in SQL', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
            instructorUserId: 'instructor-123',
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        // Should join user_profiles for creator and publisher
        expect(compiledQuery.sql).toContain('"user_profiles" as "up_creator"');
        expect(compiledQuery.sql).toContain('"user_profiles" as "up_publisher"');
        // Should select e.is_public
        expect(compiledQuery.sql).toContain('"e"."is_public"');
        // Should filter by instructorUserId
        expect(compiledQuery.sql).toContain('e.created_by =');
    });

    it('applies default limit and offset when not specified in filters', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {},
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        // Should apply default limit of 50 and offset of 0
        expect(compiledQuery.sql).toContain('limit $2 offset $3');
        expect(compiledQuery.parameters).toContain(50);
        expect(compiledQuery.parameters).toContain(0);
    });

    it('respects limit and page overrides from filters', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {
                limit: 20,
                page: 3,
            },
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        // limit = 20, page = 3 => offset = (3-1)*20 = 40
        expect(compiledQuery.sql).toContain('limit $2 offset $3');
        expect(compiledQuery.parameters).toContain(20);
        expect(compiledQuery.parameters).toContain(40);
    });

    it('applies status filtering before pagination', async () => {
        const { db, executeSpy } = createMockDb(
            [
                { column_name: 'section_id' },
                { column_name: 'section_name' },
                { column_name: 'room_id' },
            ],
            [],
        );

        await getExamsData({
            dbClient: db as any,
            institutionId: 'inst-123',
            filters: {
                status: 'draft',
                limit: 20,
                page: 1,
            },
        });

        const compiledQuery = executeSpy.mock.calls[1][0];

        expect(compiledQuery.sql).toContain('lower(e.status::text) =');
        expect(compiledQuery.sql).toContain('limit');
        expect(compiledQuery.parameters).toContain('draft');
    });
});
