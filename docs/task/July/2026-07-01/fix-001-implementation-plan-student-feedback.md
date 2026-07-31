# Fix 001 Implementation Plan: Student Feedback Submit and UI

## Pre-Planning

- [x] Task summary: students receive a 403 when submitting post-exam feedback, and the student feedback and thank-you screens need a compact, centered, exam-aligned UI.
- [x] Relevant source files scanned:
    - `docs/context/July/feedback-issue.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `app/sentinel-api/src/modules/general/feedbacks/controllers/create-feedback.controller.ts`
    - `app/sentinel-api/src/modules/general/feedbacks/services/create-feedback.service.ts`
    - `app/sentinel-api/src/modules/general/feedbacks/data/create-feedback.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`
- [x] Files, services, and DB tables likely touched:
    - `app/sentinel-api/src/modules/general/feedbacks/controllers/create-feedback.controller.ts`
    - `app/sentinel-api/src/modules/general/feedbacks/controllers/create-feedback.controller.test.ts`
    - `app/sentinel-api/src/modules/general/feedbacks/services/create-feedback.service.ts`
    - `app/sentinel-api/src/modules/general/feedbacks/services/create-feedback.service.test.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx`
    - DB table: `exam_feedbacks`
- [x] Prisma migration decision: no migration needed because `exam_feedbacks`, its indexes, its unique `attempt_id`, and its Prisma model already exist.

## Three Viable Options

### Option 1: Permission Sync Only

- [ ] Keep `requireActivePermission(c, 'feedback:create')` in `create-feedback.controller.ts`.
- [ ] Add or update permission blueprint/sync tests to prove the student role receives `feedback:create`.
- [ ] Confirm production data has run access-control sync.

Tradeoff: preserves strict RBAC, but still fails for real students with stale or missing role-permission mappings.

### Option 2: Self-Owned Student Action Authorization

- [ ] Remove the route-level `feedback:create` permission check from `create-feedback.controller.ts`.
- [ ] Keep authenticated user validation in the controller.
- [ ] Rely on `create-feedback.service.ts` to verify the caller has a real student profile, owns the attempt, the attempt is completed, and feedback does not already exist.

Tradeoff: best match for a student self-action and resilient to stale RBAC while still blocking non-students and cross-student attempts.

### Option 3: Hybrid Authorization

- [ ] Allow feedback submission when the caller either has `feedback:create` or passes real student profile and owned-attempt checks.
- [ ] Add branch tests for both permission-based and student-profile-based authorization.

Tradeoff: most defensive, but adds extra authorization branching without much value because owned-attempt checks are already required.

## Best Option

Choose Option 2.

Why: the feedback submit endpoint is a self-owned student action for a completed exam attempt. The existing service already enforces actual student identity, attempt ownership, completion status, duplicate prevention, and insert behavior. This matches the nearby completed-session flow, which authorizes by real student profile instead of relying only on role claims or RBAC mappings. It is the smallest maintainable fix for the reported student 403.

Concrete next steps:

1. Remove only the `feedback:create` route guard from the create feedback controller.
2. Add API controller tests proving a student can submit with empty `activePermissionKeys`.
3. Add service tests for non-student, non-owned attempt, incomplete attempt, duplicate feedback, and successful completed-attempt insert.
4. Compact the feedback page while preserving submit behavior.
5. Restyle the thank-you page to reuse the same visual pattern and exam context.
6. Run focused API and web feedback tests.

## Phase 1: API Submit Authorization

**Goal:** Allow real students to submit feedback for their own completed attempts without being blocked by stale or missing `feedback:create` RBAC mappings.

- [x] In `app/sentinel-api/src/modules/general/feedbacks/controllers/create-feedback.controller.ts`, remove the `requireActivePermission(c, 'feedback:create', ...)` call and its unused import.
- [x] In `app/sentinel-api/src/modules/general/feedbacks/controllers/create-feedback.controller.ts`, keep the existing `user?.id` guard before calling `FeedbackService.createFeedback()`.
- [x] In `app/sentinel-api/src/modules/general/feedbacks/services/create-feedback.service.ts`, keep the existing student profile lookup, owned attempt query, completed attempt guard, duplicate feedback guard, and insert call as the authorization source of truth.
- [x] Add `app/sentinel-api/src/modules/general/feedbacks/controllers/create-feedback.controller.test.ts`.
- [x] Write a controller test that sets `activePermissionKeys` to `[]`, posts valid feedback JSON, and expects `201`.
- [x] Write a controller test that omits `user.id`, posts valid feedback JSON, expects `403`, and asserts `FeedbackService.createFeedback()` was not called.
- [x] Write a controller test that mocks `FeedbackService.createFeedback()` to throw a `409` duplicate-feedback `HTTPException` and expects a `409` response.
- [x] Add `app/sentinel-api/src/modules/general/feedbacks/services/create-feedback.service.test.ts`.
- [x] Write a service test that returns `403` when no `students` row exists for the user.
- [x] Write a service test that returns `404` when the requested `attemptId` does not belong to the student.
- [x] Write a service test that returns `409` when the owned attempt has no `completed_at`.
- [x] Write a service test that returns `409` when `exam_feedbacks` already contains the attempt.
- [x] Write a service test that inserts feedback for a completed owned attempt, trims `experience`, and returns the serialized feedback record.

**Migration required:** No — this phase changes route authorization and tests only.
**Migration applied:** No — existing `exam_feedbacks` schema already covers the feature.
**Breaking changes:** No — `POST /feedbacks` keeps the same payload and response shape.

<!-- NOTE: Phase 1 validation used `pnpm --dir app/sentinel-api exec vitest run src/modules/general/feedbacks/controllers/create-feedback.controller.test.ts src/modules/general/feedbacks/services/create-feedback.service.test.ts` because `pnpm --dir app/sentinel-api test -- ...` expanded into unrelated failing suites in this workspace. -->

## Phase 2: Feedback Page UI Compact Alignment

**Goal:** Center the feedback form horizontally and vertically, make it compact, and align the visible details to the current examination.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`, retain the existing `useCreateFeedbackMutation()` behavior, success redirect, duplicate redirect, error toast, rating validation, missing-attempt validation, and skip link.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`, replace the oversized custom wrapper with a compact centered shell using existing `@sentinel/ui` primitives or a local page-level shell.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`, show the current examination title from `exam?.title` in the header, with `Post-exam experience` as the fallback.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`, reduce vertical spacing, large radius values, and rating control height so the form fits on common laptop and mobile heights.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`, keep the optional details textarea capped at `2000` characters and continue sending trimmed `experience` or `null`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.test.tsx`.
- [x] Write a page test that verifies the exam title appears in the feedback header.
- [x] Keep or update the rating-required test to verify submit is blocked when no rating is selected.
- [x] Keep or update the successful-submit test to verify `{ attemptId, rating, experience }` is sent and the thank-you redirect URL is unchanged.
- [x] Add a missing-`attemptId` test that verifies `Attempt information is missing. Return to your exam history.` appears and no mutation runs.

**Migration required:** No — this phase changes frontend layout and tests only.
**Migration applied:** No — frontend-only page and test updates.
**Breaking changes:** No — submit payload, redirect flow, and links remain the same.

## Phase 3: Thank-You Page Style Parity

**Goal:** Make the thank-you page visually match the feedback page component style.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`, reuse the same compact centered shell/card styling from the feedback page.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`, read `exam` from `useStudentExamData()` and show `exam?.title` in the same exam-context position as the feedback page.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`, keep `View Exam Result` linking to `/student/history/details?attemptId=${attemptId}` when `attemptId` exists.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`, keep the no-`attemptId` fallback linking to `/student/history`.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`, keep `Back to Exam` linking to `/student/exam/${examId}`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx`.
- [x] Write a thank-you page test that verifies the thank-you message renders.
- [x] Write a thank-you page test that verifies the exam title renders when supplied by `useStudentExamData()`.
- [x] Keep or update the link assertions for `View Exam Result` and `Back to Exam`.
- [x] Add a no-`attemptId` test that verifies `View Exam Result` links to `/student/history`.

**Migration required:** No — this phase changes frontend layout and tests only.
**Migration applied:** No — frontend-only page and test updates.
**Breaking changes:** No — thank-you links and navigation remain compatible with the existing flow.

## Phase 4: Final Validation

**Goal:** Verify the backend fix and UI behavior without broad unrelated changes.

- [x] Run `pnpm --dir app/sentinel-api test -- create-feedback`.
- [x] Run `pnpm --dir app/sentinel-web test -- feedback`.
- [ ] Run `pnpm lint` if the focused tests pass and time permits.
- [ ] Manually verify `/student/exam/[id]/feedback?attemptId=[attemptId]` as a student who previously hit the 403.
- [ ] Confirm successful submit redirects to `/student/exam/[id]/feedback/thank-you?attemptId=[attemptId]`.
- [ ] Confirm duplicate submit routes to the thank-you page instead of showing a hard error.

**Migration required:** No — this phase performs validation only.
**Migration applied:** No — validation only.
**Breaking changes:** No — verification pass only.

<!-- NOTE: Focused API validation passed with `pnpm --dir app/sentinel-api exec vitest run src/modules/general/feedbacks/controllers/create-feedback.controller.test.ts src/modules/general/feedbacks/services/create-feedback.service.test.ts`. -->
<!-- NOTE: Focused web validation passed with `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/feedback/page.test.tsx' 'src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx'`. -->
<!-- NOTE: Targeted web lint passed with `pnpm --dir app/sentinel-web exec eslint ...feedback/page.tsx ...feedback/page.test.tsx ...feedback/thank-you/page.tsx ...feedback/thank-you/page.test.tsx`. -->
<!-- NOTE: Targeted API lint could not run because `pnpm --dir app/sentinel-api exec eslint ...` failed with `Command "eslint" not found` in the workspace. -->
<!-- NOTE: Manual student-flow verification remains pending because no browser-authenticated student session was available in this execution context. -->

## Public API and Compatibility Notes

- [ ] Keep the `POST /feedbacks` request and response schema unchanged.
- [ ] Keep `GET /feedbacks` and `GET /feedbacks/{id}` protected by `feedback:view`.
- [ ] Leave `feedback:create` defined in shared permission constants for catalog compatibility, but do not rely on it for student feedback submission.
- [ ] Do not add dependencies.
- [ ] Do not add environment variables.
- [ ] Do not add a Prisma migration.

## Done Criteria

- [ ] Student feedback submission no longer returns 403 for a real student submitting feedback for their own completed attempt.
- [ ] Non-students cannot submit feedback.
- [ ] Students cannot submit feedback for another student's attempt.
- [ ] Incomplete attempts cannot receive feedback.
- [ ] Duplicate attempt feedback returns the existing duplicate behavior.
- [ ] Feedback page is compact, horizontally centered, vertically centered, and exam-aligned.
- [ ] Thank-you page matches the feedback page styling and keeps correct links.
- [x] Focused API and web feedback tests pass.
