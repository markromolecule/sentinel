# Fix 002 Implementation Plan: Student Exam Assignment Visibility

**Status:** Planned  
**Date:** 2026-07-05  
**Type:** fix  
**Scope:** `sentinel-api`, `sentinel-core`, `sentinel-web`, `packages/hooks`, `packages/services`, `packages/shared`, `packages/db`

## Pre-Planning

- **Summary of the Task:** Fix the exam creation and assignment flow so exams assigned to a classroom persist exact `exam_section_assignments` rows, keep the denormalized `exams` row in sync, and appear in the student classroom page and History Available tab.
- **Source Files Scanned:**
    - `docs/context/July/exam-not-showing-in-student.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.ts`
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-edit-form.ts`
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.test.ts`
    - `packages/shared/src/schema/exams/exam-create-schema.ts`
    - `packages/shared/src/schema/exams/exam-schema.ts`
    - `packages/shared/src/schema/exams/exam-section-assignment-schema.ts`
    - `packages/services/src/api/exams/core.ts`
    - `packages/services/src/api/exams/types.ts`
    - `packages/services/src/api/exam-section-assignments.ts`
    - `packages/hooks/src/query/exams/use-create-exam-mutation.ts`
    - `packages/hooks/src/query/exams/use-update-exam-mutation.ts`
    - `packages/hooks/src/query/exams/use-exams-query.ts`
    - `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignment-mutation.ts`
    - `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignments-batch-mutation.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/resolve-classroom-assignment.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/build-exam-write-values.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.service.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/create-exam-section-assignment.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/create-exam-section-assignments-batch.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/sync-exam-assignment-summary.ts`
    - `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts`
    - `packages/db/prisma/schema.prisma`
    - `packages/db/prisma/migrations/20260613161800_add_exam_section_assignments/migration.sql`
    - `packages/db/prisma/migrations/20260624120000_add_exam_assignment_class_group_id/migration.sql`
- **Files, Services, And DB Tables To Touch:**
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.ts`
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-edit-form.ts`
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.test.ts`
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-edit-form.test.ts`
    - `packages/services/src/api/exams/types.ts`
    - `packages/shared/src/schema/exams/exam-create-schema.ts`
    - `packages/shared/src/schema/exams/exam-schema.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/resolve-classroom-assignment.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/build-exam-write-values.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/sync-exam-assignment-summary.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/sync-exam-assignment-summary.test.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.service.test.ts`
    - `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts`
    - DB tables: `exams`, `exam_section_assignments`, `exam_assigned_sections`, `exam_shares`, `class_groups`, `sections`, `rooms`, `students`, `enrollments`, `subject_offerings`, `exam_attempts`, `exam_configurations`
- **Prisma Migration Needed:** No. The schema already has `exam_section_assignments.class_group_id`, `room_id`, `instructor_id`, and `scheduled_at`, plus the legacy `exam_assigned_sections` table and denormalized `exams.class_group_id`, `section_id`, `section_name`, and `room_id` columns. This fix should repair payload mapping, transactional writes, sync behavior, and tests. A one-time SQL backfill may be documented for existing bad rows, but it is not a Prisma schema migration.

## 1-3-1 Options

### Option 1: Frontend Payload Patch Only

Update `use-exam-create-form.ts` and `use-exam-edit-form.ts` so the selected classroom, room, instructor, and schedule are sent to `/exams`.

- **Tradeoff:** Fastest fix for new UI submissions, but it still trusts every caller to create assignment rows correctly and does not repair backend drift when `exam_section_assignments` remains empty.

### Option 2: Canonical Exam Write Assignment Sync

Send the missing frontend payload fields, then make `createExam()` and `updateExam()` create or replace `exam_section_assignments` rows transactionally and call `syncExamAssignmentSummary()` so student visibility has exact classroom rows and legacy readers still see the denormalized exam fields.

- **Tradeoff:** Touches both frontend and backend write paths, but it fixes the root data contract and aligns with the existing section-assignment service pattern.

### Option 3: Student Visibility Fallback Relaxation

Adjust `buildStudentExamVisibilityPredicate()` and the student pages to show exams from the denormalized `exams.class_group_id` row even when `exam_section_assignments` is missing.

- **Tradeoff:** Useful as defensive compatibility, but it hides the broken assignment write path and leaves `classroomIds`, assigned rooms, assigned instructors, and reporting data incomplete.

## Best Option

Choose **Option 2: Canonical Exam Write Assignment Sync**.

Why: The issue reports that the tested exam is assigned to a `class_group`, but `room_id`, `exam_assigned_sections`, `exam_section_assignments`, `scheduled_at`, and `exam_shares` are missing or empty. Source inspection shows the core exam create form currently omits `classroomId`, `classroomIds`, and `roomId` from the create payload, while the backend create/update services only write the denormalized `exams` row and legacy assigned-section rows. Option 2 fixes both sides: the UI sends the selected assignment data, and the API persists canonical `exam_section_assignments` rows in the same transaction as the exam write.

**Concrete next steps:**

1. Repair the core exam create/edit payloads so selected classroom IDs, room ID, instructor IDs, and serialized schedule fields are forwarded to `createExam()` and `updateExam()`.
2. Extend shared/service request types only where needed so `classroomIds`, `instructorId`, and `instructorIds` are represented consistently between the form schema and API payloads.
3. Add an API helper that converts resolved classroom targets into `exam_section_assignments` values with `classGroupId`, `sectionId`, `roomId`, `instructorId`, and `scheduledAt`.
4. Call that helper from `createExam()` and `updateExam()` inside the existing exam transaction, then call `syncExamAssignmentSummary()` after replacement so `exams.room_id` and legacy fields remain aligned.
5. Keep the existing student visibility predicates, but add regression tests proving newly created classroom-assigned exams are visible in `/exams`, the classroom page, and History Available.
6. Document a safe SQL backfill/check query for existing exams like `04a56241-2209-42e1-b1da-89c42535f963` when assignment rows are already missing in a deployed database.

## Phase 1: Repair Core Exam Payload Submission

**Goal:** Ensure the instructor/admin exam form sends the selected classroom, room, instructor, and schedule data that the backend needs to build canonical assignments.

- [x] Update `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.ts` so `onSubmit()` includes `classroomId: data.classroomIds?.[0]`, `classroomIds: data.classroomIds`, `roomId: data.roomId`, `instructorId: data.instructorId`, and `instructorIds: data.instructorIds` when calling `createExamMutation.mutateAsync()`.
- [x] Update `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.ts` so it does not drop valid empty optional fields into invalid values; omit undefined values and send `null` only where the API schema accepts nullable fields.
- [x] Update `app/sentinel-core/src/features/exams/config/_hooks/use-exam-edit-form.ts` so `buildEditFormValues()` initializes `classroomIds` from `exam.classroomIds` or `exam.classroomId`, initializes `roomId` from `exam.roomId`, and keeps `subjectId` as the selected exam subject.
- [x] Update `app/sentinel-core/src/features/exams/config/_hooks/use-exam-edit-form.ts` so `onSubmit()` sends `classroomId`, `sectionIds`, `roomId`, `instructorId`, `instructorIds`, `startDateTime`, and `endDateTime` instead of clearing classroom and room with `null`.
- [x] Update `packages/services/src/api/exams/types.ts` so `CreateExamPayload` and `UpdateExamPayload` include `classroomIds?: string[]`, `instructorId?: string | null`, and `instructorIds?: string[]`.
- [x] Update `packages/shared/src/schema/exams/exam-create-schema.ts` only if the form schema is missing a field that the UI already renders and the backend must receive.
- [x] Write tests in `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.test.ts` asserting create submissions include selected `classroomId`, `classroomIds`, `roomId`, `instructorId`, and `instructorIds`.
- [x] Write tests in `app/sentinel-core/src/features/exams/config/_hooks/use-exam-edit-form.test.ts` asserting edit submissions preserve existing classroom and room assignment values instead of nulling them.

**Migration required:** No — this phase changes frontend payload construction and TypeScript contracts only.

## Phase 2: Normalize Assignment Targets For Exam Writes

**Goal:** Build a backend assignment normalization helper that turns create/update payloads into the exact rows needed by `exam_section_assignments`.

- [x] Add an exported `buildExamSectionAssignmentInputs()` helper in `app/sentinel-api/src/modules/examination/exams/services/resolve-classroom-assignment.service.ts` or a new nearby service file to map `ResolvedExamAssignmentTargets`, `body.roomId`, `body.startDateTime`, `body.instructorId`, and `body.instructorIds` into assignment input rows.
- [x] Ensure `buildExamSectionAssignmentInputs()` creates one row per selected classroom/section target with `classGroupId`, `sectionId`, `roomId`, `instructorId`, and `scheduledAt`.
- [x] Ensure `buildExamSectionAssignmentInputs()` uses `body.startDateTime` for `scheduledAt` because the issue specifically reports empty `scheduled_at` values after exam creation.
- [x] Ensure `buildExamSectionAssignmentInputs()` uses `body.roomId` for each assignment row when a room is selected, because `syncExamAssignmentSummary()` can only mirror `room_id` from existing assignment rows.
- [x] Ensure `buildExamSectionAssignmentInputs()` handles `instructorIds` deterministically: pair the first instructor with all classroom rows unless a future UI supplies row-specific instructor IDs.
- [x] Add JSDoc to `buildExamSectionAssignmentInputs()` because it will be exported.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/services/resolve-classroom-assignment.service.test.ts` or a new colocated `build-exam-section-assignment-inputs.service.test.ts` covering single classroom, multiple selected sections, room propagation, schedule propagation, instructor propagation, and empty optional fields.

**Migration required:** No — this phase builds write payloads for existing columns.

## Phase 3: Persist Canonical Assignments During Create

**Goal:** Make new exams immediately populate `exam_section_assignments`, legacy assigned sections, and the denormalized `exams` summary row inside the create transaction.

- [x] Update `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts` to call the assignment normalization helper after `createExamData()` resolves the exam ID.
- [x] Update `createExam.service.ts` to insert normalized rows through `createExamSectionAssignmentsBatch()` from `app/sentinel-api/src/modules/examination/section-assignments/data/create-exam-section-assignments-batch.ts` when classroom assignment inputs exist.
- [x] Update `createExam.service.ts` to keep `replaceExamAssignedSectionsData()` for legacy section rows, but avoid depending on `exam_assigned_sections` as the canonical source for classroom-assigned exams.
- [x] Update `createExam.service.ts` to call `syncExamAssignmentSummary({ dbClient: trx, examId })` after assignment rows are inserted so `exams.class_group_id`, `section_id`, `section_name`, `room_id`, and `exam_category` reflect the primary assignment.
- [x] Update `createExam.service.ts` to recalculate room status using assignment-row room IDs when they exist, not only `body.roomId`.
- [x] Confirm `app/sentinel-api/src/modules/examination/exams/services/build-exam-write-values.service.ts` keeps writing a compatible denormalized exam row for legacy consumers.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.test.ts` asserting a create payload with classroom, room, and schedule inserts `exam_section_assignments`, syncs `exams.room_id`, and returns a detail response with `classroomIds` and `assignedRoomNames`.
- [x] Write tests in `app/sentinel-api/src/modules/examination/section-assignments/data/sync-exam-assignment-summary.test.ts` asserting the sync helper mirrors the first assignment row's classroom, section, section name, and room into `exams`.

**Migration required:** No — this phase writes existing assignment tables and existing denormalized exam columns.

## Phase 4: Persist Canonical Assignments During Update

**Goal:** Ensure editing an exam does not erase classroom/room visibility and updates assignment rows when classroom, room, instructor, or schedule values change.

- [x] Update `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts` to build normalized assignment rows when `body.classroomId`, `body.sectionIds`, `body.roomId`, `body.instructorId`, `body.instructorIds`, or `body.startDateTime` are present.
- [x] Add or reuse a data helper in `app/sentinel-api/src/modules/examination/section-assignments/data/` that replaces all `exam_section_assignments` rows for one exam before inserting the normalized replacements.
- [x] Update `update-exam.service.ts` to call `syncExamAssignmentSummary({ dbClient: trx, examId: id })` after replacing assignment rows, including when assignments are intentionally cleared.
- [x] Update `update-exam.service.ts` to preserve current assignments when no assignment-related field is included in the update payload.
- [x] Update `update-exam.service.ts` to recalculate room status for the previous room and all next assignment rooms when the room changes.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.test.ts` asserting updates replace assignment rows when classroom/room/schedule changes, preserve rows when unrelated fields change, clear summary fields when assignments are cleared, and recalculate affected rooms.
- [x] Write tests in `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.service.test.ts` if the replacement helper is exposed through the section assignment service.

**Migration required:** No — this phase updates existing rows only.

## Phase 5: Verify Student Visibility And History Available

**Goal:** Prove the repaired assignment rows make exams visible to enrolled students through the API and existing student pages.

- [x] Update `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` to cover a published exam visible by exact `exam_section_assignments.class_group_id = enrolled class_group_id`.
- [x] Update `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` to cover the regression case where `exam_section_assignments` is empty and visibility falls back only to valid legacy rules, not unrelated classrooms.
- [x] Update `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts` to assert student list SQL still includes the published gate and exact classroom assignment path.
- [x] Update `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history.ts` only if repaired assignment rows reveal a mismatch between Available exams and history status filtering.
- [x] Update `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.test.tsx` to assert classroom-scoped `useExamsQuery({ classroomId: id })` renders a published exam whose `classroomIds` includes the current classroom.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts` to assert the Available tab maps published assigned exams from `useExamsQuery()` into history cards with `availableAt` from `scheduledDate` or `publishedAt`.
- [x] Confirm `packages/services/src/api/exams/mappers.test.ts` still preserves `classroomIds`, `sectionIds`, `roomId`, and `assignedRoomNames` from API responses.

**Migration required:** No — this phase validates visibility over the repaired write model.

## Phase 6: Investigate Shares And Existing Bad Data

**Goal:** Separate student visibility from instructor sharing and provide a safe remediation path for already-created exams with missing assignment rows.

- [x] Review `app/sentinel-api/src/modules/examination/exams/services/share-exam.service.ts` and `app/sentinel-api/src/modules/examination/exams/controllers/exam-sharing.controller.ts` to confirm `exam_shares` controls instructor/staff sharing only and is not required for student classroom visibility.
- [x] Add a note to `docs/context/July/exam-not-showing-in-student.md` or the implementation execution log explaining whether blank `exam_shares` is expected for a student-assigned classroom exam.
- [x] Prepare a read-only diagnostic SQL snippet in the execution log for exam `04a56241-2209-42e1-b1da-89c42535f963` that checks `exams`, `exam_section_assignments`, `exam_assigned_sections`, `exam_shares`, `class_groups`, and `rooms`.
- [x] Prepare an optional one-time SQL backfill snippet in the execution log that inserts `exam_section_assignments` from unambiguous `exams.class_group_id`, `exams.section_id`, `exams.room_id`, and `exams.scheduled_date` values for existing bad rows.
- [x] Do not add a Prisma migration for the data backfill unless product decides this repair must run automatically in every environment.
- [x] Write or update a focused test around `app/sentinel-api/src/modules/examination/exams/services/share-exam.service.test.ts` only if investigation reveals share rows should be created by the same user action.

**Migration required:** No — this phase is investigation and optional operational data repair, not a schema change.

## Phase 7: Validation And Regression Sweep

**Goal:** Run focused tests first, then broader workspace checks once the assignment write path is fixed.

- [x] Run `pnpm --dir app/sentinel-core exec vitest run src/features/exams/config/_hooks/use-exam-create-form.test.ts src/features/exams/config/_hooks/use-exam-edit-form.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/services/create-exam.service.test.ts src/modules/examination/exams/services/update-exam.service.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/section-assignments/data/sync-exam-assignment-summary.test.ts src/modules/examination/section-assignments/section-assignments.service.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts src/modules/examination/exams/data/get-exams.test.ts --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/classroom/[id]/page.test.tsx' 'src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts' --reporter=verbose`.
- [x] Run `pnpm --dir app/sentinel-api test` after focused API tests pass.
- [x] Run `pnpm --dir app/sentinel-core test` after focused core tests pass.
- [x] Run `pnpm --dir app/sentinel-web test` after focused web tests pass.
- [x] Run `pnpm lint` after all code changes and tests pass.

**Migration required:** No — validation does not require schema changes.

## Public API / Type Changes

- No endpoint path changes are planned.
- `classroomIds`, `instructorId`, and `instructorIds` may become explicit TypeScript request fields in `packages/services/src/api/exams/types.ts`, but the backend request remains backward-compatible because these fields are optional.
- Existing response fields such as `classroomId`, `classroomIds`, `sectionIds`, `roomId`, `assignedRoomNames`, and `assignedInstructorIds` should remain backward-compatible.

## Breaking API Changes

- None expected.
- Expected behavior change: newly created or edited classroom-assigned exams should populate `exam_section_assignments` and appear to enrolled students once published.

## Environment Changes

- No new `.env` variables are required.
- Target environments must already have the existing migrations for `exam_section_assignments` and `exam_section_assignments.class_group_id` applied.

## Rollback Note

- No Prisma migration rollback is required.
- If implementation regresses assignment writes, revert the frontend payload changes and backend create/update assignment-sync changes.
- If an optional SQL data backfill is run for existing bad rows, rollback by deleting only the inserted `exam_section_assignments` rows recorded by the execution log and rerunning `syncExamAssignmentSummary()` for affected exams.

## Done Criteria

- [ ] Core exam create submissions include selected classroom, room, instructor, and schedule fields.
- [ ] Core exam edit submissions preserve existing classroom and room assignments unless the user changes them.
- [ ] `createExam()` writes `exam_section_assignments` rows with `class_group_id`, `section_id`, `room_id`, `instructor_id`, and `scheduled_at` when provided.
- [ ] `updateExam()` replaces or preserves `exam_section_assignments` rows according to assignment-related payload fields.
- [ ] `syncExamAssignmentSummary()` keeps the `exams` row aligned with the primary assignment after create, update, and delete operations.
- [ ] Published exams assigned to a student's classroom appear on the student classroom page and History Available tab.
- [ ] Blank `exam_shares` is either documented as expected for student visibility or fixed if investigation proves the share flow is also broken.
- [ ] Focused API, core, and web Vitest suites pass for the touched flows.
- [ ] No new Prisma migration is created for existing assignment columns.
