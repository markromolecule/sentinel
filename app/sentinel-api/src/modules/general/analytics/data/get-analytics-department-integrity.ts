import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { resolveRelatedInstitutions } from '../../notification/helper/resolve-related-institutions';

export type GetAnalyticsDepartmentIntegrityDataArgs = {
    institutionId?: string;
    startAt?: Date;
    endAtExclusive?: Date;
};

export type DepartmentIntegrityRow = {
    department: string;
    completed: number;
    flagged: number;
    dropped: number;
    courseCount: number;
    studentCount: number;
    averageScore: number;
};

/**
 * Retrieves integrity metrics grouped by department, scoped to a period.
 * Retains zero-valued departments by executing date checks inside left-join case statements.
 */
export async function getAnalyticsDepartmentIntegrityData(
    dbClient: DbClient,
    args: GetAnalyticsDepartmentIntegrityDataArgs,
): Promise<DepartmentIntegrityRow[]> {
    const { institutionId, startAt, endAtExclusive } = args;

    const institutionIds = institutionId
        ? await resolveRelatedInstitutions(dbClient, institutionId)
        : [];

    const startFilter = startAt ? sql`and ea.started_at >= ${startAt}` : sql``;
    const endFilter = endAtExclusive ? sql`and ea.started_at < ${endAtExclusive}` : sql``;

    const fiStartFilter = startAt ? sql`and fi.timestamp >= ${startAt}` : sql``;
    const fiEndFilter = endAtExclusive ? sql`and fi.timestamp < ${endAtExclusive}` : sql``;
    const effectiveTotalScore = sql<number | null>`coalesce(
        (ea.score_snapshot->>'totalScore')::numeric,
        ea.total_score::numeric
    )`;
    const effectivePercentage = sql<number | null>`coalesce(
        (ea.score_snapshot->>'percentage')::numeric,
        case
            when ${effectiveTotalScore} is not null and ${effectiveTotalScore} > 0
            then (
                coalesce(
                    (ea.score_snapshot->>'score')::numeric,
                    ea.score::numeric,
                    ea.initial_score::numeric,
                    0::numeric
                ) / nullif(${effectiveTotalScore}, 0::numeric)
            ) * 100
            else null
        end
    )`;

    let query = dbClient
        .selectFrom('departments as d')
        .leftJoin('students as st', 'st.department_id', 'd.department_id')
        .leftJoin('exam_attempts as ea', 'ea.student_id', 'st.student_id')
        .leftJoin('exams as e', 'e.exam_id', 'ea.exam_id')
        .leftJoin('flagged_incidents as fi', 'fi.attempt_id', 'ea.attempt_id')
        .select([
            'd.department_name as department',
            sql<number>`coalesce(count(distinct case when ea.status = 'COMPLETED' ${startFilter} ${endFilter} then ea.attempt_id end), 0)`.as(
                'completed',
            ),
            sql<number>`coalesce(count(distinct case when fi.incident_id is not null ${fiStartFilter} ${fiEndFilter} then ea.attempt_id end), 0)`.as(
                'flagged',
            ),
            sql<number>`coalesce(count(distinct case when ea.status != 'COMPLETED' and ea.attempt_id is not null and fi.incident_id is null ${startFilter} ${endFilter} then ea.attempt_id end), 0)`.as(
                'dropped',
            ),
            sql<number>`coalesce(count(distinct case when ea.attempt_id is not null ${startFilter} ${endFilter} then st.course_id end), 0)`.as(
                'courseCount',
            ),
            sql<number>`coalesce(count(distinct case when ea.attempt_id is not null ${startFilter} ${endFilter} then st.student_id end), 0)`.as(
                'studentCount',
            ),
            sql<number>`coalesce(avg(case when ea.status = 'COMPLETED' and ${effectiveTotalScore} is not null and ${effectiveTotalScore} > 0 ${startFilter} ${endFilter} then ${effectivePercentage} end), 0)`.as(
                'averageScore',
            ),
        ]);

    if (institutionIds.length > 0) {
        query = query.where('d.institution_id', 'in', institutionIds);
    }

    const rows = await query
        .groupBy(['d.department_id', 'd.department_name'])
        .orderBy('d.department_name', 'asc')
        .execute();

    return rows.map((row) => ({
        department: row.department,
        completed: Number(row.completed),
        flagged: Number(row.flagged),
        dropped: Number(row.dropped),
        courseCount: Number((row as any).courseCount ?? 0),
        studentCount: Number((row as any).studentCount ?? 0),
        averageScore: Number((row as any).averageScore ?? 0),
    }));
}
