---
parent: "database-performance-and-query-optimization"
title: "Phase 1: Supabase Composite Indexes & Schema Synchronization"
type: task
status: ready
created: "2026-09-06"
tags: [task, phase, database, postgres, indexes, supabase]
---

# Phase 1: Supabase Composite Indexes & Schema Synchronization

## Goal
Generate and deploy the composite indexes required to eliminate table-wide sequential scans across `exam_attempts`, `flagged_incidents`, `exam_section_assignments`, `audit_logs`, and `notifications`.

## Affected Files
- `packages/db/prisma/schema.prisma` — Schema definitions for composite indexes
- `packages/db/src/scripts/sql/2026-09-06-performance-indexes.sql` — Direct SQL DDL script for Supabase SQL Editor

## Implementation Tasks

- [x] **Task 1.1:** Author SQL migration script:
  ```sql
  -- 1. Index for fast student attempt lookups by exam and recency
  CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_exam_created
  ON "public"."exam_attempts"("student_id", "exam_id", "created_at" DESC NULLS LAST);

  -- 2. Index for fast incident counts and primary incident type lookups by attempt
  CREATE INDEX IF NOT EXISTS idx_flagged_incidents_attempt_timestamp
  ON "public"."flagged_incidents"("attempt_id", "timestamp" DESC NULLS LAST);

  -- 3. Composite index on exam_section_assignments for student class/section matching
  CREATE INDEX IF NOT EXISTS idx_exam_section_assignments_composite
  ON "public"."exam_section_assignments"("exam_id", "class_group_id", "section_id", "instructor_id");

  -- 4. Index on audit_logs for user/institution queries
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_inst_created
  ON "public"."audit_logs"("user_id", "institution_id", "created_at" DESC NULLS LAST);

  -- 5. Index on notifications recipient lookups
  CREATE INDEX IF NOT EXISTS idx_notifications_recipient_inst_created
  ON "public"."notifications"("recipient_user_id", "institution_id", "created_at" DESC NULLS LAST);
  ```
- [x] **Task 1.2:** Update `packages/db/prisma/schema.prisma` to add corresponding `@@index` annotations to ensure Prisma client schema parity.
- [x] **Task 1.3:** Provide direct instructions and SQL payload for user to execute in Supabase SQL Editor.

## Verification
- Run `SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public'` in Supabase to confirm active index status.
- `pnpm --filter @sentinel/db generate` and `pnpm --filter @sentinel/db test` pass (10/10 test suites passed).
