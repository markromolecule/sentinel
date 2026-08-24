---
title: "Phase 1: Database Stale Placeholder Cleanup"
type: phase
parent: "Fix Student Onboarding False Already-Claimed Conflict & Stale Whitelist Cleanup"
phase: "1"
status: completed
created: "2026-08-24"
tags: [task, phase, database, cleanup]
---

# Phase 1: Database Stale Placeholder Cleanup

## Objective

Remove the 42 unclaimed placeholder student records (`user_id IS NULL`) in the `students` table in Supabase corresponding to the removed whitelisted student batch, preventing conflict with future student imports or registrations.

## Dependencies & Prerequisites

- Whitelist rows for the 46 student numbers were previously deleted from `student_whitelist`.

## Impacted Files & Components

- Database Table: `public.students` in Supabase PostgreSQL.

## Implementation Tasks

- [x] Inspect and query all 42 records in `students` where `student_number = ANY(...)` and `user_id IS NULL`.
- [x] Confirm no dependent rows in foreign-key relations (e.g. `enrollments`) prevent deletion.
- [x] Execute transactional `DELETE FROM students WHERE student_number = ANY(...) AND user_id IS NULL`.
- [x] Verify that 0 matching unclaimed placeholder rows remain in `students`.

## Verification & Testing

- SQL query executed:
  ```sql
  DELETE FROM students WHERE student_number = ANY($1) AND user_id IS NULL
  ```
  Result: 42 rows deleted, 0 matching unclaimed placeholder rows remaining in `students`.

## Risks & Rollback

- **Risk**: Deleting active registered students.
- **Mitigation**: Filtered strictly by `AND user_id IS NULL`; active claimed accounts were preserved intact.
