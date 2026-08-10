# Fix 003 Implementation Plan: Exam Assign Not Showing On Student Classroom

**Status:** In Progress  
**Date:** 2026-06-24  
**Type:** fix  
**Scope:** `sentinel-api`, `sentinel-web`, `sentinel-core`, `packages/hooks`, `packages/services`, `packages/shared`, `packages/db`

## Pre-Planning

- **Summary of the Task:** Ensure exams assigned through the decoupled assign-and-publish flow appear on the student classroom page by preserving exact classroom identity from the assignment writers through the backend visibility layer and student-facing queries.
- **Source Files Scanned:**
    - `docs/context/June/June 24/fix-exam-assign-not-showing.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `docs/task/2026-06-24/fix-001-implementation-plan-exam-publishing-issue.md`
    - `docs/task/2026-06-24/fix-002-implementation-plan-fix-relationship-exam-assign.md`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.ts`
    - `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.test.tsx`
    - `packages/hooks/src/query/exams/use-exams-query.ts`
    - `packages/services/src/api/exam-section-assignments.ts`
    - `packages/shared/src/schema/exams/exam-section-assignment-schema.ts`
    - `packages/db/prisma/migrations/20260624120000_add_exam_assignment_class_group_id/migration.sql`
- **Files, Services, And DB Tables Touched:**
    - `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/assign/_components/types.ts`
    - `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/_lib/normalize-student-exam.ts`
    - `app/sentinel-web/src/app/(protected)/student/_lib/student-exam-listing.ts`
    - `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts`
    - `packages/hooks/src/query/exams/use-exams-query.ts`
    - `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignments-batch-mutation.ts`
    - `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignment-mutation.ts`
    - `packages/hooks/src/query/exam-section-assignments/use-update-exam-section-assignment-mutation.ts`
    - `packages/hooks/src/query/exam-section-assignments/use-delete-exam-section-assignment-mutation.ts`
    - `packages/services/src/api/exam-section-assignments.ts`
    - `packages/shared/src/schema/exams/exam-section-assignment-schema.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/create-exam-section-assignment.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/create-exam-section-assignments-batch.ts`
    - DB tables: `exam_section_assignments`, `exam_assigned_sections`, `exams`, `class_groups`, `sections`, `enrollments`, `students`
- **Prisma Migration Needed:** No new migration is planned. The repository already contains `packages/db/prisma/migrations/20260624120000_add_exam_assignment_class_group_id/migration.sql`; implementation should verify that target environments have applied it and must not create a duplicate schema change for the same column.

## 1-3-1 Options

### Option 1: Student Page Only Patch

Update `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx` to query by `classroomId` and adjust the client-side matching logic without changing the assignment writers.

- **Tradeoff:** Fastest change, but it does not fix the underlying data handoff when an assignment source omits `classGroupId`.

### Option 2: End-To-End Classroom Assignment Parity

Align both assignment UIs, backend visibility predicates, response mapping, and student surfaces around `classGroupId` as the primary classroom link, while keeping `sectionId` fallback for legacy rows.

- **Tradeoff:** Touches more files, but it closes the real assign-to-student visibility gap and stays backward-compatible with existing data.

### Option 3: Legacy Table Mirroring

Mirror new assignment writes into `exam_assigned_sections` and keep student/classroom readers mostly unchanged.

- **Tradeoff:** Minimizes surface changes in the short term, but it duplicates state across tables and increases drift risk.

## Best Option

Choose **Option 2**.

It fits the current codebase best because the repo already has `classGroupId` support in shared contracts, API responses, and part of the instructor UI. The remaining gap is parity and end-to-end consistency: `sentinel-core` still needs to send the classroom ID, and the student classroom page should fetch classroom-scoped exams directly instead of depending on a broad client-side filter over every exam.

**Concrete next steps:**

1. Verify the existing `class_group_id` schema rollout and keep it as the canonical classroom assignment link.
2. Update `sentinel-core` assignment builders and display helpers to send and resolve `classGroupId` the same way `sentinel-web` already does.
3. Re-check the backend visibility and response-mapping path so classroom-scoped reads prefer exact classroom matches and retain section fallback only for legacy rows.
4. Tighten the student classroom page and exam query invalidation path so published assigned exams refresh into the active classroom view reliably.

## Phase 1: Verify Classroom Assignment Baseline

**Goal:** Confirm the repository already has the required schema and contract baseline so implementation can focus on parity and visibility instead of creating a duplicate migration.

- [x] Review `packages/db/prisma/migrations/20260624120000_add_exam_assignment_class_group_id/migration.sql` and `packages/db/prisma/schema.prisma` to confirm `exam_section_assignments.class_group_id` remains the canonical classroom link for decoupled exam assignments.
- [x] Review `packages/shared/src/schema/exams/exam-section-assignment-schema.ts` and `packages/services/src/api/exam-section-assignments.ts` to confirm single and batch assignment payloads already accept optional `classGroupId`.
- [x] Review `packages/db/src/generated/types.ts` and regenerate it during implementation only if the committed DB types are out of sync with the existing `class_group_id` column.
- [x] Add or update `app/sentinel-api/src/modules/examination/section-assignments/data/get-exam-section-assignments.test.ts` to prove rows with `class_group_id` round-trip correctly while legacy rows with `null` `class_group_id` still deserialize safely.
- [x] Document in the execution notes that any target environment missing `20260624120000_add_exam_assignment_class_group_id` must apply that migration before feature verification starts.
- **Migration required:** No new migration — the schema change already exists in the repo and only needs deployment verification.
  <!-- NOTE: Phase 1 verification confirmed the repo already contains the `class_group_id` migration, Prisma schema support, generated DB type support, shared Zod contract support, and service DTO support. No regeneration was needed because the committed generated types already include `class_group_id` for `exam_section_assignments`. -->
  <!-- NOTE: Phase 1 test coverage was tightened in `app/sentinel-api/src/modules/examination/section-assignments/data/get-exam-section-assignments.test.ts` to assert both `classGroupId` and `classGroupName` round-trip for exact classroom assignments while legacy rows continue to deserialize with `null` classroom fields. -->
  <!-- NOTE: Phase 1 validation passed with `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/section-assignments/data/get-exam-section-assignments.test.ts --reporter=verbose`. -->

## Phase 2: Restore Assignment Writer Parity Across Apps

**Goal:** Make every assignment UI persist the exact classroom identity instead of relying on section-only writes.

- [x] Update `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx` so every batch assignment payload includes `classGroupId: row.classroomId` alongside `sectionId`.
- [x] Review `app/sentinel-core/src/app/(protected)/exams/assign/_components/types.ts` so assignment rows continue to retain both `classroomId` and `sectionId` through the builder flow.
- [x] Update `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.tsx` so existing assignment rows resolve classroom labels by `assignment.classGroupId` first and use `sectionId` only for legacy rows.
- [x] Review `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx` to keep the admin and instructor assignment builders on the same payload shape and duplicate-detection rules.
- [x] Add or update JSDoc on exported helpers or props types in `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx` and `exam-section-assignment-list.tsx` if implementation changes their public signatures.
- [x] Add or update `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.test.tsx` to assert the batch payload includes `classGroupId`, duplicate classroom detection still works, and rendered assignments prefer the classroom ID when present.
- **Migration required:** No — this phase consumes the existing API/schema contract.
  <!-- NOTE: Phase 2 aligned `sentinel-core` with the instructor-side builder by adding deterministic row creation, typing `currentAssignments` as `ExamSectionAssignmentRecord[]`, sending `classGroupId` in the batch payload, and checking both classroom-level and legacy section-level conflicts before save. -->
  <!-- NOTE: `app/sentinel-core/src/app/(protected)/exams/assign/_components/types.ts` already preserved both `classroomId` and `sectionId`, so no source edit was required there after review. -->
  <!-- NOTE: Phase 2 updated `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.tsx` to resolve names by `assignment.classGroupId` first and fall back to `sectionId` only for legacy rows. -->
  <!-- NOTE: Phase 2 validation passed with `pnpm --dir app/sentinel-core exec vitest run 'src/app/(protected)/exams/assign/_components/exam-section-assignment-list.test.tsx' --reporter=verbose`. -->

## Phase 3: Align Backend Visibility And Response Mapping

**Goal:** Ensure published exams remain discoverable from exact classroom assignments while still supporting legacy section-only rows.

- [x] Review `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts` so student and classroom predicates prefer `exam_section_assignments.class_group_id` matches, preserve the `student_cg.archived_at is null` guard, and retain `section_id` fallback only for legacy rows.
- [x] Review `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` so classroom-scoped reads aggregate `assigned_class_group_ids` and `assigned_section_ids` consistently for both direct and assigned visibility paths.
- [x] Review `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts` so exam detail visibility does not drift from the list query when an exam is assigned through `exam_section_assignments`.
- [x] Review `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.ts` so `classroomId`, `classroomIds`, `sectionId`, and `sectionIds` remain stable for student-facing filters and do not collapse multi-assignment results.
- [x] Review `app/sentinel-api/src/modules/examination/section-assignments/data/create-exam-section-assignment.ts` and `create-exam-section-assignments-batch.ts` only if source inspection shows any write path can still persist assignments without forwarding `class_group_id`.
- [x] Add or update JSDoc on exported helpers in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts` and `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.ts` if implementation changes their exported behavior.
- [x] Add or update `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts`, `get-exams.test.ts`, and `get-exam-by-id.test.ts` to cover public and private published exams assigned by exact classroom, plus legacy section-only fallback rows.
- **Migration required:** No — the work is query and mapping alignment on top of existing schema support.
  <!-- NOTE: Phase 3 source review confirmed the current worktree already prefers `exam_section_assignments.class_group_id` for exact classroom matching, excludes archived classroom enrollments in student visibility, aggregates assigned classroom ids/names in list and detail queries, and preserves stable `classroomId`/`classroomIds` mapping for student-facing consumers. -->
  <!-- NOTE: `create-exam-section-assignment.ts` and `create-exam-section-assignments-batch.ts` already forward `class_group_id`, so no write-path source edit was required in this phase after verification. -->
  <!-- NOTE: No JSDoc edits were needed in Phase 3 because the reviewed exported helpers already described the behavior that remains in place and no exported contract changed. -->
  <!-- NOTE: Phase 3 strengthened SQL regression coverage in `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts` and `get-exam-by-id.test.ts` for classroom-scoped queries, published student visibility, exact classroom assignment aggregation, and legacy section fallback rows. -->
  <!-- NOTE: Phase 3 validation passed with `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts src/modules/examination/exams/data/get-exams.test.ts src/modules/examination/exams/data/get-exam-by-id.test.ts --reporter=verbose`. -->

## Phase 4: Make Student Surfaces Classroom-Aware By Query

**Goal:** Fetch and render exams for the active classroom directly, while keeping history and active-status behavior consistent.

- [x] Update `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx` to call `useExamsQuery({ classroomId: id }, ...)` instead of fetching the full exam list and relying only on broad client-side filtering.
- [x] Review `app/sentinel-web/src/app/(protected)/student/_lib/normalize-student-exam.ts` and `student-exam-listing.ts` so `available`, `upcoming`, and `in-progress` statuses remain aligned between the classroom page and the student history surface.
- [x] Review `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts` so the Available tab keeps showing the same classroom-assigned published exams after the classroom-page fetch is narrowed.
- [x] Review `packages/hooks/src/query/exams/use-exams-query.ts` and `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignments-batch-mutation.ts` so assignment or publish actions invalidate both classroom-scoped and unscoped exam query keys.
- [x] Keep the client-side fallback matcher in `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx` only for legacy subject-linked rows that still have no explicit classroom or section assignment; exact `classroomId` matches must remain higher priority.
- [x] Add or update `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.test.tsx` and `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts` to assert assigned published exams show on the classroom page and the Available history tab after assignment and publish.
- **Migration required:** No — this phase adjusts query usage, cache invalidation, and UI filtering only.
  <!-- NOTE: Phase 4 updated `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx` to request classroom-scoped exams via `useExamsQuery({ classroomId: id }, ...)` while keeping the existing exact-classroom, section, and legacy subject fallback matcher order intact on the client. -->
  <!-- NOTE: Source review confirmed `normalize-student-exam.ts`, `student-exam-listing.ts`, and `use-student-history/index.ts` already normalize raw published exams into `available`/`upcoming`/`in-progress` states consistently for student-facing surfaces, so no source edits were required there. -->
  <!-- NOTE: Source review confirmed the assignment mutation hooks already invalidate `EXAM_QUERY_KEYS.all`, which is the shared query-key prefix used by both unscoped and classroom-scoped `useExamsQuery(...)` calls, so no hook source edit was required in this phase. -->
  <!-- NOTE: Phase 4 strengthened `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.test.tsx` and `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts` to assert classroom-scoped fetching and assign-first published exam visibility after student status normalization. -->
  <!-- NOTE: Phase 4 validation passed with `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/classroom/[id]/page.test.tsx' 'src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts' --reporter=verbose`. -->

## Phase 5: Regression Validation And Legacy Data Guidance

**Goal:** Prove the repaired flow works for both creator apps and document how to handle old ambiguous assignment rows.

- [ ] Run focused API coverage for `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts`, `get-exams.test.ts`, `get-exam-by-id.test.ts`, and `app/sentinel-api/src/modules/examination/section-assignments/data/get-exam-section-assignments.test.ts`.
- [ ] Run focused UI coverage for `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.test.tsx`, `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts`, and `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.test.tsx`.
- [ ] Manually validate the assign-then-publish and publish-then-assign flows for both public and private exams created from `sentinel-web` and `sentinel-core`.
- [ ] Document data-repair guidance for legacy `exam_section_assignments` rows that still have `section_id` but no `class_group_id`: keep them readable through fallback, but recreate or backfill them only when the classroom target is unambiguous.
- [ ] Record the final verification commands and outcomes in the execution log that will accompany implementation work for this fix.
- **Migration required:** No — validation and operational guidance only.
  <!-- NOTE: Follow-up debugging against the live assigned exam revealed that `exam_section_assignments` rows were correct, but the denormalized `exams` row stayed null for `class_group_id`, `section_id`, `section_name`, and `room_id`. To keep legacy consumers and direct exam-row readers aligned, Phase 5 implementation now syncs the representative assignment back onto `exams` after assignment create, batch create, update, and delete operations. -->
  <!-- NOTE: Additional regression coverage was added in `app/sentinel-api/src/modules/examination/section-assignments/data/sync-exam-assignment-summary.test.ts` and `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.service.test.ts`, and the focused API validation passed with `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/section-assignments/data/create-exam-section-assignments-batch.test.ts src/modules/examination/section-assignments/data/get-exam-section-assignments.test.ts src/modules/examination/section-assignments/data/sync-exam-assignment-summary.test.ts src/modules/examination/section-assignments/section-assignments.service.test.ts --reporter=verbose` plus `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/exams/data/get-exams.test.ts src/modules/examination/exams/data/get-exam-by-id.test.ts --reporter=verbose`. -->

## Public API / Type Changes

- No endpoint path changes are planned.
- `classGroupId` remains additive and nullable; no new request fields are required unless source inspection uncovers an unmodeled parity gap.
- Existing student exam response fields such as `classroomId`, `classroomIds`, `sectionId`, and `sectionIds` should remain backward-compatible.

## Done Criteria

- [ ] `sentinel-web` and `sentinel-core` both send exact classroom IDs when assigning exams.
- [ ] Student classroom queries fetch classroom-scoped exams and show assigned published exams in active states.
- [ ] Public and private assigned exams appear for enrolled students and remain hidden from students in other classrooms.
- [ ] Legacy section-only assignment rows continue to resolve through fallback without breaking student feeds.
- [ ] Focused API and web/core Vitest coverage passes for the touched flows.
- [ ] No duplicate Prisma migration is created, and existing schema rollout expectations are documented clearly.

## Additional Considerations

- **Breaking API Changes:** None planned. The work should remain additive and backward-compatible.
- **Environment Variables:** No new `.env` variables are expected.
- **Rollback Note:** Roll back the code changes first. Do not remove `class_group_id` support unless the existing migration is intentionally reverted from the environment and all dependent reads are restored to legacy section-only behavior.
