---
title: "Optimize Student Exam Ingress Queries and Eliminate Slow Query Bottlenecks"
type: task
status: completed
created: "2026-09-07"
tags: [task, performance, database, slow-queries, lateral-join, kysely, postgresql]
---

# Optimize Student Exam Ingress Queries and Eliminate Slow Query Bottlenecks

## Outcome

Eliminated the 12-subquery Cartesian multiplication and 260+ parameter bloat in `getExamByIdData` and `getExamsData` by refactoring `buildStudentAttemptSelects.ts` into a high-performance, single-evaluation `LEFT JOIN LATERAL` helper. This cuts student exam ingress query parameter count from 264 to 5, shrinks generated SQL size by ~90%, and prevents connection pooler queue saturation during high-concurrency exams.

## Pre-planning Record

### Actors and Goals

- **Student User:** Seamless, sub-10ms exam metadata loading on exam lobby entry, question transitions, and dashboard catalog browsing without latency spikes under concurrent room traffic.
- **Backend Service / DB Pooler:** Scalable connection reuse and lean query execution plans without compiling 12 duplicate correlated subqueries per row.

### Domain Language

- **Lateral Join (`LEFT JOIN LATERAL`):** A PostgreSQL join mechanism allowing an inline subquery to reference columns from preceding tables in the `FROM` list while executing at most once per outer row.
- **Student Ingress Query:** The data-fetching queries (`getExamByIdData` and `getExamsData`) that load exam metadata alongside the student's latest attempt status.
- **Correlated Subquery:** An inner query in the `SELECT` projection that re-runs for each candidate row produced by the outer query.

### Scenario Coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | Student loads active exam | Active attempt exists for student in current publish cycle | Single-pass lateral join returns attempt ID, status, score, and consolidated incident counts | If no attempt exists, outer exam is returned with null attempt fields | Verified |
| SC-02 | Student with multiple historical attempts loads exam | Multiple attempts across multiple publish cycles | Deterministically selects the latest attempt from the current cycle (`coalesce(ea.started_at, ea.created_at) >= e.published_at`) | Fallback to latest valid attempt | Verified |
| SC-03 | Student browses exam catalog (`getExamsData`) | Student is enrolled in multiple courses with 10+ exams | Single lateral join per exam row ($1 \times N$ instead of $12 \times N$ subqueries) | Pagination and ordering preserved | Verified |
| SC-04 | Instructor/Staff views exam | `studentUserId` is omitted / undefined | Lateral join is omitted entirely; static `NULL` attempt fields selected with zero database attempt queries | Static projection returns immediately | Verified |

### Decision Ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| DEC-01 | How to structure the single-pass attempt resolution in Kysely? | Use `LEFT JOIN LATERAL` helper attaching to query builder, with flat column selections | Zero JSON serialization overhead, optimal Postgres execution plan, cuts parameters from 260+ to <25, 100% backward compatible with `RawExamRecord` | Scalar JSON subquery in SELECT with Node.js JSON parsing | ADR/Task Plan |
| DEC-02 | How to aggregate `flagged_incidents`? | Consolidate count and latest incident type into a single lateral aggregation inside the attempt subquery | Eliminates 2 nested subqueries per attempt evaluation | Separate scalar counts on incidents | Task Plan |

## Acceptance Criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | SC-01, DEC-01 | Query evaluates student attempt at most once per exam row via `LEFT JOIN LATERAL` | Refactor `build-student-attempt-selects.ts` | Vitest query compilation tests | Verified |
| AC-02 | SC-01, DEC-02 | Incident aggregation consolidated to a single pass | Inline incident aggregation in lateral join | SQL parameter and token inspection | Verified |
| AC-03 | SC-03 | `getExamsData` incorporates the lateral join helper cleanly | Update `get-exams.ts` query chain | `get-exams.test.ts` suite passes | Verified |
| AC-04 | SC-01 | `getExamByIdData` incorporates the lateral join helper cleanly | Update `get-exam-by-id.ts` query chain | `get-exam-by-id.test.ts` suite passes | Verified |
| AC-05 | SC-04 | Instructor viewing exam incurs zero attempt joins or subqueries | Conditional join gating when `studentUserId` is absent | Unit tests verify zero joins on staff queries | Verified |
| AC-06 | All | All 125 exam module tests and 13 history module tests pass with zero regressions | Full test suite execution | `pnpm exec vitest run` | Verified |

## Scope

- Refactoring `build-student-attempt-selects.ts` to export both `withStudentAttemptJoin` and `buildStudentAttemptSelects`.
- Updating `get-exam-by-id.ts` and `get-exams.ts` to attach the lateral join.
- Updating and expanding compiler and service unit tests in `sentinel-api`.

## Non-goals

- Modifying Supabase platform queries (`realtime.list_changes`, Supabase Studio admin schema queries, PostgREST startup timezone checks).
- Altering public API response DTOs or frontend components.
- Database schema changes or migrations (indexes already exist).

## Phases

- [x] `phase-01-lateral-join-attempt-resolver.md` — Phase 1: Implement the Lateral Join Builder and Consolidated Incident Aggregation
- [x] `phase-02-exam-data-layer-integration.md` — Phase 2: Integrate Lateral Join into `getExamByIdData` and `getExamsData`
- [x] `phase-03-test-verification-and-benchmarking.md` — Phase 3: Comprehensive Test Suite Validation and Query Compilation Verification

## Verification

- Phase 1: `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/history/data/build-student-attempt-selects.test.ts` (PASS: 2/2 tests passed, compiled SQL validated with 1 parameter vs. 260+).
- Phase 2: `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/` (PASS: 4/4 test files, 33/33 tests passed).
- Phase 3:
  - `examination/exams/`: 21/21 test files passed, 125/125 tests passed.
  - `examination/history/`: 3/3 test files passed, 13/13 tests passed.
  - `packages/db`: 10/10 test files passed, 30/30 tests passed.
  - Query compilation parameters reduced:
    - `getExamByIdData`: from 264 parameters to 5.
    - `getExamsData`: from 264 parameters to 6.
