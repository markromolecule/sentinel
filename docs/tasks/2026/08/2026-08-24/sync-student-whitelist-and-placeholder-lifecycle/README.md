---
title: "Sync Student Whitelist & Placeholder Student Lifecycle"
type: task
status: completed
created: "2026-08-24"
tags: [task, identity, student-whitelist, onboarding, classroom, database]
---

# Sync Student Whitelist & Placeholder Student Lifecycle

## Outcome

1. Implement clean cascade deletion of unclaimed placeholder student records (`students.user_id IS NULL`) and their classroom enrollments whenever a matching unclaimed whitelist entry is deleted or purged.
2. Align admin user creation and update workflows in `sentinel-api` (`createUserData`, `updateUserData`) with the `(institution_id, student_number)` compound unique index, claiming existing placeholder records and updating `student_whitelist.claimed_user_id`.
3. Provide comprehensive test coverage across whitelist deletion cascade, user creation placeholder claiming, and student onboarding.

## Pre-planning record

### Actors and goals

- **Academic Administrator**: Wants to delete or purge incorrect/withdrawn student whitelist entries and have any orphan placeholder student records and classroom enrollments cleanly removed.
- **Admin / User Manager**: Wants to create or edit student user accounts directly in User Management without unique constraint collisions when a placeholder row already exists from classroom pre-enrollment.
- **Student User**: Wants to onboard seamlessly when pre-enrolled without encountering false "already claimed" errors.

### Domain language

- **`student_whitelist`**: Institutional pre-registration roster containing `student_number`, `last_name`, `department_id`, `course_id`, and `claimed_user_id`.
- **`students`**: Registered student identity records linked to `user_id`, or placeholder student records with `user_id: null` created during section pre-enrollment.
- **Unclaimed Placeholder**: A row in `students` where `user_id IS NULL` awaiting account onboarding by the legitimate student.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Admin deletes an unclaimed whitelist entry that has a classroom placeholder in `students` | Whitelist record exists (`claimed_user_id IS NULL`), placeholder exists in `students` (`user_id IS NULL`) with classroom enrollment | Both `student_whitelist` and `students` placeholder rows are deleted; `enrollments` row cascades | If `claimed_user_id` is non-null, deletion is blocked | Planned |
| SC-02 | Admin purges whitelist records with `includeClaimed: false` | Multiple unclaimed whitelist records and placeholder `students` rows exist | Deletes all matching unclaimed whitelist rows and their orphan `students` placeholders | Claimed rows are preserved | Planned |
| SC-03 | Admin creates student user in User Management where placeholder row already exists | Placeholder `students` row exists (`user_id IS NULL`) for `(institution_id, student_number)` | `createUserData` updates the existing placeholder row with `user_id = userId` and marks whitelist `claimed_user_id = userId` | If `user_id` is already assigned to another user, fail with conflict error | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Should deleting an unclaimed whitelist entry cascade to `students` placeholders? | Yes. When `claimed_user_id` is `null`, deleting the whitelist record deletes any matching `students` row where `user_id IS NULL`. | Prevents orphan placeholder accumulation and eliminates phantom roster records for withdrawn students. | Keeping orphan placeholder rows indefinitely in `students` without an active whitelist entry. | `docs/context/August/24/investigate-student-account-claiming-conflict.md` |
| DEC-02 | How should `createUserData` and `updateUserData` handle existing placeholder rows? | Use `onConflict((oc) => oc.columns(['institution_id', 'student_number']).doUpdateSet({ user_id: userId, ... }))` and sync `student_whitelist.claimed_user_id`. | Aligns user creation with student table compound unique constraint and links pre-enrolled classroom records. | Conflicting only on `user_id` and crashing with unique constraint error on `(institution_id, student_number)`. | `phase-02` |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01 | Deleting an unclaimed whitelist entry deletes any matching `students` row with `user_id IS NULL`. | In `delete-student-whitelist.ts` / data helper, delete `students` where `institution_id = ... AND student_number = ... AND user_id IS NULL`. | Vitest test in `student-whitelist.service.test.ts`. | Completed |
| AC-02 | SC-02, DEC-01 | Purging unclaimed whitelist entries deletes matching `students` placeholders where `user_id IS NULL`. | In `purge-student-whitelist.ts`, batch delete matching `students` rows with `user_id IS NULL`. | Vitest test in `student-whitelist.service.test.ts`. | Completed |
| AC-03 | SC-03, DEC-02 | `createUserData` claims existing placeholder `students` row and syncs `student_whitelist.claimed_user_id`. | Update `createUserData` student insert to handle `(institution_id, student_number)` and update `student_whitelist`. | Vitest test in `create-user.test.ts`. | Completed |
| AC-04 | SC-03, DEC-02 | `updateUserData` handles compound unique constraint on `(institution_id, student_number)`. | Update `updateUserData` student upsert. | Vitest test in `create-user.test.ts`. | Completed |

## Scope

- Modifying `app/sentinel-api/src/modules/identity/student-whitelist/services/delete-student-whitelist.ts` and data helper.
- Modifying `app/sentinel-api/src/modules/identity/student-whitelist/data/purge-student-whitelist.ts`.
- Modifying `app/sentinel-api/src/modules/identity/users/data/create-user.ts` and `update-user.ts`.
- Adding automated unit and integration tests across student whitelist and user creation services.

## Non-goals

- Altering the database schema or PostgreSQL table definitions.
- Changing student onboarding authentication mechanisms.

## Phases

- [x] [`phase-01-whitelist-deletion-cascade.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/phase-01-whitelist-deletion-cascade.md) — Phase 1: Cascade deletion of unclaimed placeholder student records upon whitelist delete and purge.
- [x] [`phase-02-admin-user-management-placeholder-sync.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/phase-02-admin-user-management-placeholder-sync.md) — Phase 2: Align admin user creation and update workflows with student placeholder claiming and compound index.
- [x] [`phase-03-comprehensive-verification.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/phase-03-comprehensive-verification.md) — Phase 3: Monorepo test suite verification and typecheck diagnostics.

## Verification

- Vitest test suites:
  - `pnpm --filter sentinel-api test src/modules/identity/student-whitelist/`
  - `pnpm --filter sentinel-api test src/modules/identity/onboarding/`
  - `pnpm --filter sentinel-api test src/modules/identity/users/`
  - `pnpm --filter sentinel-api test src/modules/identity/enrollments/`
  - `pnpm --filter sentinel-web test "src/app/(protected)/onboarding" "src/app/(protected)/(instructor)/classrooms"`

### Phase 1 Evidence

- `pnpm --filter sentinel-api test src/modules/identity/student-whitelist/tests/student-whitelist.service.test.ts` — PASS: 1 test file passed, 9/9 tests passed, duration 51.41s.
- Files modified:
  - `app/sentinel-api/src/modules/identity/student-whitelist/data/delete-student-whitelist.ts`
  - `app/sentinel-api/src/modules/identity/student-whitelist/data/purge-student-whitelist.ts`
  - `app/sentinel-api/src/modules/identity/student-whitelist/services/delete-student-whitelist.ts`
  - `app/sentinel-api/src/modules/identity/student-whitelist/tests/student-whitelist.service.test.ts`
  - `docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/phase-01-whitelist-deletion-cascade.md`

### Phase 2 Evidence

- `pnpm --filter sentinel-api test src/modules/identity/users/data/tests/create-user.test.ts` — PASS: 1 test file passed, 3/3 tests passed in 5.08s.
- `pnpm --filter sentinel-api test src/modules/identity/users/` — PASS: 14 test files passed, 36/36 tests passed in 18.90s.
- `pnpm --filter sentinel-api test src/modules/identity/onboarding/` — PASS: 2 test files passed, 12/12 tests passed in 18.99s.
- `pnpm --filter sentinel-api test src/modules/identity/student-whitelist/` — PASS: 3 test files passed, 20/20 tests passed in 29.95s.
- Files modified:
  - `app/sentinel-api/src/modules/identity/users/data/create-user.ts`
  - `app/sentinel-api/src/modules/identity/users/data/update-user.ts`
  - `app/sentinel-api/src/modules/identity/users/data/tests/create-user.test.ts`
  - `docs/tasks/2026/08/2026-08-24/sync-student-whitelist-and-placeholder-lifecycle/phase-02-admin-user-management-placeholder-sync.md`

### Phase 3 Evidence

- `pnpm --filter sentinel-api test src/modules/identity/onboarding/` — PASS (2/2 test files, 12/12 tests passed in 18.99s)
- `pnpm --filter sentinel-api test src/modules/identity/student-whitelist/` — PASS (3/3 test files, 20/20 tests passed in 29.95s)
- `pnpm --filter sentinel-api test src/modules/identity/users/` — PASS (14/14 test files, 36/36 tests passed in 18.90s)
- `pnpm --filter sentinel-api test src/modules/identity/enrollments/` — PASS (16/16 test files, 34/34 tests passed in 22.95s)
- `pnpm --filter sentinel-web test "src/app/(protected)/onboarding" "src/app/(protected)/(instructor)/classrooms"` — PASS (1/1 test file passed)

## Result
All 3 phases successfully implemented and verified. Master task completed.
