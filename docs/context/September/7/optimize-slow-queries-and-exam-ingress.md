---
title: "Analyze and Optimize 8 Slow Queries and Student Exam Ingress Queries"
type: context
status: draft
created: "2026-09-07"
tags: [context, performance, database, slow-queries, kysely, lateral-join, realtime]
feature: "optimize-slow-queries-and-exam-ingress"
---

# Analyze and Optimize 8 Slow Queries and Student Exam Ingress Queries Context Specification

## 1. Overview & Objective

### 1.1 Context & Background

During high-concurrency load testing with 38 active concurrent exam users on the Supabase Pro database, Supabase Observability flagged **8 slow queries** across 25,000+ executions. The user provided the raw `pg_stat_statements` performance metrics export for analysis.

### 1.2 Comprehensive Analysis of the 8 Slow Queries

| # | Query Pattern / Signature | Executed By (Role) | Calls | Mean Time | Max Time | Total Time | % Total DB Time | Diagnosis & Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | `realtime.list_changes($1, $2, $3, $4)` (WAL polling) | `supabase_admin` | 25,041 | 5.97 ms | 425.81 ms | 149,580.48 ms (~150s) | **86.26%** | **Supabase System (Realtime CDC Engine):** Polls PostgreSQL Write-Ahead Log replication slot to push change events to connected WebSockets. High total time is purely due to 25k call frequency (6ms/call is fast). |
| **2** | `getExamByIdData` (Single Exam detail with attempt projections) | `postgres` (API) | 1,330 | 4.77 ms | 141.61 ms | 6,337.77 ms | **3.65%** | **Sentinel Application (High Priority):** Exam ingress endpoint for student view. Contains **12 duplicate scalar subqueries** in the SELECT list, each scanning `exam_attempts` and `flagged_incidents` (twice). |
| **3** | `with page as ...` table & column size introspection (`-- source: dashboard`) | `postgres` (Admin) | 2 | 2,469.67 ms | 2,479.84 ms | 4,939.34 ms (~5s) | **2.85%** | **Supabase Studio (Harmless Admin Introspection):** Executed when a developer or admin navigated the Supabase Studio web dashboard (Table Editor / Schema Inspector). Not an application runtime query. |
| **4** | `SELECT name FROM pg_timezone_names` | `authenticator` (PostgREST) | 38 | 97.96 ms | 837.62 ms | 3,722.65 ms (~3.7s) | **2.15%** | **PostgREST / Connection Init:** Reads internal OS timezone database (45,372 rows read, 0% cache hit). Called exactly 38 times (once per new client worker connection). |
| **5** | `SELECT e.name ... FROM pg_available_extensions` | `postgres` (Admin) | 17 | 166.36 ms | 688.99 ms | 2,828.12 ms (~2.8s) | **1.63%** | **Supabase Studio (Harmless Admin Introspection):** Executed when viewing the Database > Extensions tab in Supabase Studio. |
| **6** | `getExamsData` (Student Exam Catalog Listing with Pagination) | `postgres` (API) | 166 | 16.28 ms | 82.35 ms | 2,702.53 ms (~2.7s) | **1.56%** | **Sentinel Application (High Priority):** Student exams list. Emits the same **12 repeated scalar subqueries** per exam row displayed on the page ($N \times 12$ subqueries per HTTP request). |
| **7** | `getExamsData` (Targeted Class Group Filtered Catalog Listing) | `postgres` (API) | 154 | 14.11 ms | 116.73 ms | 2,172.19 ms (~2.2s) | **1.25%** | **Sentinel Application (High Priority):** Identical root cause to Query 6 with class-group assignment filtering. |
| **8** | `WITH base_types AS ...` schema metadata | `authenticator` (PostgREST) | 38 | 29.80 ms | 99.83 ms | 1,132.47 ms (~1.1s) | **0.65%** | **PostgREST (Internal Schema Cache):** Internal metadata introspection by PostgREST when starting up worker processes. |

### 1.3 Key Findings & Synthesis

1. **5 of the 8 queries are Supabase Platform & Dashboard Operations:**
   - Queries #1, #3, #4, #5, and #8 are internal to Supabase infrastructure (Realtime CDC, Supabase Studio Dashboard, and PostgREST schema cache). They are standard platform overhead and do not require code changes in Sentinel, though Realtime load can be monitored.
2. **3 queries are Sentinel Application Bottlenecks (Queries #2, #6, and #7):**
   - Combined, they accounted for **1,650 API calls** during testing with peak latency spikes of **116ms – 141ms**.
   - **Root Cause:** In `buildStudentAttemptSelects.ts`, `buildLatestAttemptJsonSql()` is defined as an interpolated Kysely SQL fragment that builds a large JSON object. It is then embedded **12 times** into the SELECT clause (`(${latestAttempt}->>'attempt_id')::text`, `(${latestAttempt}->>'status')::text`, etc.).
   - This generates a massive SQL query (over 260 parameters `$1..$264`) forcing PostgreSQL to evaluate or optimize 12 duplicate correlated subqueries per row.
   - Each of those 12 subqueries internally runs two separate nested subqueries against `flagged_incidents` (`count(*)` and `order by timestamp desc limit 1`).

### 1.4 Business & User Value

- Eliminates 11/12ths of redundant subquery computation and parameter bloat on the two most critical student ingress paths (`/student/exam/[id]` and `/student/exams`).
- Stabilizes p99 query latency during peak concurrent exam starts, preventing connection queue buildup at the database pooler.
- Ensures 100% data contract compatibility across student exam lobby, exam attempt, and exam history interfaces.

### 1.5 Success Criteria

- Refactor `buildStudentAttemptSelects` and its integration in `getExamByIdData` and `getExamsData` so the latest student attempt is evaluated **at most once per exam row** via `LEFT JOIN LATERAL` or unified subquery.
- Emitted SQL parameter count for student exam detail drops from 260+ to <25 parameters.
- All 125 exam module unit tests and 12 history module unit tests pass without regressions.
- Query execution latency for student exam ingress drops by over 60%.

---

## 2. Requirements & User Stories

### User Stories

- **US-01 (Student Ingress Performance):**
  *As a student loading an exam lobby or question view during peak testing, I want the exam metadata and my prior attempt status to load in under 10ms, so that I experience instantaneous page transitions even when 50+ students load the exam simultaneously.*
- **US-02 (System Stability & Resource Efficiency):**
  *As an engineer monitoring Supabase, I want application database queries to avoid Cartesian subquery multiplication, so that CPU and connection pools remain lean and scalable.*

### Functional Requirements

- [ ] **FR-01 (Single-Pass Attempt Resolution):** Replace the 12 repeated scalar subqueries in `buildStudentAttemptSelects` with a single `LEFT JOIN LATERAL` or unified row-level projection that executes once per exam.
- [ ] **FR-02 (Incident Aggregation Consolidation):** Within the latest attempt resolution, aggregate `flagged_incidents` (both count and primary incident type) in a single pass instead of two separate nested subqueries.
- [ ] **FR-03 (Field Compatibility Preservation):** Maintain exact type and nullability parity for all 12 returned attempt fields:
  - `attempt_id` (string | null)
  - `attempt_status` (string | null)
  - `attempt_completed_at` (timestamptz | null)
  - `attempt_score` (int | null)
  - `attempt_total_score` (int | null)
  - `attempt_time_spent_minutes` (int | null)
  - `attempt_incident_count` (int, default 0)
  - `attempt_primary_incident_type` (string | null)
  - `attempt_answered_count` (int | null)
  - `attempt_finalized_at` (text | null)
  - `attempt_assessment_snapshot` (json/unknown | null)
  - `attempt_score_snapshot` (json/unknown | null)
- [ ] **FR-04 (Query Integration):** Seamlessly integrate the refactored attempt join/projection into both `getExamByIdData` (single exam) and `getExamsData` (paginated exam catalog).
- [ ] **FR-05 (Index Verification):** Verify that compound indexes on `exam_attempts (student_id, exam_id, created_at DESC)` and `flagged_incidents (attempt_id, timestamp DESC)` exist and are utilized by the query planner.

### Edge Cases & Failure Modes

- **Student with No Attempts:** Must return all attempt fields as `null` (and `attempt_incident_count` as `0`) without breaking outer exam attributes.
- **Multiple Historical Attempts:** Must deterministically select only the latest attempt created within the current exam publish cycle (`coalesce(ea.started_at, ea.created_at) >= e.published_at`).
- **Attempts with Zero Incidents:** Must return `attempt_incident_count: 0` and `attempt_primary_incident_type: null`.
- **Exam Loaded by Staff/Instructor (no studentUserId):** Must return static `null` projections instantly without attaching joins or running subqueries.

---

## 3. Technical & Architectural Context

### Affected Domains / Layers

- **Backend API:** `app/sentinel-api/`
- **Database Access Layer:** Kysely queries against PostgreSQL

### Impacted Files

- `app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.ts` — Primary subquery generation.
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts` — Single exam query ingress.
- `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` — Exam catalog query ingress.
- `app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.test.ts` — Query compilation unit test.

### Architectural Solution: `LEFT JOIN LATERAL` Pattern

Instead of interpolating a subquery 12 times into the `select([...])` array:

```sql
-- Before: 12 independent scalar subquery evaluations per row with duplicated parameters:
SELECT
  ((SELECT json_build_object(...) FROM exam_attempts ea WHERE ... LIMIT 1)->>'attempt_id')::text,
  ((SELECT json_build_object(...) FROM exam_attempts ea WHERE ... LIMIT 1)->>'status')::text,
  ... (x12)

-- After: Single LATERAL join evaluating the attempt and its incidents exactly once:
LEFT JOIN LATERAL (
    SELECT
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
    FROM exam_attempts ea
    INNER JOIN students st ON st.student_id = ea.student_id
    LEFT JOIN LATERAL (
        SELECT
            count(*)::int as incident_count,
            (array_agg(fi.incident_type::text ORDER BY fi.timestamp DESC NULLS LAST))[1] as primary_incident_type
        FROM flagged_incidents fi
        WHERE fi.attempt_id = ea.attempt_id
    ) fi_summary ON true
    WHERE st.user_id = ${studentUserId}
      AND ea.exam_id = e.exam_id
      AND (
          e.published_at IS NULL
          OR coalesce(ea.started_at, ea.created_at) >= e.published_at
      )
    ORDER BY ea.created_at DESC NULLS LAST
    LIMIT 1
) latest_attempt ON true
```

---

## 4. Scope & Boundaries

- **In Scope:**
  - Complete structural optimization of `buildStudentAttemptSelects.ts` and its application in `get-exam-by-id.ts` and `get-exams.ts`.
  - Consolidating the two `flagged_incidents` subqueries into a single pass.
  - Updating and extending unit tests in `build-student-attempt-selects.test.ts`, `get-exam-by-id.test.ts`, and `get-exams.test.ts`.
  - Verifying database index alignment for `exam_attempts` and `flagged_incidents`.
- **Out of Scope / Non-Goals:**
  - Modifying Supabase internal infrastructure queries (`realtime.list_changes`, Supabase Studio admin schema queries, PostgREST startup timezone checks).
  - Changing public API response schemas or frontend contract shapes (must remain 100% transparent and backwards compatible).

---

## 5. References & External Context

- `docs/tasks/2026/09/2026-09-06/database-performance-and-query-optimization/phase-04-optimize-monster-student-exam-ingress-query.md`
- `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.service.ts`
