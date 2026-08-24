---
title: "Phase 2: API Eligibility Fix and Regression Tests"
type: phase
parent: "Fix Student Onboarding False Already-Claimed Conflict & Stale Whitelist Cleanup"
phase: "2"
status: planned
created: "2026-08-24"
tags: [task, phase, api, onboarding, tests]
---

# Phase 2: API Eligibility Fix and Regression Tests

## Objective

Fix `assertStudentOnboardingEligibility` to avoid triggering false `"already registered to another account"` errors when a placeholder student row (`user_id = null`) exists, and add automated regression test coverage.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- [MODIFY] [`app/sentinel-api/src/modules/identity/onboarding/services/assert-student-onboarding-eligibility.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/services/assert-student-onboarding-eligibility.ts)
- [MODIFY] [`app/sentinel-api/src/modules/identity/onboarding/tests/onboarding.service.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/tests/onboarding.service.test.ts)

## Implementation Tasks

- [ ] Update `assertStudentOnboardingEligibility`:
  ```ts
  if (
      context.conflictingStudent &&
      context.conflictingStudent.user_id &&
      context.conflictingStudent.user_id !== userId
  ) {
      throw new Error(
          `Student number "${studentData.studentNumber}" is already registered to another account.`,
      );
  }
  ```
- [ ] Add unit/integration test case in `onboarding.service.test.ts`:
  - Verify that onboarding succeeds when an existing `students` placeholder record (`user_id: null`) exists for the whitelisted student number.
  - Verify that onboarding is rejected when an existing `students` record has a different non-null `user_id`.

## Verification & Testing

- Run Vitest suite:
  ```bash
  pnpm --filter sentinel-api test src/modules/identity/onboarding/tests/onboarding.service.test.ts
  ```
- Run typecheck:
  ```bash
  pnpm --filter sentinel-api typecheck
  ```

## Risks & Rollback

- **Risk**: Regression where a student claims an already claimed student number.
- **Mitigation**: Whitelist checks `context.whitelistRecord.claimed_user_id` and student table checks `context.conflictingStudent.user_id`, guaranteeing full dual-layer validation against cross-account claiming.
