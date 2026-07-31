# Fix Exam Visibility Implementation Plan

## Task Summary

Fix student exam and history visibility so published exams assigned to the student's classroom are returned, while centralizing exam GET access decisions and removing brittle manually typed role logic from the controllers.

## Source Scan Summary

- `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.ts` resolves actor role, institution scope, student profile context, department scope, and staff visibility before calling `ExamService.getExams()`.
- `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts` resolves role, applies read access, then duplicates instructor/private-exam checks before calling `ExamService.getExamById()`.
- `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts` owns shared role normalization, read/manage assertions, institution scoping, staff detection, and exam access logging.
- `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` applies student, instructor, department, classroom, and published visibility filters.
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts` applies published/student visibility filters for single exam fetches.
- `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts` contains the reusable SQL predicates for published student visibility, classroom filters, explicit assignment filters, remediation schedules, and legacy fallback behavior.
- `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history.ts` reuses `getExamsData()` for student history list visibility.
- `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts` has its own attempt-owned, published-exam detail query.
- `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts` drives both `/student/exam` and `/student/history`; available exams come from `useExamsQuery()`, while history comes from `useInfiniteExamHistoryQuery()`.
- `packages/services/src/api/exams/core.ts` calls `/exams`; `packages/services/src/api/history.ts` calls `/history`.

## Files And Functions To Touch

- `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts`
    - Add/adjust exported helper functions for assessment actor role classification and exam read-scope construction.
    - Keep JSDoc on every exported function added or modified.
- `app/sentinel-api/src/modules/examination/assessment/assessment-access.test.ts`
    - Cover role resolution and helper behavior without relying on manually typed controller role branches.
- `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.ts`
    - Replace controller-local student/staff branching with helper output from `assessment-access.ts`.
- `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.test.ts`
    - Verify student, instructor, admin, support, and missing-institution routing arguments into `ExamService.getExams()`.
- `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts`
    - Replace controller-local private instructor visibility logic with shared helper/service-level read scope.
- `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts`
    - Add coverage for student detail access and instructor private-exam visibility.
- `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - Tighten classroom assignment predicates so exact `exam_section_assignments.class_group_id` matches enrolled classrooms, legacy section fallback only applies when no classroom is assigned, and published/draft gates remain mandatory.
- `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts`
    - Add SQL compile tests for published classroom-assigned exams, same-section wrong-classroom exclusion, remediation schedule inclusion, and draft/unpublished exclusion.
- `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - Use the refined predicates and ensure student list queries return only published assigned exams plus allowed remediation exams.
- `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts`
    - Assert compiled SQL includes the exact classroom assignment paths used by the student exam page.
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
    - Use the same refined student visibility predicate for single exam reads.
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts`
    - Assert detail SQL preserves published gate and exact classroom assignment behavior.
- `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history.ts`
    - Confirm history list uses the corrected `getExamsData()` student scope without introducing separate visibility rules.
- `app/sentinel-api/src/modules/examination/history/tests/get-exam-history.test.ts`
    - Add a service-level assertion that the student history list delegates to `getExamsData()` with `studentUserId`.
- `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts`
    - Add or align student detail visibility safeguards only if the shared list/detail behavior reveals a gap.
- `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts`
    - Cover attempt-owned, published-only detail access and institution scoping.
- `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts`
    - Validate the student exam tab consumes `useExamsQuery()` and the history tabs consume `useInfiniteExamHistoryQuery()` with the expected filters.

## DB Tables In Scope

- `exams`
- `exam_section_assignments`
- `exam_assigned_sections`
- `students`
- `enrollments`
- `class_groups`
- `subject_offerings`
- `exam_remediation_schedules`
- `exam_attempts`
- `exam_shares`
- `proctor_assignments`
- `user_profiles`
- `sections`
- `subject_departments`
- `exam_configurations`
- `rooms`
- `flagged_incidents`

## Prisma Migration Decision

**Migration required:** No — the existing schema already has the tables and columns needed for published status, classroom assignment, enrollment, remediation, attempts, shares, and institution scoping. This fix should be query/controller/service behavior plus tests only.

## Viable Options

### Option 1: Minimal Predicate Patch

Patch `buildStudentExamVisibilityPredicate()` and reuse existing controller signatures unchanged.

**Tradeoff:** Fastest and lowest blast radius, but leaves role/scope branching spread across controllers and keeps future visibility fixes harder to reason about.

### Option 2: Shared Exam Read Scope Helper

Add a shared access helper in `assessment-access.ts` that resolves actor role, institution scope, student scope, department scope, and staff/instructor scope, then have GET controllers consume that helper while tightening the existing data predicates.

**Tradeoff:** Slightly more code than a predicate-only patch, but it centralizes the brittle access decisions and fits the existing API service/data layering.

### Option 3: Dedicated Exam Visibility Service

Create a new `exam-read-visibility.service.ts` that owns all list/detail visibility decisions, including instructor private access, student classroom scope, and history reuse.

**Tradeoff:** Most scalable if visibility keeps expanding, but it is heavier for the current bug and risks duplicating logic already split cleanly between `assessment-access.ts` and data predicates.

## Best Option

Choose **Option 2: Shared Exam Read Scope Helper**.

Why: It fixes the concrete student classroom visibility bug where it belongs, in the shared predicates, while also addressing the request to avoid manually typed role logic in GET controllers. It keeps the existing `ExamService` and data-layer patterns intact, avoids new dependencies, and avoids a larger service refactor before the visibility rules are proven by tests.

## Concrete Next Steps

1. Add shared read-scope helper functions in `assessment-access.ts` for role classification and GET query scope resolution.
2. Refactor `get-exams.controller.ts` to call the shared helper and pass its resolved `institutionId`, `studentUserId`, `departmentId`, and `instructorUserId` into `ExamService.getExams()`.
3. Refactor `get-exam.controller.ts` to call shared helper output and move private instructor access checks out of ad hoc controller branches.
4. Tighten `build-student-exam-scope-predicates.ts` so published classroom-assigned exams match active enrolled classrooms exactly and legacy fallbacks cannot leak exams from another classroom in the same section.
5. Verify `get-exams.ts`, `get-exam-by-id.ts`, and `get-student-exam-history.ts` all use the same student visibility contract.
6. Add focused Vitest coverage for predicates, controllers, history service behavior, and frontend hook routing.
7. Run focused API and web tests, then run `pnpm --dir app/sentinel-api test` if the focused suite passes.

## Phase 1: Centralize Assessment GET Scope

**Goal:** Give exam GET controllers one shared source of truth for actor role, institution, student, department, and staff visibility inputs.

- [x] Add an exported `resolveAssessmentReadScope()` helper in `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts` that accepts `dbClient`, `user`, `claimedRole`, `contextInstitutionId`, `requestedInstitutionId`, and optional `activePermissionKeys`.
- [x] Ensure `resolveAssessmentReadScope()` returns `role`, `institutionId`, `studentUserId`, `departmentId`, and `instructorUserId` without hard-coded controller-local role branches.
- [x] Keep `isStaffRole()` as the shared role classifier or replace it with a more explicit exported helper if the scope helper needs to distinguish `admin`, `superadmin`, `support`, and `instructor`.
- [x] Add JSDoc to any new or changed exported function in `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts`.
- [x] Write tests in `app/sentinel-api/src/modules/examination/assessment/assessment-access.test.ts` for student scope, instructor scope, admin department scope, support/superadmin cross-tenant institution scope, and missing user behavior.

**Migration required:** No — this phase only centralizes access-scope computation.

## Phase 2: Refactor Exam GET Controllers

**Goal:** Make `/exams` and `/exams/:id` consume the shared read scope and stop duplicating role-specific visibility rules in controllers.

- [x] Update `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.ts` to call `assertAssessmentReadAccess(c)` and `resolveAssessmentReadScope()` before invoking `ExamService.getExams()`.
- [x] Preserve the existing 400 response in `get-exams.controller.ts` when instructor visibility needs an institution context and none is available.
- [x] Remove direct `EntitlementsRepository.getStudentProfileByUserId()` calls from `get-exams.controller.ts` once the scope helper supplies `studentUserId`.
- [x] Update `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts` to use the shared scope for `studentUserId`, institution filtering, and logging role.
- [x] Extract instructor private-exam read checks from `get-exam.controller.ts` into a named helper in `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts` or a narrow exam service helper, then call it from the controller.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.test.ts` for student, instructor, admin, support/superadmin, and institution-missing cases.
- [x] Add `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts` covering student detail scope, instructor-created private exams, instructor-assigned private exams, shared private exams, and private exam 404 behavior.

**Migration required:** No — this phase changes controller/service orchestration only.

## Phase 3: Tighten Student Classroom Visibility Predicates

**Goal:** Ensure student exam list and detail queries return published exams assigned to the student's active classroom and do not leak unrelated same-section exams.

- [x] Update `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts` so direct exam classroom links match `enrollments.class_group_id = exams.class_group_id`.
- [x] Ensure `buildStudentExamVisibilityPredicate()` treats `exam_section_assignments.class_group_id = student_cg.class_group_id` as an explicit match for classroom-assigned exams.
- [x] Ensure legacy section and subject fallbacks only apply when `exams.class_group_id is null` and no exact classroom assignment exists for the exam.
- [x] Preserve `exam_remediation_schedules.student_id = studentUserId` as an allowed student visibility path while keeping the published/draft gate from `buildPublishedStudentExamPredicate()`.
- [x] Keep archived classrooms excluded via `student_cg.archived_at is null`.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` for exact classroom assignment inclusion, wrong classroom same-section exclusion, legacy null-classroom section fallback, remediation schedule inclusion, archived classroom exclusion, and draft/unpublished exclusion.
- [x] Update tests in `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts` to assert compiled SQL contains exact classroom assignment and published gates for student list queries.
- [x] Update tests in `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts` to assert compiled SQL contains the same exact classroom assignment and published gates for student detail queries.

**Migration required:** No — this phase only adjusts query predicates over existing tables.

## Phase 4: Align History Visibility

**Goal:** Confirm student history uses the same corrected exam visibility rules for list results and keeps detail results attempt-owned and published-only.

- [x] Review `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history.ts` after predicate changes and keep it delegated to `getExamsData()` with `studentUserId`.
- [x] Update `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history.ts` only if pagination or status filtering masks newly visible classroom-assigned exams.
- [x] Verify `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts` filters by `ea.attempt_id`, `st.user_id`, `e.published_at`, and institution when provided.
- [x] Add tests in `app/sentinel-api/src/modules/examination/history/tests/get-exam-history.test.ts` proving history list calls `getExamsData()` with the authenticated student's `studentUserId` and institution scope.
- [x] Add tests in `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts` proving unpublished attempts and attempts owned by another student resolve to 404.

**Migration required:** No — this phase validates existing history service behavior against corrected visibility rules.

## Phase 5: Frontend Contract Verification

**Goal:** Confirm the student exam and history pages call the correct client queries and rely on backend visibility instead of frontend-side classroom filtering.

- [x] Review `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts` and keep the available tab backed by `useExamsQuery()` with no classroom filter parameter.
- [x] Review `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts` and keep turned-in/past-due tabs backed by `useInfiniteExamHistoryQuery()` with only `status`, `search`, and `limit`.
- [x] Add or update tests in `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts` that assert `/student/exam` requests available exams through `useExamsQuery()` and `/student/history?tab=past_due` requests history through `useInfiniteExamHistoryQuery({ status: 'past_due' })`.
- [x] Add or update tests in `packages/services/src/api/exams/core.test.ts` if query string behavior needs to prove no accidental classroom parameter is sent for default student exam list calls.

**Migration required:** No — this phase verifies client request behavior only.

## Phase 6: Validation And Regression Sweep

**Goal:** Run focused tests and document the exact validation commands before implementation is considered complete.

- [x] Run `pnpm --dir app/sentinel-api test -- app/sentinel-api/src/modules/examination/assessment/assessment-access.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api test -- app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api test -- app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api test -- app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api test -- app/sentinel-api/src/modules/examination/history/tests/get-exam-history.test.ts app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts`.
- [x] Run `pnpm --dir app/sentinel-web test -- app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api test` after focused API tests pass.
- [x] Run `pnpm lint` if controller, helper, or frontend hook files changed.

**Migration required:** No — validation does not require schema changes.

## Breaking API Changes

- None expected. The `/exams`, `/exams/:id`, and `/history` response shapes should remain unchanged.
- Expected behavior change: students should now receive published exams assigned to their active classroom; students should continue not to receive draft, unpublished, archived-classroom, or unrelated classroom exams.

## Environment Changes

- No new `.env` variables required.

## Rollback Note

- No Prisma migration rollback is required.
- If implementation regresses visibility, revert the controller/helper/predicate changes and associated tests in the files listed above.
