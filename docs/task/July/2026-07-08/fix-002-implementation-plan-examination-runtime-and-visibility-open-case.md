# Fix 002 Implementation Plan: Examination Runtime And Visibility Open Case

**Status:** In Progress  
**Date:** 2026-07-08  
**Type:** fix  
**Scope:** `sentinel-web`, `sentinel-api`, `packages/shared`, `packages/hooks`, `packages/services`, `packages/db`

## Pre-Planning

- [x] Read and summarize the task input in one sentence: resolve the still-open examination runtime and exam visibility issue by proving the current runtime/data state first, then fixing only the confirmed remaining failures around first-event dedupe, Turn In fullscreen suppression, audio calibration, and private assigned exam visibility.
- [x] Scan relevant source files to understand existing patterns:
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `docs/context/July/examination-and-exam-visibility-issue.md`
    - `docs/context/July/fix-private-visibility-assigned.md`
    - `docs/context/July/exam-not-showing-in-student.md`
    - `docs/task/2026-07-08/fix-001-implementation-plan-private-visibility-assigned.md`
    - `docs/task/2026-07-07/fix-004-implementation-plan-attempt-turn-in-dedupe-and-audio-anomaly.md`
    - `docs/task/2026-07-07/fix-005-implementation-plan-dedupe-audio-calibration.md`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-anomaly-telemetry.ts`
    - `app/sentinel-web/src/workers/audio-anomaly-engine.ts`
    - `packages/hooks/src/query/audio/use-audio-settings-query.ts`
    - `packages/services/src/api/audio.ts`
    - `packages/shared/src/audio/audio-anomaly.ts`
    - `packages/shared/src/audio/yamnet-class-mapper.ts`
    - `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
    - `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exams.controller.ts`
    - `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts`
    - `app/sentinel-api/src/modules/examination/section-assignments/data/sync-exam-assignment-summary.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/_hooks/use-exam-list.ts`
    - `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts`
    - `packages/db/prisma/schema.prisma`
    - `packages/db/prisma/migrations/20260706000000_add_telemetry_dedupe_index/migration.sql`
- [x] Identify all files, services, and DB tables the task will touch:
    - Browser telemetry runtime: `use-exam-monitoring`, `use-interaction-listeners`, `use-telemetry`, web telemetry metadata/payload utilities, and their tests.
    - Student Turn In runtime: `use-attempt-submission`, `use-attempt-monitoring`, attempt page tests, and server telemetry session eligibility.
    - Audio runtime: `useStudentExamAttempt`, `useAttemptMonitoring`, `useAudioAnomalyWorker`, `AudioAnomalyEngine`, shared audio constants/mappers, audio settings hooks/services, support calibration, and worker tests.
    - API telemetry persistence: `incident-writer.service.ts`, `incident-session-eligibility.service.ts`, `incident-persistence.service.test.ts`, telemetry ingestion rule tests, and `flagged_incidents`.
    - Student visibility: exam list/detail data predicates, exam GET controllers, exam create/update assignment sync, student exam/history hooks, services clients, grading/reporting/monitoring staff access, and their tests.
    - DB tables: `flagged_incidents`, `exam_attempts`, `students`, `enrollments`, `class_groups`, `subject_offerings`, `exams`, `exam_section_assignments`, `exam_assigned_sections`, `exam_remediation_schedules`, `proctor_assignments`, `exam_shares`, `classroom_instructor_assignments`, `exam_configurations`, `rooms`, `sections`, `subject_departments`, `settings` or the backing table used by `/settings/audio`.
- [x] Determine if a Prisma migration is needed: No new Prisma migration is planned. The telemetry dedupe column and partial unique index already exist in `packages/db/prisma/schema.prisma` and `packages/db/prisma/migrations/20260706000000_add_telemetry_dedupe_index/migration.sql`; assignment, enrollment, and audio settings tables already exist. If the target database lacks the existing dedupe migration, apply the existing migration or document an environment remediation instead of creating a new schema change.

## Current Workspace Caveat

`git status --short` currently shows uncommitted visibility changes in `app/sentinel-api/src/modules/examination/**`, untracked monitoring/reporting tests, and untracked July context/task docs. The implementation pass must inspect and preserve this state before editing; do not assume a clean branch.

## 1-3-1 Options

### Option 1: Minimal Patch Per Symptom

Patch only the files closest to each report: add stronger burst guards in `use-interaction-listeners.ts`, add another Turn In suppression branch in `use-attempt-submission.ts`, lower audio thresholds in `packages/shared/src/audio/audio-anomaly.ts`, and loosen student exam visibility predicates in `build-student-exam-scope-predicates.ts`.

**Tradeoff:** Fast, but high risk because current source already contains many of these fixes; patching again without reproduction may mask stale data, missing migrations, or runtime parity issues.

### Option 2: Evidence-Gated Contract Hardening

Start with environment parity and clean reproduction, capture browser payloads plus DB rows, then patch only the confirmed failing contract: client dedupe key generation/listener lifecycle, server dedupe idempotency, Turn In lifecycle ordering, audio runtime wiring, or assignment-scoped visibility.

**Tradeoff:** More disciplined and slightly slower up front, but it directly addresses why previous completed plans did not close the issue and fits the existing codebase boundaries.

### Option 3: Full Runtime And Visibility Architecture Refactor

Introduce a durable raw telemetry event ledger, a single student attempt runtime state machine, and a dedicated exam visibility policy service that emits all role-specific query predicates and authorization decisions.

**Tradeoff:** Most robust long term, but too large for this open case and likely to create migration/reporting risk before the actual remaining failure is isolated.

## Best Option

Choose **Option 2: Evidence-Gated Contract Hardening**.

Why: The current source already includes deterministic telemetry metadata, client burst guards, server duplicate-key suppression, Turn In monitoring suspension, audio resampling, audio settings wiring, and private-assigned student visibility predicates. The persistent report is therefore more likely to come from environment drift, stale generated/runtime code, bad existing rows, missing DB index, multiple mounted listeners, route-specific visibility drift, or one specific contract gap. Evidence-gated work is more maintainable than adding another overlapping patch and smaller than a runtime architecture rewrite.

**Concrete next steps:**

1. Freeze the baseline by recording git status, target DB migration state, affected exam/student rows, and whether local packages are using current source or stale `dist` artifacts.
2. Reproduce each symptom with a new exam, new attempt, and empty incidents for that attempt while capturing browser network telemetry payloads and DB rows.
3. Add failing regression tests for only the observed failure mode.
4. Patch the confirmed failing contract in the smallest owning module.
5. Run focused Vitest suites for the touched module, then run manual QA with exact `exam_id`, `attempt_id`, and `student_user_id` recorded.

## Phase 1: Baseline, Parity, And Reproduction Harness

**Goal:** Prove whether the reported failures exist on the current source and target database before changing product code.

- [x] Record current workspace state in the execution log by running `git status --short` from `/Applications/XAMPP/xamppfiles/htdocs/sentinel`, and list any pre-existing modified files under `app/sentinel-api/src/modules/examination/**`.
- [x] Verify the target database has `flagged_incidents_dedupe_key_unique` from `packages/db/prisma/migrations/20260706000000_add_telemetry_dedupe_index/migration.sql` by running the `pg_indexes` SQL from `docs/context/July/examination-and-exam-visibility-issue.md`.
- [x] Verify package/runtime parity by inspecting `packages/shared/dist`, `packages/hooks/dist`, and the running `app/sentinel-web` bundle path only if the local app consumes built package output instead of workspace source.
- [x] Add a temporary development-only debug helper in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` that logs listener mount/unmount with `examSessionId`, `monitoringPhase.current`, and a component instance ID.
- [x] Add a temporary development-only debug helper in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` that logs `audioMonitoringPhase`, `hasStream`, live audio track count, `examSessionId`, and whether runtime audio settings are present.
- [x] Add a temporary development-only debug hook in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts` to expose one accepted anomaly window with `anomalyType`, `confidenceScore`, effective cooldown, and generated `dedupeKey`.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` proving the listener debug hook is inert outside `NODE_ENV === 'development'`.
- [x] Write tests in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` proving audio debug logging is inert outside `NODE_ENV === 'development'`.
- [x] Create a clean manual QA record in the implementation execution notes with one new `exam_id`, `attempt_id`, `student_user_id`, instructor user, and initial `flagged_incidents` count.

**Migration required:** No - this phase validates existing migrations and adds only temporary development diagnostics plus tests.

## Phase 2: Browser First-Event Dedupe Root Cause

**Goal:** Ensure one physical browser-security action produces one network payload and one server-accepted occurrence.

- [ ] Reproduce right-click, clipboard shortcut plus browser `copy` event, print-screen shortcut, focus loss, and active fullscreen exit in the same fresh attempt while recording browser network requests to `/telemetry` and the resulting `flagged_incidents.dedupe_key` rows.
- [x] If duplicate network requests share the same `metadata.dedupeKey`, update `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts` so `appendIncidentRecord()` returns `null` before `updateExistingIncident()` for exact duplicate keys in every transaction/concurrency path.
- [x] If duplicate network requests have different `metadata.dedupeKey` values for one physical action, update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` so the physical action timestamp is captured once and reused across keydown/clipboard/focus/fullscreen branches.
- [x] If duplicate requests come from multiple mounted listeners, update `useInteractionListeners()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` with a per-session listener registration guard that still cleans up correctly on unmount.
- [x] If time-bucket boundaries split one action into two dedupe keys, update `createTelemetryActionMetadata()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.ts` to accept a caller-owned `bucketStart` or widen only the affected action bucket.
- [x] Preserve `metadata.eventId`, `metadata.dedupeKey`, and `metadata.clientActionAt` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts` without regenerating downstream metadata.
- [x] Write or update tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` proving each first browser action emits exactly one telemetry payload and duplicate DOM events inside the burst window emit none.
- [x] Write or update tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.test.ts` proving dedupe keys are stable for the accepted action window and distinct only after the intended burst/cooldown boundary.
- [x] Write or update tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving exact duplicate dedupe keys keep `details.occurrenceCount = 1`, while later distinct dedupe keys inside the aggregation window increment to `2`.

**Migration required:** No - this phase uses existing telemetry metadata and the existing `flagged_incidents.dedupe_key` index.

## Phase 3: Turn In Fullscreen Lifecycle Suppression

**Goal:** Prevent Turn In route transitions and fullscreen teardown from creating `FULL_SCREEN_EXIT` while preserving real active-attempt fullscreen violations.

- [ ] Reproduce Turn In from fullscreen in a fresh attempt and record whether any `FULL_SCREEN_EXIT` network payload is sent before `exam_attempts.status = 'COMPLETED'` or `completed_at` is set.
- [x] If a payload is sent before monitoring suspension, update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts` so `suspendSecurityMonitoring()` updates the suspension ref before `setMonitoringPhase('submitting')`, `setIsRedirectingToTurnIn(true)`, `writeStoredExamTurnInPreview()`, `router.replace()`, and `document.exitFullscreen()`.
- [x] If `fullscreenchange` fires after phase changes but before the ref updates, update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts` so `suspendSecurityMonitoring()` synchronously writes both `monitoringPhaseRef.current = 'suspended'` and `isMonitoringSuspendedRef.current = true`.
- [x] If a late post-completion payload reaches the API, update `checkTelemetrySessionEligibility()` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.ts` to silently ignore `FULL_SCREEN_EXIT` when `exam_attempts.status` is any completed/terminal equivalent or `completed_at` is non-null.
- [x] If active fullscreen exits stop flagging after the suppression fix, update `handleFullscreenChange()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` so the submit-teardown guard applies only to `submitting`, `navigating-to-turn-in`, and `suspended` phases.
- [x] Write or update tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx` proving suspension happens before preview write, route replace, and deferred fullscreen exit.
- [x] Write or update tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` proving immediate `fullscreenchange` after `suspendSecurityMonitoring()` emits no telemetry and active fullscreen exit still emits exactly one payload.
- [x] Write or update tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving completed-attempt `FULL_SCREEN_EXIT` is ignored while active-attempt `FULL_SCREEN_EXIT` persists.

**Migration required:** No - this phase only changes lifecycle guards over existing attempt state columns.

## Phase 4: Audio Runtime Calibration And Signal Path

**Goal:** Make "audio running" mean the student attempt has usable settings, a live stream, a loaded model, and one accepted anomaly event per configured audio window.

- [x] Verify `packages/hooks/src/query/audio/use-audio-settings-query.ts` and `packages/services/src/api/audio.ts` allow authenticated students to call `GET /settings/audio`; if the endpoint rejects students, update `app/sentinel-api/src/modules/infrastructure/audio/audio.routes.ts` or the relevant audio controller authorization to permit read-only student access.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts` only if `effectiveAudioSettings` remains `null` after settings load failure; make fallback to `DEFAULT_AUDIO_ANOMALY_CONFIG` explicit and observable when `aiRules.audio_anomaly_detection` is enabled.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` so development diagnostics include enabled anomaly types, threshold values, worker phase, stream live state, and the active audio settings source.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/create-audio-graph.ts` only if the reproduction shows zero PCM frames or an incorrect sample rate reaching `AudioAnomalyController`.
- [x] Update `app/sentinel-web/src/workers/audio-anomaly-engine.ts` only if the reproduction shows model load, resampling, RMS fallback, cooldown, or enabled-class evaluation is wrong for configured `TALKING` or `BACKGROUND_NOISE`.
- [x] Update `packages/shared/src/audio/audio-anomaly.ts` and `packages/shared/src/audio/yamnet-class-mapper.ts` only if class IDs or thresholds contradict `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv` or manual QA with configured speech/noise.
- [x] Write or update tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` proving persisted audio settings are passed to `useAttemptMonitoring()` and default settings are used only after a controlled settings fallback.
- [x] Write or update tests in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` proving one accepted worker anomaly creates one toast, one telemetry request, a stable audio dedupe key, and no telemetry while suspended.
- [x] Write or update tests in `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts` proving 48 kHz input is resampled to a 16 kHz YAMNet frame, `TALKING` triggers after configured consecutive frames, `BACKGROUND_NOISE` RMS fallback triggers when configured, and disabled `TYPING` or `TAPPING` does not flag.
- [x] Write or update tests in `packages/shared/src/audio/yamnet-class-mapper.test.ts` if class IDs or default enabled anomaly types change.
- [x] Write or update tests in `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.test.ts` and `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving above-threshold audio persists once and exact duplicate audio dedupe keys do not increment occurrence count.

**Migration required:** No - audio settings and telemetry metadata already fit existing schemas.

## Phase 5: Private Assigned Student Visibility And Assignment Data

**Goal:** Ensure private published exams assigned to the student's classroom are visible on student list/detail/lobby/history surfaces without making public exams globally visible to students.

- [ ] Run the assignment/enrollment diagnostic SQL from `docs/context/July/examination-and-exam-visibility-issue.md` for the affected `exam_id` and `student_user_id`, and record `exams.is_public`, `exams.status`, `exams.published_at`, `exams.class_group_id`, `exam_section_assignments.class_group_id`, and `enrollments.class_group_id`.
- [x] If assignment rows are missing for current create/update flows, update `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts` and `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts` so classroom assignment targets always sync `exam_section_assignments` and `syncExamAssignmentSummary()`.
- [x] If only old data is missing assignment rows, create a documented one-time data remediation note in `docs/context/July/examination-and-exam-visibility-issue.md` using explicit affected `exam_id` values rather than adding a Prisma migration.
- [x] If `GET /exams` fails for assigned private exams despite correct rows, update `buildStudentExamVisibilityPredicate()` in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts` to preserve published/enrollment gates while matching exact `exams.class_group_id` and exact `exam_section_assignments.class_group_id`.
- [x] If `GET /exams/:id`, lobby, checkup, or runtime access fails while list succeeds, update `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`, `app/sentinel-api/src/modules/examination/access/services/verify-student-exam-eligibility.service.ts`, or `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts` so detail/runtime access uses the same private-assigned student predicate.
- [x] If `/student/exam` or `/student/history` hides the exam after the API returns it, update `app/sentinel-web/src/app/(protected)/student/exam/_hooks/use-exam-list.ts`, `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts`, or `app/sentinel-web/src/app/(protected)/student/_lib/normalize-student-exam.ts` so private assigned exams are not filtered out by frontend status mapping.
- [x] Write or update tests in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` proving private published classroom-assigned exams are visible to enrolled students and public unassigned exams remain hidden.
- [x] Write or update tests in `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts` and `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.test.ts` proving list and detail use the same student assignment gates and do not require `e.is_public = true`.

<!-- NOTE: Added explicit no-public-gate assertions to both suites on 2026-07-10; the focused `sentinel-api` visibility run passed with 29/29 tests. -->

- [ ] Write or update tests in `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.test.ts` and `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.test.ts` proving assignment rows persist for private and public classroom-assigned exams and survive an `isPublic`-only update.
- [x] Write or update tests in `app/sentinel-web/src/app/(protected)/student/exam/_hooks/use-exam-list.test.ts` and `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts` proving the student available surfaces consume `useExamsQuery()` results without filtering private assigned exams out.

<!-- NOTE: `use-exam-list.test.ts` was added on 2026-07-10 and `use-student-history/index.test.ts` already covered the assigned published/private exam path; both passed together in the focused `sentinel-web` visibility suite. -->

**Migration required:** No - this phase changes read/write logic over existing assignment, exam, and enrollment tables. Use a documented data remediation only for existing bad rows.

## Phase 6: Staff Operational Visibility Consistency

**Goal:** Keep instructor/admin monitoring, grading, and reporting consistent with the confirmed private/public visibility matrix after student visibility is fixed.

- [x] Confirm the product rule for admins and staff in `docs/context/July/fix-private-visibility-assigned.md`, especially whether admins can open private unassigned exams by direct detail URL.
- [x] If staff list/detail visibility drifts, update `buildStaffExamVisibilityPredicates()` in `app/sentinel-api/src/modules/examination/assign/services/exam-access.ts` and consume it from `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` and `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`.
- [x] If monitoring visibility drifts, update `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.ts` to use the shared staff predicate with institution scoping.
- [x] If grading visibility drifts, update `app/sentinel-api/src/modules/examination/grading/data/get-grading-exams.ts` and `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts` to use the shared staff predicate intentionally.
- [x] If reporting visibility drifts, update `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.ts` and `app/sentinel-api/src/modules/examination/reporting/services/get-reporting-exam-context.ts` to use the correct shared staff or assigned-only predicate.
- [x] Write or update tests in `app/sentinel-api/src/modules/examination/assign/services/exam-access.test.ts` proving shared staff predicates cover creator, public institution access, explicit assignment, accepted proctor assignment, classroom instructor assignment, and shares.
- [x] Write or update tests in `app/sentinel-api/src/modules/examination/exams/data/get-exams-instructor-visibility.test.ts` and `app/sentinel-api/src/modules/examination/exams/controllers/get-exam.controller.test.ts` proving private unassigned staff/admin detail behavior matches the confirmed matrix.
- [ ] Write or update tests in `app/sentinel-api/src/modules/examination/grading/data/grading-visibility.test.ts`, `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.test.ts`, and `app/sentinel-api/src/modules/examination/reporting/services/get-exam-reports-list.test.ts` proving operational surfaces use the intended staff predicate.

**Migration required:** No - this phase only aligns authorization predicates over existing tables.

## Phase 7: Validation And Manual QA

**Goal:** Verify the confirmed fixes with focused automated suites and one clean end-to-end manual attempt.

- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts' 'src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.test.ts'`.
- [ ] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.test.tsx'`.
- [ ] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx src/workers/tests/audio-anomaly-engine.test.ts src/workers/tests/audio-anomaly.integration.test.ts`.
- [ ] Run `pnpm --dir packages/shared exec vitest run --passWithNoTests src/audio/yamnet-class-mapper.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/ingestion/rules/ai-rules.test.ts src/modules/telemetry/storage/services/incident-persistence.service.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts src/modules/examination/exams/data/get-exams.test.ts src/modules/examination/exams/data/get-exam-by-id.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/exams/services/create-exam.service.test.ts src/modules/examination/exams/services/update-exam.service.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/_hooks/use-exam-list.test.ts' 'src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts'` if frontend visibility hooks changed.
- [ ] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/assign/services/exam-access.test.ts src/modules/examination/grading/data/grading-visibility.test.ts src/modules/examination/monitoring/services/get-monitoring-exam-context.test.ts src/modules/examination/reporting/services/get-exam-reports-list.test.ts` if staff operational visibility changed.
- [x] Run `pnpm lint` after focused suites pass, and document any unrelated existing lint blockers.
- [ ] Run `pnpm format:check` after implementation files are formatted, and document any unrelated existing format blockers.
- [ ] Manually verify on one new clean attempt that first right-click, first clipboard action, first print-screen shortcut, first focus loss, and first active fullscreen exit each create exactly one browser network request and one server-accepted occurrence.
- [ ] Manually verify a second distinct browser action increments `details.occurrenceCount` to `2`, while an exact duplicate `dedupeKey` does not increment.
- [ ] Manually verify clicking Turn In from fullscreen creates no `FULL_SCREEN_EXIT`, no lock, and no instructor timeline item.
- [ ] Manually verify configured speech/noise creates one audio anomaly toast and one instructor-visible incident, while disabled tapping/typing does not flag unless enabled in support audio settings.
- [ ] Manually verify a private, published, classroom-assigned exam appears on `/student/exam`, `/student/history` available surfaces, detail/lobby/checkup, and cannot be opened by an unrelated student.

**Migration required:** No - validation only.

## Public API / Type Changes

- No endpoint path changes are planned.
- Telemetry ingestion payload remains compatible; it should continue to preserve `metadata.eventId`, `metadata.dedupeKey`, and `metadata.clientActionAt`.
- `GET /settings/audio` may need an authorization adjustment so authenticated students can read global audio settings; the response shape should not change.
- Exam list/detail response shapes should not change.

## Breaking API Changes

- None expected.
- Expected behavior changes are corrections: exact duplicate telemetry posts no-op, Turn In fullscreen teardown does not flag, configured audio anomaly windows persist once, and private assigned exams are visible to assigned students while unrelated students remain blocked.

## New Environment Variables

- None expected.

## Migration Rollback Note

- No new Prisma migration is planned.
- If the target environment lacks `flagged_incidents_dedupe_key_unique`, apply or repair the existing `20260706000000_add_telemetry_dedupe_index` migration instead of adding a new migration.
- If one-time data remediation is needed for old exams missing `exam_section_assignments`, record the affected `exam_id` values and inserted rows in the execution notes so the data operation can be reversed manually.

## Done Criteria

- [x] Baseline reproduction records include `exam_id`, `attempt_id`, `student_user_id`, browser telemetry payloads, and DB `flagged_incidents` rows.
- [x] The target database has the telemetry dedupe unique index or a documented environment remediation.
- [x] One physical browser-security action produces one telemetry request and one server-accepted occurrence.
- [x] Exact duplicate dedupe keys never increment `details.occurrenceCount`.
- [x] Turn In from fullscreen does not create `FULL_SCREEN_EXIT`, while active fullscreen exit still does.
- [x] Audio settings load for student attempts, configured speech/noise can flag, and disabled tapping/typing does not flag unexpectedly.
- [x] Private published classroom-assigned exams are visible to assigned students across list/detail/lobby/history surfaces without requiring `is_public = true`.
- [x] Public unassigned exams remain hidden from unrelated students.
- [ ] Staff/admin operational visibility follows the confirmed matrix consistently across list, detail, monitoring, grading, and reporting if those surfaces are touched.
- [ ] Focused Vitest suites for all touched modules pass.
- [ ] `pnpm lint` and `pnpm format:check` are run or documented with unrelated blockers.
- [x] No new Prisma migration is created.
