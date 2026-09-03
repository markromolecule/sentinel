import { sql } from 'kysely';

function buildLatestAttemptIdSql(studentUserId: string) {
    return sql<string | null>`(
        select ea.attempt_id
        from exam_attempts as ea
        inner join students as st_attempt on st_attempt.student_id = ea.student_id
        where st_attempt.user_id = ${studentUserId}
          and ea.exam_id = e.exam_id
          and (
              e.published_at is null
              or coalesce(ea.started_at, ea.created_at) >= e.published_at
          )
        order by ea.created_at desc nulls last
        limit 1
    )`;
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

    const latestAttemptId = buildLatestAttemptIdSql(studentUserId);

    return [
        latestAttemptId.as('attempt_id'),
        sql<string | null>`(
            select ea.status::text
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_status'),
        sql<Date | null>`(
            select ea.completed_at
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_completed_at'),
        sql<number | null>`(
            select ea.score
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_score'),
        sql<number | null>`(
            select ea.total_score
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_total_score'),
        sql<number | null>`(
            select ea.time_spent_minutes
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_time_spent_minutes'),
        sql<number>`coalesce((
            select count(*)::int
            from flagged_incidents as fi
            where fi.attempt_id = ${latestAttemptId}
        ), 0)`.as('attempt_incident_count'),
        sql<string | null>`(
            select fi.incident_type::text
            from flagged_incidents as fi
            where fi.attempt_id = ${latestAttemptId}
            order by fi.timestamp desc nulls last
            limit 1
        )`.as('attempt_primary_incident_type'),
        sql<number | null>`(
            select ea.answered_question_count
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_answered_count'),
        sql<string | null>`(
            select coalesce(
                ea.finalized_at::text,
                (ea.answer_snapshot->'_grading'->>'finalizedAt')::text
            )
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_finalized_at'),
        sql<unknown | null>`(
            select ea.assessment_snapshot
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_assessment_snapshot'),
        sql<unknown | null>`(
            select ea.score_snapshot
            from exam_attempts as ea
            inner join students as st_attempt on st_attempt.student_id = ea.student_id
            where st_attempt.user_id = ${studentUserId}
              and ea.exam_id = e.exam_id
              and (
                  e.published_at is null
                  or coalesce(ea.started_at, ea.created_at) >= e.published_at
              )
            order by ea.created_at desc nulls last
            limit 1
        )`.as('attempt_score_snapshot'),
    ];
}
