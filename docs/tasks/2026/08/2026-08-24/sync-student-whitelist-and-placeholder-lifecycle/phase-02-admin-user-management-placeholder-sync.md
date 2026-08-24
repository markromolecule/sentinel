---
title: "Phase 2: Admin User Management Placeholder Sync"
type: phase
parent: "Sync Student Whitelist & Placeholder Student Lifecycle"
phase: "2"
status: completed
created: "2026-08-24"
tags: [task, phase, identity, users, onboarding, database]
---

# Phase 2: Admin User Management Placeholder Sync

## Objective

Align manual user creation and update workflows in `createUserData` and `updateUserData` with the student table compound unique index `(institution_id, student_number)`, enabling administrators to create student accounts that smoothly claim pre-enrolled placeholders and update `student_whitelist.claimed_user_id`.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- [MODIFY] [`app/sentinel-api/src/modules/identity/users/data/create-user.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/users/data/create-user.ts)
- [MODIFY] [`app/sentinel-api/src/modules/identity/users/data/update-user.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/users/data/update-user.ts)
- [NEW] [`app/sentinel-api/src/modules/identity/users/data/tests/create-user.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/users/data/tests/create-user.test.ts)

## Implementation Tasks

- [x] In `createUserData`:
  - Update student table insertion to conflict on `(institution_id, student_number)` and update `user_id = userId` when a placeholder row exists.
  - Sync `student_whitelist` by setting `claimed_user_id = userId`, `claimed_at = now()` when a matching unclaimed whitelist row exists for `(institution_id, student_number)`.
- [x] In `updateUserData`:
  - Update student table insertion/update to handle `(institution_id, student_number)` conflict and sync `student_whitelist`.
- [x] Add unit & integration tests:
  - Verify creating a student user when a placeholder row (`user_id = null`) exists claims the placeholder and updates `student_whitelist`.
  - Verify creating a student user when no placeholder exists creates a new row.
  - Verify creating a student user throws when student number is already claimed by another user.
  - Verify `updateUserData` claims existing placeholder and syncs `student_whitelist`.

## Verification & Testing

- Run test suite:
  ```bash
  pnpm --filter sentinel-api test src/modules/identity/users/data/tests/create-user.test.ts
  ```

### Verification Evidence

- `pnpm --filter sentinel-api test src/modules/identity/users/data/tests/create-user.test.ts` — PASS: 1 test file passed, 3/3 tests passed in 5.08s.
- `pnpm --filter sentinel-api test src/modules/identity/users/` — PASS: 14 test files passed, 36/36 tests passed in 18.90s.
- `pnpm --filter sentinel-api test src/modules/identity/onboarding/` — PASS: 2 test files passed, 12/12 tests passed in 18.99s.
- `pnpm --filter sentinel-api test src/modules/identity/student-whitelist/` — PASS: 3 test files passed, 20/20 tests passed in 29.95s.

### Files Modified

- `app/sentinel-api/src/modules/identity/users/data/create-user.ts`
- `app/sentinel-api/src/modules/identity/users/data/update-user.ts`
- `app/sentinel-api/src/modules/identity/users/data/tests/create-user.test.ts`
- `docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/phase-02-admin-user-management-placeholder-sync.md`
- `docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/README.md`

## Risks & Rollback

- **Risk**: Overwriting a student record belonging to a different user.
- **Mitigation**: Add validation check to ensure existing row has `user_id IS NULL` before updating in `createUserData`.
