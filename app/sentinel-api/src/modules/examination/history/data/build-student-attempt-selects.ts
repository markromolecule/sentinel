import { sql } from 'kysely';

function buildLatestAttemptJsonSql(studentUserId: string) {
    return sql`(
        select json_build_object(
            'attempt_id', ea.attempt_id,
            'status', ea.status::text,
            'completed_at', ea.completed_at,
            'score', ea.score,
            'total_score', ea.total_score,
            'time_spent_minutes', ea.time_spent_minutes,
            'answered_question_count', ea.answered_question_count,
            'finalized_at', coalesce(
                ea.finalized_at::text,
                (ea.answer_snapshot->'_grading'->>'finalizedAt')::text
            ),
            'assessment_snapshot', ea.assessment_snapshot,
            'score_snapshot', ea.score_snapshot,
            'incident_count', coalesce((
                select count(*)::int
                from flagged_incidents as fi
                where fi.attempt_id = ea.attempt_id
            ), 0),
            'primary_incident_type', (
                select fi.incident_type::text
                from flagged_incidents as fi
                where fi.attempt_id = ea.attempt_id
                order by fi.timestamp desc nulls last
                limit 1
            )
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

    const latestAttempt = buildLatestAttemptJsonSql(studentUserId);

    return [
        sql<string | null>`(${latestAttempt}->>'attempt_id')::text`.as('attempt_id'),
        sql<string | null>`(${latestAttempt}->>'status')::text`.as('attempt_status'),
        sql<Date | null>`(${latestAttempt}->>'completed_at')::timestamptz`.as('attempt_completed_at'),
        sql<number | null>`(${latestAttempt}->>'score')::int`.as('attempt_score'),
        sql<number | null>`(${latestAttempt}->>'total_score')::int`.as('attempt_total_score'),
        sql<number | null>`(${latestAttempt}->>'time_spent_minutes')::int`.as('attempt_time_spent_minutes'),
        sql<number>`coalesce((${latestAttempt}->>'incident_count')::int, 0)`.as('attempt_incident_count'),
        sql<string | null>`(${latestAttempt}->>'primary_incident_type')::text`.as('attempt_primary_incident_type'),
        sql<number | null>`(${latestAttempt}->>'answered_question_count')::int`.as('attempt_answered_count'),
        sql<string | null>`(${latestAttempt}->>'finalized_at')::text`.as('attempt_finalized_at'),
        sql<unknown | null>`(${latestAttempt}->'assessment_snapshot')`.as('attempt_assessment_snapshot'),
        sql<unknown | null>`(${latestAttempt}->'score_snapshot')`.as('attempt_score_snapshot'),
    ];
}
