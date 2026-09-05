---
title: "Task: Database Performance, Query Optimization & Latency Remediation"
type: task
status: completed
created: "2026-09-06"
tags: [task, performance, database, postgres, slow-queries, supabase, optimization, indexing]
---

# Task: Database Performance, Query Optimization & Latency Remediation

## Outcome

Eliminate database-level latency spikes, row lock contention, and correlated subquery bottlenecks identified in `pg_stat_statements` to guarantee seamless sub-200ms response times for 40–80+ concurrent students across Web and Mobile on Railway and Supabase Pro.

## Pre-planning record

### Context Reference

- [`docs/context/September/6/database-performance-and-query-optimization.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/6/database-performance-and-query-optimization.md)

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | 40–80 students load exam lobby simultaneously | Students enter exam lobby concurrently | Single-pass lateral join + index seek resolves in `< 10ms` with zero pool queueing. | Fast fallback with 0 lockups | Ready |
| SC-02 | Concurrent API calls hitting `authMiddleware` | Students send simultaneous HTTP requests | In-memory LRU cache prevents duplicate `UPDATE user_profiles SET last_seen_at` writes; 0 row-lock contention. | In-memory throttled updates | Ready |
| SC-03 | Student checks into exam lobby | Gated exam check-in | Audit logs and notifications dispatched asynchronously without blocking HTTP response. | Background async execution | Ready |
| SC-04 | Instructor views live monitoring dashboard | 40–80 active exam attempts | Monitoring queries leverage composite indexes, returning live state in `< 50ms`. | Direct index scans | Ready |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| D-01 | How to eliminate 24s monster query in `buildStudentAttemptSelects`? | Replace 12 duplicated scalar subqueries with a single `LEFT JOIN LATERAL` or subquery join + composite index. | Reduces 12 separate table scans per exam row to 1 single index seek. | Retaining 12 scalar subqueries. | `phase-04` |
| D-02 | How to eliminate 115s row-lock spikes on `user_profiles`? | Ensure `last_seen_at` is strictly throttled in-memory (max once every 5 minutes per user). | Prevents concurrent row write lock queues on the same user profile. | Synchronous DB writes per request. | `phase-02` |
| D-03 | How to eliminate 33s write lockups on `audit_logs` & `notifications`? | Execute audit logs and notifications asynchronously outside the hot student HTTP response path. | Disk writes on audit tables should not block student ingress or exam check-in. | Synchronous awaiting of logs. | `phase-03` |
| D-04 | How to apply indexes? | Provide direct SQL DDL script for Supabase SQL Editor and reflect in Prisma schema migrations. | Instant production fix + repository synchronization. | Manual migration without schema sync. | `phase-01` |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | SC-01, D-01 | Exam attempt subqueries replaced with lateral join / indexed single-pass lookup | `build-student-attempt-selects.ts` & `get-exam-by-id.ts` | Unit tests & query execution plan | Ready |
| AC-02 | SC-02, D-02 | `last_seen_at` updates throttled in-memory with 0 concurrent row lockups | `auth.ts` middleware audit | `auth.test.ts` | Ready |
| AC-03 | SC-03, D-03 | Audit logs and notifications non-blocking in hot path | Check-in, admission, and auth services | Flow & lobby test suites | Ready |
| AC-04 | SC-01, D-04 | Supabase composite indexes deployed and active | PostgreSQL DDL script | `pg_indexes` inspection | Ready |

## Phases

- [x] `phase-01-supabase-composite-indexes-and-schema-migration.md` — Phase 1: Supabase Composite Indexes & Schema Synchronization
- [x] `phase-02-auth-middleware-row-lock-and-caching-audit.md` — Phase 2: In-Memory `last_seen_at` Throttling & Auth Cache Verification
- [x] `phase-03-asynchronous-audit-logs-and-notifications.md` — Phase 3: Non-blocking Asynchronous Audit Logging & Notifications
- [x] `phase-04-optimize-monster-student-exam-ingress-query.md` — Phase 4: Refactor Student Exam Ingress Queries (Lateral Join & Index Seeks)
- [x] `phase-05-verification-and-load-testing-readiness.md` — Phase 5: End-to-End Latency Verification & Concurrency Readiness
