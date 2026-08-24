---
title: "Phase 1: Whitelist Deletion Cascade to Unclaimed Placeholders"
type: phase
parent: "Sync Student Whitelist & Placeholder Student Lifecycle"
phase: "1"
status: completed
created: "2026-08-24"
tags: [task, phase, identity, student-whitelist, database]
---

# Phase 1: Whitelist Deletion Cascade to Unclaimed Placeholders

## Objective

Ensure that when an unclaimed whitelist record is deleted or purged, any corresponding unclaimed placeholder row in the `students` table (`user_id IS NULL`) is also deleted, cascading the removal of pending classroom enrollments and preventing orphan placeholder accumulation.

## Dependencies & Prerequisites

- Context specification [`docs/context/August/24/investigate-student-account-claiming-conflict.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/24/investigate-student-account-claiming-conflict.md) approved.

## Impacted Files & Components

- [MODIFY] [`app/sentinel-api/src/modules/identity/student-whitelist/services/delete-student-whitelist.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/student-whitelist/services/delete-student-whitelist.ts)
- [MODIFY] [`app/sentinel-api/src/modules/identity/student-whitelist/data/delete-student-whitelist.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/student-whitelist/data/delete-student-whitelist.ts)
- [MODIFY] [`app/sentinel-api/src/modules/identity/student-whitelist/data/purge-student-whitelist.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/student-whitelist/data/purge-student-whitelist.ts)
- [MODIFY] [`app/sentinel-api/src/modules/identity/student-whitelist/tests/student-whitelist.service.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/student-whitelist/tests/student-whitelist.service.test.ts)

## Implementation Tasks

- [x] In `delete-student-whitelist.ts` / `delete-student-whitelist.data.ts`:
  - When deleting an unclaimed whitelist entry (`existingRecord.claimed_user_id === null`), delete any matching `students` row where `institution_id = existingRecord.institution_id` AND `student_number = existingRecord.student_number` AND `user_id IS NULL`.
- [x] In `purge-student-whitelist.ts`:
  - For all deleted whitelist records where `claimed_user_id IS NULL`, delete corresponding `students` rows with `user_id IS NULL` matching `(institution_id, student_number)`.
- [x] Add unit & integration tests in `student-whitelist.service.test.ts`:
  - Test single whitelist deletion cascades to placeholder student row and classroom enrollment.
  - Test whitelist purge cascades to placeholder student rows.
  - Test that claimed student rows (`user_id !== null`) are preserved and protected.

## Verification & Testing

- Run test suite:
  ```bash
  pnpm --filter sentinel-api test src/modules/identity/student-whitelist/tests/student-whitelist.service.test.ts
  ```

### Verification Evidence

- `pnpm --filter sentinel-api test src/modules/identity/student-whitelist/tests/student-whitelist.service.test.ts` — PASS: 1 test file passed, 9/9 tests passed, duration 51.41s.
- `pnpm --filter sentinel-api typecheck` — INTERRUPTED: no diagnostics emitted before manual SIGINT after several minutes; not counted as passing evidence.

### Files Modified

- `app/sentinel-api/src/modules/identity/student-whitelist/data/delete-student-whitelist.ts`
- `app/sentinel-api/src/modules/identity/student-whitelist/data/purge-student-whitelist.ts`
- `app/sentinel-api/src/modules/identity/student-whitelist/services/delete-student-whitelist.ts`
- `app/sentinel-api/src/modules/identity/student-whitelist/tests/student-whitelist.service.test.ts`
- `docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/phase-01-whitelist-deletion-cascade.md`
- `docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/README.md`

## Risks & Rollback

- **Risk**: Accidentally deleting a claimed student's record.
- **Mitigation**: Strict filter condition `WHERE user_id IS NULL` ensures only unclaimed placeholder records can ever be deleted.
