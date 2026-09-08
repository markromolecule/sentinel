import { sql } from 'kysely';

export function withStudentAttemptJoin<Q extends { leftJoin: (...args: any[]) => any }>(
    query: Q,
    studentUserId?: string,
): Q {
    if (!studentUserId) {
        return query;
    }

    return query.leftJoin(
        sql`lateral (
            select
                ea.attempt_id,
                ea.status::text as attempt_status,
                ea.completed_at as attempt_completed_at,
                ea.score as attempt_score,
                ea.total_score as attempt_total_score,
                ea.time_spent_minutes as attempt_time_spent_minutes,
                ea.answered_question_count as attempt_answered_count,
                coalesce(
                    ea.finalized_at::text,
                    (ea.answer_snapshot->'_grading'->>'finalizedAt')::text
                ) as attempt_finalized_at,
                ea.assessment_snapshot as attempt_assessment_snapshot,
                ea.score_snapshot as attempt_score_snapshot,
                coalesce(fi_summary.incident_count, 0) as attempt_incident_count,
                fi_summary.primary_incident_type as attempt_primary_incident_type
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            left join lateral (
                select
                    count(*)::int as incident_count,
                    (array_agg(fi.incident_type::text order by fi.timestamp desc nulls last))[1] as primary_incident_type
                from flagged_incidents as fi
                where fi.attempt_id = ea.attempt_id
            ) as fi_summary on true
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        ) as latest_attempt`,
        (join: any) => join.on(sql`true`),
    ) as Q;
}

export function buildStudentAttemptSelects(studentUserId?: string) {
    if (!studentUserId) {
        return [
            sql<string | null>`null`.as('attempt_id'),
            sql<string | null>`null`.as('attempt_status'),
            sql<Date | null>`null`.as('attempt_completed_at'),
            sql<number | null>`null`.as('attempt_score'),
            sql<number | null>`null`.as('attempt_total_score'),
            sql<number | null>`null`.as('attempt_time_spent_minutes'),
            sql<number>`0`.as('attempt_incident_count'),
            sql<string | null>`null`.as('attempt_primary_incident_type'),
            sql<number | null>`null`.as('attempt_answered_count'),
            sql<string | null>`null`.as('attempt_finalized_at'),
            sql<unknown | null>`null`.as('attempt_assessment_snapshot'),
            sql<unknown | null>`null`.as('attempt_score_snapshot'),
        ];
    }

    return [
        sql<string | null>`latest_attempt.attempt_id`.as('attempt_id'),
        sql<string | null>`latest_attempt.attempt_status`.as('attempt_status'),
        sql<Date | null>`latest_attempt.attempt_completed_at`.as('attempt_completed_at'),
        sql<number | null>`latest_attempt.attempt_score`.as('attempt_score'),
        sql<number | null>`latest_attempt.attempt_total_score`.as('attempt_total_score'),
        sql<number | null>`latest_attempt.attempt_time_spent_minutes`.as('attempt_time_spent_minutes'),
        sql<number>`coalesce(latest_attempt.attempt_incident_count, 0)`.as('attempt_incident_count'),
        sql<string | null>`latest_attempt.attempt_primary_incident_type`.as('attempt_primary_incident_type'),
        sql<number | null>`latest_attempt.attempt_answered_count`.as('attempt_answered_count'),
        sql<string | null>`latest_attempt.attempt_finalized_at`.as('attempt_finalized_at'),
        sql<unknown | null>`latest_attempt.attempt_assessment_snapshot`.as('attempt_assessment_snapshot'),
        sql<unknown | null>`latest_attempt.attempt_score_snapshot`.as('attempt_score_snapshot'),
    ];
}

