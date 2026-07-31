# Exam Instructor Assignment Dialog UX Implementation Plan

**Task summary:** Redesign the exam assignment dialog in `sentinel-core` and `sentinel-web` so a user can select an instructor once, apply that instructor across classroom rows, complete every required classroom/room/instructor assignment with clear feedback, and save the batch confidently.

## 1. Context

The two apps currently maintain near-duplicate assignment builders, but their controls and responsive behavior have already diverged. The dialog makes room and instructor appear optional, permits saving rows without either value, repeats instructor search for every row, and disables submission without explaining which required value is missing; the batch API also accepts those incomplete payloads.

## 3. Viable Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Update labels, placeholders, layout, and `isValid` checks independently in both existing builders; require room and instructor before the current batch mutation runs.
- **Tradeoff:** Delivers quickly, but duplicates the same validation and bulk-selection behavior in two files and leaves future UX drift likely.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add shared batch-assignment contracts and a tested state helper/hook for required-field validation, bulk instructor application, row inheritance, and payload creation; keep thin app-specific dialog views so each app can preserve its classroom selector and routing conventions.
- **Tradeoff:** Touches shared, service, API, and frontend workspaces and requires coordinated rollout because incomplete batch requests will begin returning validation errors.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Replace the row editor with a multi-step wizard: select an instructor, choose multiple classrooms, then map rooms on a review screen before saving.
- **Tradeoff:** Reduces visual density but adds navigation, intermediate state, and extra steps for users who only need one assignment or different instructors per classroom.

## 1. Chosen Execution Path

**Recommendation:** Option B — the Strategic Path.

**Justification:** A shared behavior layer solves the current cross-app drift without placing exam-domain data fetching inside `@sentinel/ui`. A batch-level instructor control removes the most repetitive interaction, while visible per-row overrides preserve the existing multi-proctor use case; server-side batch validation ensures the new “all fields are required” promise is not only cosmetic.

### Interaction Contract

- Rename the dialog to **“Assign instructors and classrooms”** and include the selected exam title in its context line.
- State once near the header that all fields are required; use plain labels **“Classroom,” “Room,” and “Instructor”** with no parenthetical “Required” or “Optional” text.
- Add a top-level **“Apply instructor to all”** searchable combobox. Selecting a value fills every current row and becomes the default for newly added rows.
- Retain the instructor combobox in each row as an explicit override for classrooms that need a different proctor.
- Number rows as **“Assignment 1,” “Assignment 2,”** and so on; use action-oriented placeholders (`Select classroom`, `Select room`, `Select instructor`) and remove `No room`/`No instructor` choices from the create flow.
- Keep **“Add another classroom”** available; a new row inherits the bulk instructor, reducing repeated input.
- Keep the primary button enabled whenever the form is not saving. On submission, show inline errors for every missing value, focus the first invalid control, and keep duplicate/existing-assignment warnings at the top of the row list.
- Show a compact readiness summary in the sticky footer (for example, `2 of 3 assignments ready`) and use **“Save assignments”** with an inline spinner during the mutation.
- Preserve the entered rows after an API error. Reset them only after a successful save or after the user deliberately closes/cancels the dialog.
- On mobile, stack row fields and keep the footer actions reachable; on desktop, give classroom the widest column and align room, instructor, and the labeled remove action.

## Pre-Planning Checklist

- [x] Read and summarized the requested UX change in one sentence.
- [x] Inspected the current dialog, builder, instructor selector, assignment list, shared schemas, service client, mutation hook, and batch API path.
- [x] Identified the affected source files, tests, API contract, and `exam_section_assignments` table.
- [x] Determined that a Prisma migration is not required: existing nullable columns must remain nullable for historical records and `ON DELETE SET NULL` foreign-key behavior, while the create-batch request can require values at the validation boundary.

## Scope and Affected Files

### Shared contracts and behavior

- `packages/shared/src/schema/exams/exam-section-assignment-schema.ts`
- `packages/shared/src/schema/exams/exam-section-assignment-schema.test.ts` **[NEW]**
- `packages/hooks/src/query/exam-section-assignments/use-exam-assignment-builder.ts` **[NEW]**
- `packages/hooks/src/query/exam-section-assignments/use-exam-assignment-builder.test.ts` **[NEW]**
- `packages/hooks/src/query/exam-section-assignments/index.ts`

### Service and API boundary

- `packages/services/src/api/exam-section-assignments.ts`
- `packages/services/src/api/exam-section-assignments.test.ts`
- `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignments-batch-mutation.ts`
- `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignments-batch-mutation.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.dto.ts`
- `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.dto.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.service.test.ts`

### `sentinel-core`

- `app/sentinel-core/src/app/(protected)/exams/assign/_components/assignment-content.tsx`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/add-exam-section-assignment-dialog.tsx`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/row-instructor-combobox.tsx`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/row-classroom-combobox.tsx`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/types.ts`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.test.tsx` **[NEW]**
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/row-instructor-combobox.test.tsx` **[NEW]**
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.test.tsx`

### `sentinel-web`

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/assignment-content.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/add-exam-section-assignment-dialog.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-instructor-combobox.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-classroom-combobox.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/types.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.test.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-instructor-combobox.test.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/exam-section-assignment-list.test.tsx`

### Data model

- `packages/db/prisma/schema.prisma` — inspect only; do not change `exam_section_assignments.room_id` or `instructor_id` nullability.
- Table read/written: `exam_section_assignments`.
- Referenced tables: `rooms`, `users`/`user_profiles`, `class_groups`, and `sections`.

## Phase 1: Define Required Batch Contracts and Shared Form State

**Goal:** Establish one tested definition of a complete assignment row and one source of truth for row operations used by both apps.

- [ ] In `packages/shared/src/schema/exams/exam-section-assignment-schema.ts`, keep `createExamSectionAssignmentBodySchema` and update payloads backward-compatible, but change `createExamSectionAssignmentBatchBodySchema` to validate at least one assignment whose `classGroupId`, `roomId`, and `instructorId` are non-null UUIDs; add user-facing messages for an empty batch and each missing field.
- [ ] In `packages/hooks/src/query/exam-section-assignments/use-exam-assignment-builder.ts`, export documented `AssignmentRow`, `AssignmentRowErrors`, and `useExamAssignmentBuilder()` APIs that own stable row IDs, add/remove/update operations, bulk instructor application, new-row instructor inheritance, duplicate/current-assignment conflict detection, readiness counts, submit-attempt state, and first-invalid-field metadata.
- [ ] In the same hook, expose a payload builder that only returns a batch payload when every row has a classroom-derived section, classroom, room, and instructor; do not silently omit required keys or convert the `none` UI sentinel into `null`.
- [ ] Update `packages/hooks/src/query/exam-section-assignments/index.ts` to export the hook and its public types, with JSDoc on every exported function and type-facing helper.
- [ ] Add `packages/shared/src/schema/exams/exam-section-assignment-schema.test.ts` covering empty batches, missing/null classroom, room, or instructor IDs, valid complete rows, and continued acceptance of nullable historical response records.
- [ ] Add `packages/hooks/src/query/exam-section-assignments/use-exam-assignment-builder.test.ts` covering bulk apply, per-row override, inheritance by a new row, removal, duplicate/existing conflicts, readiness counts, payload creation, preserved state after failure, and first-invalid-field selection.

**Migration required:** No — required values are enforced for new batch requests while nullable database columns remain necessary for historical rows and deleted room/instructor relations.

## Phase 2: Enforce the Batch API Boundary

**Goal:** Ensure clients cannot create incomplete assignment batches even if frontend validation is bypassed.

- [ ] In `packages/services/src/api/exam-section-assignments.ts`, add a dedicated `CreateExamSectionAssignmentBatchItemPayload` with required `sectionId`, `classGroupId`, `roomId`, and `instructorId`; use it in `createExamSectionAssignmentsBatch()` while retaining the permissive single-create/update types for existing callers.
- [ ] In `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignments-batch-mutation.ts`, replace the generic single-create payload array with the required batch payload type and preserve invalidation of the selected exam’s section assignments plus the exam list.
- [ ] In `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.dto.ts`, reference the shared batch schema directly instead of reconstructing it from the permissive single-create schema shape, so OpenAPI and runtime validation agree.
- [ ] In `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.service.test.ts`, update batch fixtures to include room and instructor and verify the complete validated body is passed unchanged to `createExamSectionAssignmentsBatch()` and summary sync still occurs.
- [ ] Extend `packages/services/src/api/exam-section-assignments.test.ts` to assert a complete batch body is serialized and sent to `/exams/:examId/section-assignments/batch`.
- [ ] Add `packages/hooks/src/query/exam-section-assignments/use-create-exam-section-assignments-batch-mutation.test.ts` to verify required payload forwarding, success invalidations, and error callback behavior.
- [ ] Add `app/sentinel-api/src/modules/examination/section-assignments/section-assignments.dto.test.ts` to parse a complete batch and reject absent/null classroom, room, instructor, and zero-row requests before the service is called.

**Migration required:** No — this is an intentional request-contract hardening for `POST /exams/:examId/section-assignments/batch`, not a schema-nullability change.

## Phase 3: Redesign the `sentinel-core` Dialog

**Goal:** Give administrators a fast, accessible bulk-instructor flow with actionable validation and resilient form state.

- [ ] In `app/sentinel-core/src/app/(protected)/exams/assign/_components/assignment-content.tsx`, pass `selectedExam.title` to `AddExamSectionAssignmentDialog` so the user can verify which exam is being changed.
- [ ] In `app/sentinel-core/src/app/(protected)/exams/assign/_components/add-exam-section-assignment-dialog.tsx`, add the `examTitle` prop; render the new title/context copy; use a constrained body with a sticky action footer; and prevent accidental outside-click/Escape closure while saving.
- [ ] In `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx`, replace local row/validation/payload logic with `useExamAssignmentBuilder()` and render the top-level “Apply instructor to all” selector, numbered assignment cards, readiness summary, and plain field labels with no parenthetical qualifiers.
- [ ] In the same builder, remove `No room` and `No instructor` options; use selection placeholders; show row-level error text and `aria-invalid`/`aria-describedby` after a submit attempt; focus the first invalid field; keep duplicate/current-assignment alerts; and submit a payload containing every required ID.
- [ ] In `app/sentinel-core/src/app/(protected)/exams/assign/_components/row-instructor-combobox.tsx`, support a configurable placeholder, required/error accessibility props, stable selected-name display, a server-search loading state, and selection without a clear-to-`none` path in this create flow.
- [ ] In `app/sentinel-core/src/app/(protected)/exams/assign/_components/row-classroom-combobox.tsx`, accept required/error accessibility props and forward a control ref or focus callback needed by first-invalid-field focus management.
- [ ] In `app/sentinel-core/src/app/(protected)/exams/assign/_components/types.ts`, remove the app-local row type after consumers use the exported shared hook type.
- [ ] Add `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.test.tsx` covering labels/copy, bulk instructor application, per-row override, inherited instructor on add, all required error messages, focus of the first invalid control, duplicate/existing conflicts, readiness summary, complete batch submission, retained values after rejection, and pending-state controls.
- [ ] Add `app/sentinel-core/src/app/(protected)/exams/assign/_components/row-instructor-combobox.test.tsx` covering name/email rendering, local and debounced server search results, keyboard selection, loading/empty states, required ARIA wiring, and the absence of a “No instructor” option.
- [ ] Trim builder-specific assertions from `app/sentinel-core/src/app/(protected)/exams/assign/_components/exam-section-assignment-list.test.tsx`, leaving assignment-list rendering/removal coverage in that file.

**Migration required:** No — frontend presentation and form-state changes only.

## Phase 4: Bring `sentinel-web` to Feature Parity

**Goal:** Deliver the same streamlined interaction to instructors without changing instructor-app routing or classroom-query scope.

- [ ] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/assignment-content.tsx`, pass `selectedExam.title` into the dialog while preserving institution-scoped exam retrieval and instructor assign routes.
- [ ] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/add-exam-section-assignment-dialog.tsx`, implement the same title, context, dialog-close guard, scroll body, and sticky footer contract as `sentinel-core`.
- [ ] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`, consume `useExamAssignmentBuilder()` and match the bulk selector, numbered rows, required labels/placeholders, inline errors, first-invalid focus, readiness summary, responsive layout, complete payload, success reset, and failure preservation behavior from `sentinel-core`.
- [ ] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-classroom-combobox.tsx` by adapting the core app’s searchable picker, then use it in the builder while preserving the web app’s subject-scoped `useClassroomsQuery()` results and current instructor/institution scope.
- [ ] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-instructor-combobox.tsx`, apply the same required/error, search, keyboard, and no-clear behavior as the core component.
- [ ] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/types.ts`, remove the app-local row type after the shared hook type is adopted.
- [ ] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.test.tsx` with the same behavioral contract as core plus an assertion that classrooms remain restricted to the selected exam subject.
- [ ] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-instructor-combobox.test.tsx` with parity coverage for search, keyboard behavior, required ARIA wiring, loading/empty states, and removal of “No instructor.”
- [ ] Trim builder-specific assertions from `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/exam-section-assignment-list.test.tsx`, leaving list rendering/removal and subject-context coverage.

**Migration required:** No — frontend presentation and form-state changes only.

## Phase 5: Cross-App Verification and Rollout

**Goal:** Prove contract compatibility, UX parity, accessibility, and responsive behavior before release.

- [ ] Run `pnpm --dir packages/shared test`, `pnpm --dir packages/hooks test`, `pnpm --dir packages/services test`, and `pnpm --dir app/sentinel-api test` to validate schema, state, client, hook, DTO, and service behavior.
- [ ] Run `pnpm --dir app/sentinel-core test` and `pnpm --dir app/sentinel-web test` to validate both dialog implementations.
- [ ] Run `pnpm lint` and `pnpm format:check`; fix only issues introduced by this feature.
- [ ] Run targeted builds for `sentinel-core`, `sentinel-web`, and `sentinel-api` (or `pnpm build` if the targeted scripts are unavailable) to catch cross-workspace type-contract errors.
- [ ] Manually verify in light and dark themes at mobile, tablet, and desktop widths: one-row save; multi-row bulk instructor; per-row instructor override; new-row inheritance; duplicate classroom; classroom already assigned; missing classroom/room/instructor; keyboard-only combobox navigation; loading/empty queries; failed request retry; cancel/reopen reset; and successful save/close.
- [ ] Add a temporary API compatibility check in the release checklist to identify any external callers of `POST /exams/:examId/section-assignments/batch`; update those callers to send required room and instructor IDs before deploying the stricter DTO.
- [ ] Confirm the existing assignment list still renders historical rows with null room or instructor as a legacy fallback; do not expose null choices in the redesigned create dialog.

**Migration required:** No — verification and coordinated contract rollout only.

## Acceptance Criteria

- [ ] Both apps display the same “Assign instructors and classrooms” flow and selected-exam context.
- [ ] No create-dialog label or option describes classroom, room, or instructor as optional; all three are required for every new row.
- [ ] A user can choose one instructor once, apply it to all current rows, add rows that inherit it, and override an individual row.
- [ ] Save attempts identify every incomplete row, focus the first invalid control, and never send a partial assignment payload.
- [ ] Duplicate classrooms and classrooms already assigned to the exam remain blocked with specific messages.
- [ ] Mutation errors preserve the user’s entered values, while successful saves reset state, refresh assignments/exams, show success feedback, and close the dialog.
- [ ] The batch endpoint rejects empty or incomplete rows, and its OpenAPI schema matches runtime validation and TypeScript client types.
- [ ] Historical assignments with a missing/deleted room or instructor continue to render without a database migration.
- [ ] Keyboard navigation, focus order, screen-reader labels, error relationships, pending state, responsive layouts, and dark mode pass manual review in both apps.
- [ ] All focused tests, lint checks, formatting checks, and builds pass.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API behavior:** Yes. `POST /exams/:examId/section-assignments/batch` will reject rows without `classGroupId`, `roomId`, or `instructorId`. Single-create and update schemas remain permissive to avoid expanding the change beyond the two dialogs.
- **Database migration:** No. Do not make `room_id` or `instructor_id` non-null because existing rows may be incomplete and both foreign keys use deletion behavior that can produce null references.
- **Environment variables:** None.
- **New dependencies:** None; use the existing combobox, select, dialog, TanStack Query, Vitest, and Testing Library stack.
- **Rollback:** Revert the shared batch-schema/type hardening and both frontend dialog changes together. Since no schema migration or data rewrite occurs, rollback requires no database action and historical assignments remain intact.
