# Fix 001 Implementation Plan: Private Visibility For Assigned Exams

**Status:** Planned  
**Date:** 2026-07-08  
**Type:** fix  
**Scope:** `sentinel-api`

## Pre-Planning

- **Task Summary:** Ensure private published exams remain visible to assigned students/instructors while being hidden from unrelated users, with list, detail, grading, reporting, and monitoring routes using one consistent visibility contract.
- **Source Files Scanned:**
    - `docs/context/July/fix-private-visibility-assigned.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts`
    - `app/sentinel-api/src/modules/examination/assessment/assessment-access.test.ts`
    - `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts`
    - `app/sentinel-api/src/modules/examination/assign/services/exam-access.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams-instructor-visibility.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts`
    - `app/sentinel-api/src/modules/examination/grading/data/get-grading-exams.ts`
    - `app/sentinel-api/src/modules/examination/grading/data/grading-visibility.test.ts`
    - `app/sentinel-api/src/modules/examination/reporting/services/get-reporting-exam-context.ts`
    - `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.ts`
    - `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.test.ts`
    - `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.ts`
- **Files, Services, And DB Tables To Touch:**
    - `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts`
    - `app/sentinel-api/src/modules/examination/assessment/assessment-access.test.ts`
    - `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts`
    - `app/sentinel-api/src/modules/examination/assign/services/exam-access.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams-instructor-visibility.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts`
    - `app/sentinel-api/src/modules/examination/grading/data/get-grading-exams.ts`
    - `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts`
    - `app/sentinel-api/src/modules/examination/grading/data/grading-visibility.test.ts`
    - `app/sentinel-api/src/modules/examination/reporting/services/get-reporting-exam-context.ts`
    - `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.ts`
    - `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.test.ts`
    - `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.ts`
    - DB tables: `exams`, `exam_section_assignments`, `exam_assigned_sections`, `proctor_assignments`, `exam_shares`, `classroom_instructor_assignments`, `students`, `enrollments`, `class_groups`, `subject_offerings`, `sections`, `subject_departments`, `exam_remediation_schedules`, `exam_attempts`, `user_profiles`
- **Prisma Migration Needed:** No. The required fields already exist: `exams.is_public`, `exams.created_by`, `exams.institution_id`, `exam_section_assignments.instructor_id`, `exam_section_assignments.class_group_id`, `proctor_assignments`, `exam_shares`, and student enrollment/classroom tables. This fix is access predicate, controller, and test work only.

## 1-3-1 Options

### Option 1: Patch Detail Guard Only

Update `assertExamReadScope()` so admin and staff detail reads block private exams unless the actor created, is assigned to, or is shared on the exam.

- **Tradeoff:** Fastest way to close the direct detail leak, but it leaves list, grading, reporting, monitoring, and assignment predicates slightly different from one another.

### Option 2: Shared Staff Visibility Contract

Create one reusable staff exam visibility predicate/authorization contract and use it from exam list, exam detail, grading, reporting, and monitoring surfaces while preserving the existing student published-assignment predicate.

- **Tradeoff:** Touches more API files, but it fixes the root cause: duplicated, drifting visibility rules across surfaces.

### Option 3: Role Policy Matrix Service

Build a new dedicated `exam-visibility-policy.service.ts` that models all student, instructor, admin, support, and superadmin rules as policy objects and emits query predicates or authorization decisions per route.

- **Tradeoff:** Most explicit and scalable long-term, but it is heavier than needed for this bug and risks a large refactor before the current staff/admin rule is fully confirmed.

## Best Option

Choose **Option 2: Shared Staff Visibility Contract**.

Why: The current student list/detail predicates already intentionally keep private assigned exams visible and public unassigned exams hidden from unrelated students. The sharper gap is staff/admin consistency: `/exams`, `/exams/:id`, grading, reporting, and monitoring use overlapping but not identical staff predicates. A shared contract keeps the existing codebase layering intact, avoids new dependencies, and directly targets the root cause without changing schema.

**Concrete next steps:**

1. Codify the admin product rule as staff-style scoped access: private unassigned exams are hidden from admins unless the admin created, is assigned to, or is shared on the exam; public exams remain visible inside the active institution and department scope.
2. Add a shared staff visibility predicate builder in `assign/services/exam-access.ts` that covers public same-institution, creator, `exam_section_assignments.instructor_id`, accepted proctor assignment, classroom instructor assignment, and `exam_shares`.
3. Add an assigned-only predicate variant for reporting/attempt contexts that intentionally excludes public-only access where attempts must require active assignment.
4. Update `get-exams.ts`, `get-exam-by-id.ts`, and `get-exam.controller.ts` to use the shared contract for staff/admin list and direct detail access.
5. Update grading, reporting, and monitoring context queries to call the same shared helpers instead of carrying local visibility logic.
6. Add regression tests for student private-assigned visibility, public-unassigned student exclusion, private unassigned staff/detail denial, assigned instructor access, shared instructor access, and admin behavior.
7. Run focused API tests first, then the full `app/sentinel-api` Vitest suite.

## Phase 1: Lock The Visibility Matrix In Tests

**Goal:** Convert the context file's intended behavior into failing/passing regression tests before changing implementation.

- [x] Add tests in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` proving `buildStudentExamVisibilityPredicate()` keeps private published exams visible through exact `exam_section_assignments.class_group_id` and does not require `e.is_public = true`.
- [x] Add tests in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` proving public published exams still require enrollment/assignment matching and do not become student-visible just because `is_public = true`.
- [x] Add tests in `app/sentinel-api/src/modules/examination/exams/data/get-exams-instructor-visibility.test.ts` for staff list visibility covering public same-institution, created private exam, `exam_section_assignments.instructor_id`, accepted `proctor_assignments`, `exam_shares`, and private unassigned denial.
- [x] Add tests in `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts` for direct detail access covering assigned instructor allowed, shared instructor allowed, unassigned instructor denied, admin-created private exam allowed, and admin-unassigned private exam denied.
- [x] Add tests in `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts` proving staff detail queries use the shared staff visibility predicate when a staff actor is supplied.

**Migration required:** No — this phase adds regression coverage over existing tables and routes only.

## Phase 2: Centralize Staff Exam Visibility Predicates

**Goal:** Replace duplicated staff visibility logic with reusable Kysely predicate builders.

- [x] Add an exported `buildStaffExamVisibilityPredicates()` helper in `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts` that accepts `dbClient`, `userId`, `institutionId`, and optional `includePublicInstitutionExams`.
- [x] Ensure `buildStaffExamVisibilityPredicates()` includes same-institution public exams only when `includePublicInstitutionExams` is true.
- [x] Ensure `buildStaffExamVisibilityPredicates()` includes creator ownership through `e.created_by = userId`.
- [x] Ensure `buildStaffExamVisibilityPredicates()` includes explicit instructor rows through `exam_section_assignments.instructor_id = userId`.
- [x] Ensure `buildStaffExamVisibilityPredicates()` includes accepted proctor assignments through the existing `getProctorAssignmentColumnSupport()` logic and `EXAM_ASSIGNMENT_ACCESS_STATUSES`.
- [x] Ensure `buildStaffExamVisibilityPredicates()` includes classroom instructor ownership through `classroom_instructor_assignments.instructor_user_id = userId`.
- [x] Ensure `buildStaffExamVisibilityPredicates()` includes explicit shares through `exam_shares.user_id = userId`.
- [x] Refactor `buildInstructorExamVisibilityPredicates()` in `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts` to call `buildStaffExamVisibilityPredicates()` with `includePublicInstitutionExams: false` so creator, explicit assignment, accepted proctor assignment, classroom instructor ownership, and shares remain available without public-only access.
- [x] Refactor `buildAssignedInstructorExamVisibilityPredicates()` in `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts` to call the same lower-level assignment helpers while excluding public, creator, and share paths for assignment-only reporting contexts.
- [x] Add JSDoc to each new or changed exported helper in `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts`.
- [x] Update `app/sentinel-api/src/modules/examination/assign/services/exam-access.test.ts` to assert the compiled predicates contain `exam_section_assignments`, accepted `proctor_assignments`, `classroom_instructor_assignments`, `exam_shares`, creator ownership, and same-institution public access only when requested.

**Migration required:** No — this phase only centralizes SQL predicates over existing tables.

## Phase 3: Apply Shared Visibility To Exam List And Detail

**Goal:** Make `/exams` and `/exams/:id` enforce the same private/public staff access rules.

- [x] Update `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` to replace its inline instructor/admin predicate block with `buildStaffExamVisibilityPredicates({ dbClient, userId: instructorUserId, institutionId, includePublicInstitutionExams: true })`.
- [x] Keep the existing `institutionId` guard in `getExamsData()` so staff visibility cannot run without an institution scope.
- [x] Extend `GetExamByIdDataArgs` in `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts` with optional `staffUserId` and `applyStaffVisibility` fields.
- [x] Update `getExamByIdData()` in `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts` to apply `buildStaffExamVisibilityPredicates()` when `applyStaffVisibility` and `staffUserId` are provided.
- [x] Update `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts` to pass `instructorUserId` from `resolveAssessmentReadScope()` into the first `getExamByIdData()` access lookup.
- [x] Update `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts` to remove the separate manual `exam_shares` lookup if the shared predicate fully covers direct-detail access.
- [x] Update `assertExamReadScope()` in `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts` only if a small post-fetch guard remains necessary for roles not represented by SQL predicate inputs.
- [x] Add JSDoc to any changed exported helper in `app/sentinel-api/src/modules/examination/assessment/assessment-access.ts`.
- [x] Update tests in `app/sentinel-api/src/modules/examination/exams/data/get-exams-instructor-visibility.test.ts` and `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts` to assert list and detail SQL both include the shared predicate arms.
- [x] Update tests in `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts` to assert unassigned private staff/admin direct detail requests return 404 through the access lookup.

**Migration required:** No — this phase changes query/controller behavior only.

## Phase 4: Align Grading, Reporting, And Monitoring Surfaces

**Goal:** Ensure instructor-facing operational surfaces use the same staff/assigned visibility semantics as exam list/detail.

- [x] Update `app/sentinel-api/src/modules/examination/grading/data/get-grading-exams.ts` to use the shared staff visibility helper for grading exam lists.
- [x] Update `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts` to use the shared staff visibility helper for grading student detail queries.
- [x] Update `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.ts` to replace its inline instructor predicate with `buildStaffExamVisibilityPredicates({ includePublicInstitutionExams: true })`.
- [x] Update `app/sentinel-api/src/modules/examination/reporting/services/get-reporting-exam-context.ts` to keep assignment-only context access by using the assigned-only helper variant.
- [x] Update `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.ts` to use the shared staff visibility helper and keep institution scoping intact.
- [x] Add or update tests in `app/sentinel-api/src/modules/examination/grading/data/grading-visibility.test.ts` proving grading list/detail queries include `exam_section_assignments`, accepted proctor assignments, classroom instructor ownership, and shares where intended.
- [x] Add or update tests in `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.test.ts` proving report list queries use the same public/creator/assignment/share staff access contract.
- [x] Add `app/sentinel-api/src/modules/examination/reporting/services/get-reporting-exam-context.test.ts` if missing, and cover assigned-only access for private exams.
- [x] Add `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.test.ts` if missing, and cover private assigned access plus private unassigned denial for instructors.

**Migration required:** No — this phase aligns existing read queries only.

## Phase 5: Verify Assignment Data Is Not The Active Failure

**Goal:** Keep privacy fixes separate from assignment persistence/data repair and document how to diagnose bad existing rows.

- [x] Inspect `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts` and record whether `createExam()` writes `exam_section_assignments` rows for private and public exams when classroom, instructor, room, or schedule fields are provided.
- [x] Inspect `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts` and record whether updating only `isPublic` preserves existing `exam_section_assignments` rows and denormalized assignment summary fields.
- [x] Inspect `app/sentinel-api/src/modules/examination/section-assignments/data/sync-exam-assignment-summary.ts` and record whether `exams.class_group_id`, `section_id`, `section_name`, and `room_id` remain aligned with assignment rows after create/update.
- [x] Add a diagnostic SQL snippet to `docs/context/July/fix-private-visibility-assigned.md` or the implementation execution log that checks `exams`, `exam_section_assignments`, `proctor_assignments`, `exam_shares`, `students`, and `enrollments` for one affected exam ID.
- [x] Do not add a Prisma migration or automatic data backfill unless reproduction proves missing assignment rows still exist after the July 5 assignment sync fix.
- [x] Add or update tests in `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.test.ts` proving `createExam()` persists assignment rows for both private and public classroom-assigned exams.
- [x] Add or update tests in `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.test.ts` proving an `isPublic`-only update preserves existing assignment rows and assignment summary fields.

**Migration required:** No — this phase validates existing write paths and may only add documentation or service tests.

## Phase 6: Validation And Regression Sweep

**Goal:** Run focused API tests first, then broader checks once the visibility contract is implemented.

- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/assign/services/exam-access.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/get-exams-instructor-visibility.test.ts src/modules/examination/exams/data/get-exam-by-id.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/controllers/get-exam.controller.test.ts src/modules/examination/exams/controllers/get-exams.controller.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts src/modules/examination/exams/data/get-exams.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/grading/data/grading-visibility.test.ts src/modules/examination/reporting/services/get-exam-reports-list.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/reporting/services/get-reporting-exam-context.test.ts src/modules/examination/monitoring/services/get-monitoring-exam-context.test.ts --reporter=verbose` if those tests are added.
- [ ] Run `pnpm --dir app/sentinel-api test` after focused tests pass.
- [ ] Run `pnpm lint` after all API tests pass.

**Migration required:** No — validation does not require schema changes.

## Public API / Type Changes

- No endpoint path changes are planned.
- No response shape changes are planned for `/exams`, `/exams/:id`, grading, reporting, or monitoring endpoints.
- Internal data function signatures may gain optional staff visibility arguments, but public API clients should remain unchanged.

## Breaking API Changes

- None expected.
- Expected behavior change: private exams become consistently hidden from unrelated staff/admin direct detail routes and operational surfaces, while remaining visible to assigned students and assigned/shared/creator staff.

## Environment Changes

- No new `.env` variables are required.

## Rollback Note

- No Prisma migration rollback is required.
- If implementation regresses access, revert changes to `assessment-access.ts`, `assign/services/exam-access.ts`, affected data/controller/service query files, and the associated tests.
- If an optional diagnostic data repair is later performed outside this plan, record affected `exam_id` values and inserted `exam_section_assignments` rows separately so the data operation can be reversed independently.

## Done Criteria

- [ ] The admin/staff product rule for private exams is explicit in tests and documentation.
- [ ] Student list and detail access still allow private published exams assigned to the student's active classroom.
- [ ] Student list and detail access still reject public published exams that are not assigned to the student.
- [ ] `/exams` and `/exams/:id` use the same staff visibility contract for private/public exams.
- [ ] Grading, reporting, and monitoring use the shared staff or assigned-only predicate variant intentionally.
- [ ] Private unassigned exams cannot be opened by unrelated instructors through direct URL/API.
- [ ] Shared private exams are visible to the shared staff actor where product rules allow.
- [ ] Focused API tests and `pnpm --dir app/sentinel-api test` pass.
- [ ] No Prisma migration is created.
