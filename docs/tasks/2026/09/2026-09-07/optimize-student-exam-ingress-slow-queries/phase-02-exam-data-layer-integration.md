---
title: "Phase 2: Integrate Lateral Join into getExamByIdData and getExamsData"
type: phase
parent: "optimize-student-exam-ingress-slow-queries"
phase: "02"
status: completed
created: "2026-09-07"
tags: [task, phase, kysely, exams, data-layer, performance]
---

# Phase 2: Integrate Lateral Join into getExamByIdData and getExamsData

## Objective

Integrate the `withStudentAttemptJoin` helper into `getExamByIdData` (single exam detail) and `getExamsData` (paginated catalog listing), ensuring that whenever a `studentUserId` is provided, the query attaches the lateral join and projects the 12 attempt attributes cleanly without Cartesian subquery multiplication.

## Dependencies & Prerequisites

- Completion of Phase 1 (`withStudentAttemptJoin` and `buildStudentAttemptSelects` exported and unit tested).

## Impacted Files & Components

- `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts` — Attach `withStudentAttemptJoin(query, studentUserId)`.
- `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` — Attach `withStudentAttemptJoin(query, studentUserId)`.

## Implementation Tasks

- [x] Task 2.1 — Update `getExamByIdData`:
  - Import `withStudentAttemptJoin` from `../../history/data/build-student-attempt-selects`.
  - In `getExamByIdData`, pipe the query through `withStudentAttemptJoin(query, studentUserId)`.
  - Verify that `buildStudentAttemptSelects(studentUserId)` continues to project all 12 attributes into the select array.
- [x] Task 2.2 — Update `getExamsData`:
  - Import `withStudentAttemptJoin` from `../../history/data/build-student-attempt-selects`.
  - In `getExamsData`, pipe the query through `withStudentAttemptJoin(query, studentUserId)`.
  - Ensure compatibility with existing dynamic filter clauses (`filters.subjectId`, `filters.classroomId`, `filters.status`, etc.).
- [x] Task 2.3 — Verify `RawExamRecord` structural alignment:
  - Confirm TypeScript type inference correctly matches `RawExamRecord` without requiring type assertions or casting.

## Verification & Testing

- Run single exam detail data tests:
  ```bash
  pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/get-exam-by-id.test.ts
  ```
  (PASS: 5/5 tests passed).

- Run exams list data tests:
  ```bash
  pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/get-exams.test.ts
  ```
  (PASS: 13/13 tests passed).

- Run all data layer tests:
  ```bash
  pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/
  ```
  (PASS: 4/4 test files passed, 33/33 tests passed).

## Risks & Rollback

- **Risk:** In `getExamsData`, complex `UNION` or `OR` predicates could collide with table alias `latest_attempt`.
- **Mitigation:** Table alias `latest_attempt` is unique across all existing CTEs and joins in `getExamsData`. All tests pass without alias conflict.
