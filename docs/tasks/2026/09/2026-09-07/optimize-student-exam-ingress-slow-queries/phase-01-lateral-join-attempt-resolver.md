---
title: "Phase 1: Implement the Lateral Join Builder and Consolidated Incident Aggregation"
type: phase
parent: "optimize-student-exam-ingress-slow-queries"
phase: "01"
status: completed
created: "2026-09-07"
tags: [task, phase, kysely, lateral-join, performance]
---

# Phase 1: Implement the Lateral Join Builder and Consolidated Incident Aggregation

## Objective

Refactor `build-student-attempt-selects.ts` to replace the 12 repeated scalar subqueries with a unified `withStudentAttemptJoin` query builder helper that attaches a single `LEFT JOIN LATERAL` to the Kysely query, and update `buildStudentAttemptSelects` to project flat columns from `latest_attempt` while preserving exact column naming and backward compatibility.

## Dependencies & Prerequisites

- Understanding of PostgreSQL `LEFT JOIN LATERAL` semantics and Kysely query extension points.
- Baseline unit test pass in `build-student-attempt-selects.test.ts`.

## Impacted Files & Components

- `app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.ts` — Implements `withStudentAttemptJoin` and updates `buildStudentAttemptSelects`.
- `app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.test.ts` — Tests SQL generation, parameter reduction, and lateral join emission.

## Implementation Tasks

- [x] Task 1.1 — Construct the single-pass lateral join SQL fragment:
  - Join `exam_attempts ea` on `ea.exam_id = e.exam_id` and student user ID matching `st_attempt.user_id = ${studentUserId}`.
  - Apply published cycle filter: `(e.published_at IS NULL OR coalesce(ea.started_at, ea.created_at) >= e.published_at)`.
  - Order by `ea.created_at DESC NULLS LAST LIMIT 1`.
- [x] Task 1.2 — Consolidate the incident subqueries:
  - Within the lateral subquery, join an inline incident summary that computes both `count(*)::int as incident_count` and `(array_agg(fi.incident_type::text ORDER BY fi.timestamp DESC NULLS LAST))[1] as primary_incident_type` in a single pass instead of 2 separate nested queries.
- [x] Task 1.3 — Export `withStudentAttemptJoin<Q>(query: Q, studentUserId?: string): Q`:
  - If `studentUserId` is provided, attaches `.leftJoin(sql`lateral (...) as latest_attempt`, (join) => join.on(sql`true`))`.
  - If `studentUserId` is undefined/falsy, returns the query unchanged.
- [x] Task 1.4 — Update `buildStudentAttemptSelects(studentUserId?: string)`:
  - When `studentUserId` is present, select flat columns:
    - `latest_attempt.attempt_id` as `attempt_id`
    - `latest_attempt.attempt_status` as `attempt_status`
    - `latest_attempt.attempt_completed_at` as `attempt_completed_at`
    - `latest_attempt.attempt_score` as `attempt_score`
    - `latest_attempt.attempt_total_score` as `attempt_total_score`
    - `latest_attempt.attempt_time_spent_minutes` as `attempt_time_spent_minutes`
    - `coalesce(latest_attempt.attempt_incident_count, 0)` as `attempt_incident_count`
    - `latest_attempt.attempt_primary_incident_type` as `attempt_primary_incident_type`
    - `latest_attempt.attempt_answered_count` as `attempt_answered_count`
    - `latest_attempt.attempt_finalized_at` as `attempt_finalized_at`
    - `latest_attempt.attempt_assessment_snapshot` as `attempt_assessment_snapshot`
    - `latest_attempt.attempt_score_snapshot` as `attempt_score_snapshot`
  - When `studentUserId` is absent, retain the current static `NULL` and `0` expressions.
- [x] Task 1.5 — Update unit tests in `build-student-attempt-selects.test.ts` to assert that:
  - The compiled SQL contains `left join lateral`.
  - The query compiles with single parameter instead of 260+ duplicates.

## Verification & Testing

- `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/history/data/build-student-attempt-selects.test.ts` — PASS (2/2 tests passed).
- `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/history/` — PASS (3/3 test files passed, 13/13 tests passed).

## Risks & Rollback

- **Risk:** Missing `ON TRUE` condition on lateral join causes PostgreSQL syntax error.
- **Mitigation:** Explicitly tested compiled SQL structure (`as latest_attempt on true`), verified 0 SQL syntax errors.
