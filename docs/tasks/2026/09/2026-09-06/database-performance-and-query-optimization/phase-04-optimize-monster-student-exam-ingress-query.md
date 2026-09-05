---
parent: "database-performance-and-query-optimization"
title: "Phase 4: Refactor Student Exam Ingress Queries (Lateral Join & Index Seeks)"
type: task
status: ready
created: "2026-09-06"
tags: [task, phase, kysely, queries, lateral-join, performance]
---

# Phase 4: Refactor Student Exam Ingress Queries (Lateral Join & Index Seeks)

## Goal
Eliminate the 24.3-second maximum latency in `getExamByIdData` and `getExamsData` by refactoring the 12 repeated scalar subqueries in `buildStudentAttemptSelects.ts` into an optimized single-pass query/join structure.

## Affected Files
- `app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.ts`
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
- `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
- `app/sentinel-api/src/modules/examination/exams/services/get-exams.test.ts`
- `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.test.ts`

## Implementation Tasks

- [x] **Task 4.1:** Refactor `buildStudentAttemptSelects.ts` so that it retrieves the latest `exam_attempt` record and its incidents in a single unified JSON projection, rather than evaluating 12 separate `SELECT ea.*` scalar subqueries per exam row.
- [x] **Task 4.2:** Ensure Kysely queries in `getExamByIdData` and `getExamsData` map all attempt attributes (`attempt_id`, `attempt_status`, `attempt_score`, `attempt_total_score`, `attempt_incident_count`, `attempt_primary_incident_type`, etc.) cleanly with complete backward compatibility.
- [x] **Task 4.3:** Verify that all exam detail, lobby, and listing unit tests pass without regressions.

## Verification
- Run `pnpm --dir app/sentinel-api exec vitest run 'src/modules/examination/exams/' 'src/modules/examination/history/'` (24 test files, 137 tests passed).
