---
title: "Database Performance, Query Optimization & Latency Remediation"
type: context
status: ready
created: "2026-09-06"
tags: [context, performance, database, postgres, slow-queries, supabase, optimization, indexing]
feature: "database-performance-and-query-optimization"
---

# Database Performance, Query Optimization & Latency Remediation Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  During concurrent student load testing, users experienced noticeable network traffic and request lag. Analysis of PostgreSQL query metrics (`pg_stat_statements`) revealed that this was caused by severe database-level query lockups and unindexed sequential scans rather than basic network bandwidth. Execution times spiked up to **115 seconds** for profile updates, **24 seconds** for composite student exam queries, and **33 seconds** for synchronous audit log inserts, with Supabase Realtime WAL change scanning consuming **49.8% of all database CPU time**.

- **Business / User Value:**
  Guarantees that 40–80+ concurrent students across Web and Mobile can check in, navigate the lobby, take exams, sync answers, and undergo real-time proctoring with sub-200ms latency, zero database timeouts (500/504 errors), and zero lock contention on Supabase and Railway.

- **Success Criteria:**
  1. Average database query latency across all hot-path endpoints remains **< 15ms** (p95 < 100ms).
  2. Maximum query execution time never exceeds **250ms** under high concurrency.
  3. All high-impact tables (`exam_attempts`, `flagged_incidents`, `user_profiles`, `exams`, `audit_logs`) have targeted composite indexes covering filter and sort clauses.
  4. Write operations on `user_profiles.last_seen_at` and `audit_logs` are strictly asynchronous or debounced in-memory, avoiding row locks during active student HTTP ingress.
  5. The multi-subquery student exam ingress query is streamlined with optimized relational joins and index coverage.

---

## 2. Evidence-Based Root Cause Breakdown (from `pg_stat_statements`)

| Rank | Query / Bottleneck | Calls | Mean Time | Max Latency | Impact | Root Cause & Solution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#1** | `realtime.list_changes(...)` | 1,537,499 | 8.24ms | **14.58s** | 49.8% of DB Time | Postgres WAL CDC polling for legacy `postgres_changes`. Switched to direct REST Broadcasts (`realtime:lobby:${examId}`). |
| **#2** | `UPDATE user_profiles SET last_seen_at = $1` | 14,896 | 151.04ms | **115.79s** | 8.8% of DB Time | Synchronous write on every request created massive row-level lock contention. Require strict in-memory batching/throttling. |
| **#3** | Student Exam Listing & Detail (15 nested subqueries) | 16,171 | 117.98ms | **19.30s – 24.37s** | 7.5% of DB Time | Repeated correlated subqueries on `exam_attempts` and `flagged_incidents` per exam row without composite index on `(student_id, exam_id, created_at)`. |
| **#4** | `insert into audit_logs (...)` | 41,867 | 25.12ms | **33.15s** | 4.1% of DB Time | Synchronous database disk writes on routine student operations (e.g. check-in, presence). Make audit logging background/async. |
| **#5** | `insert into notifications (...)` | 7,973 | 61.96ms | **23.07s** | 1.9% of DB Time | Synchronous notification inserts and admin hierarchy lookups in student hot paths. |

---

## 3. Requirements & Architectural Decisions

### Architectural Decisions

| Decision ID | Topic | Decision | Justification |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Database Indexing Strategy | Add targeted composite indexes in Postgres schema for `exam_attempts`, `flagged_incidents`, and `exam_section_assignments`. | Transforms 15+ correlated subqueries in exam ingress from table-wide sequential scans into instant index seeks ($< 5\text{ms}$). |
| **DEC-02** | `last_seen_at` Write Throttling | Enforce in-memory throttling (flush at most once every 5 minutes per user) in `authMiddleware`. | Completely eliminates row-level locking on `user_profiles` during concurrent student API calls. |
| **DEC-03** | Asynchronous Audit & Notification Logging | Move non-blocking audit logs and administrative notifications to background execution (`queueMicrotask` or fire-and-forget promise). | Strips 33-second disk I/O bottlenecks from student check-in and ingress requests. |
| **DEC-04** | Correlated Subquery Optimization | Optimize student exam status queries in `@sentinel/db` to utilize indexed joins or pre-aggregated single-pass views. | Prevents exponential query complexity when students load the exam lobby or list view. |

---

## 4. Database Indexing Plan (PostgreSQL DDL)

```sql
-- 1. Index for fast student attempt lookups by exam and recency (Eliminates 24s exam query bottleneck)
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_exam_created
ON exam_attempts(student_id, exam_id, created_at DESC NULLS LAST);

-- 2. Index for fast incident counts and primary incident type lookups by attempt
CREATE INDEX IF NOT EXISTS idx_flagged_incidents_attempt_timestamp
ON flagged_incidents(attempt_id, timestamp DESC NULLS LAST);

-- 3. Composite index on exam_section_assignments for student class/section matching
CREATE INDEX IF NOT EXISTS idx_exam_section_assignments_exam_class_section
ON exam_section_assignments(exam_id, class_group_id, section_id, instructor_id);

-- 4. Index on audit_logs for user/institution queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_inst_created
ON audit_logs(user_id, institution_id, created_at DESC);

-- 5. Index on notifications recipient lookups
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
ON notifications(recipient_user_id, institution_id, created_at DESC);
```

---

## 5. Scope & Action Items

### Codebase Changes (`sentinel-api` & `@sentinel/db`)

- [ ] **Task 1:** Audit `authMiddleware` to verify that `lastSeenUpdatedMap` is strictly preventing duplicate `UPDATE user_profiles` writes across concurrent requests.
- [ ] **Task 2:** Audit all check-in, lobby, and session endpoints to ensure `audit_logs` and `notifications` are executed asynchronously without blocking the HTTP response.
- [ ] **Task 3:** Optimize the student exam detail / lobby query in `@sentinel/db` or the API service layer to avoid redundant nested subqueries.
- [ ] **Task 4:** Create migration or SQL script to apply composite indexes to Supabase production database.
