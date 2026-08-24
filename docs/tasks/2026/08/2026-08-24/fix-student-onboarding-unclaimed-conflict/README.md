---
title: "Fix Student Onboarding False Already-Claimed Conflict & Stale Whitelist Cleanup"
type: task
status: planned
created: "2026-08-24"
tags: [task, identity, onboarding, student-whitelist, database]
---

# Fix Student Onboarding False Already-Claimed Conflict & Stale Whitelist Cleanup

## Outcome

1. Resolve the false-positive conflict error where students attempting to complete onboarding are erroneously rejected with `"Student number \"...\" is already registered to another account."` even when the whitelist record is unclaimed.
2. Ensure placeholder student records created with `user_id: null` (e.g. during section pre-enrollment) can be properly claimed and bound to the authenticated student during onboarding.
3. Clean up the remaining 42 unclaimed placeholder records in the `students` table in Supabase corresponding to the removed whitelisted student batch.

## Pre-planning record

### Actors and goals

- **Student User**: Wants to complete onboarding using their approved student number without encountering false "already claimed" or "already registered" blocking errors.
- **Academic Admin / Instructor**: Wants to pre-enroll students or manage whitelists without creating blocking orphan student states.

### Domain language

- **`student_whitelist`**: Institutional pre-registration roster containing approved `student_number`, name, department, course, and `claimed_user_id`.
- **`students`**: Registered student identity records linked to `user_id`, or placeholder student records with `user_id: null` created during pre-enrollment.
- **Unclaimed Placeholder**: A row in `students` where `user_id IS NULL` awaiting account onboarding by the legitimate student.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Student onboards with active whitelist and existing placeholder student record (`user_id = null`) | Valid whitelist entry, pre-enrolled placeholder in `students` | Eligibility check passes, `students` and `student_whitelist` are updated with `user_id` | If `user_id` belongs to another real user (`user_id !== null && user_id !== currentUserId`), reject | Planned |
| SC-02 | Cleanup stale placeholder student records in Supabase | 42 unclaimed records exist in `students` with `user_id IS NULL` for previously deleted whitelists | Delete the 42 orphan placeholder rows from `students` | Preserve any records associated with active `user_id` | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | When should `conflictingStudent` block student onboarding? | Only when `conflictingStudent.user_id` is truthy AND not equal to the onboarding `userId`. | Placeholder rows with `user_id: null` are created during section enrollment and must be claimed on onboarding via `createStudentData` upsert. | Rejecting any existing `student_number` prevents pre-enrolled students from ever completing onboarding. | `assert-student-onboarding-eligibility.ts` |
| DEC-02 | How to clean up the removed batch in Supabase? | Delete only the 42 placeholder rows in `students` where `user_id IS NULL` matching the 46 student numbers. | 3 records have active `user_id` and should be preserved unless explicitly requested; the 42 orphan placeholders are safe to remove. | Mass deleting registered active user profiles. | `phase-01` |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01 | `assertStudentOnboardingEligibility` does NOT throw when `conflictingStudent.user_id` is `null` or matches `userId`. | Update condition in `assert-student-onboarding-eligibility.ts` to `Boolean(context.conflictingStudent?.user_id) && context.conflictingStudent.user_id !== userId`. | Unit & integration test in `onboarding.service.test.ts`. | Planned |
| AC-02 | SC-01 | Onboarding completes and links `user_id` to existing placeholder student record. | Existing `createStudentData` on-conflict update executes smoothly. | Test assertion verifying `student.user_id` is populated. | Planned |
| AC-03 | SC-02 | Stale 42 unclaimed placeholder records in `students` are cleanly deleted from Supabase. | Execute transactional deletion query for the 42 student numbers where `user_id IS NULL`. | Database query verifying 0 matching placeholder records remain. | Planned |

## Scope

- Modifying `app/sentinel-api/src/modules/identity/onboarding/services/assert-student-onboarding-eligibility.ts`.
- Adding regression test cases in `app/sentinel-api/src/modules/identity/onboarding/tests/onboarding.service.test.ts`.
- Database cleanup of the 42 orphan placeholder records in `students` table in Supabase.

## Non-goals

- Modifying student whitelist bulk import or schema structure.
- Deleting registered user accounts (`auth.users`, `user_profiles`) for students who have actively registered.

## Phases

- [x] [`phase-01-database-stale-placeholder-cleanup.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/fix-student-onboarding-unclaimed-conflict/phase-01-database-stale-placeholder-cleanup.md) — Phase 1: Clean up orphan placeholder student records in Supabase.
- [ ] [`phase-02-api-eligibility-fix-and-tests.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/fix-student-onboarding-unclaimed-conflict/phase-02-api-eligibility-fix-and-tests.md) — Phase 2: Fix eligibility assertion for unclaimed placeholder students and add regression tests.

## Verification

- Vitest test suite: `pnpm --filter sentinel-api test src/modules/identity/onboarding/tests/onboarding.service.test.ts`
- Database query: Verify 0 orphan placeholder student records remain for the specified student numbers.

## Result
Planned.
