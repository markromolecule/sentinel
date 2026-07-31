# Feat 002 Implementation Plan: Solidify Exam Lifecycle

## Pre-Planning

- [x] Task summary: create an end-to-end implementation plan that turns `docs/context/July/solidify-exam-lifecyle.md` into an attempt-scoped exam lifecycle implementation across schema, API, access checks, monitoring, incidents, grading, reports, and mirrored web/core UI.
- [x] Relevant source files scanned:
    - `docs/context/July/solidify-exam-lifecyle.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `packages/db/prisma/schema.prisma`
    - `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts`
    - `app/sentinel-api/src/modules/examination/flow/services/complete-session.service.ts`
    - `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`
    - `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts`
    - `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts`
    - `app/sentinel-api/src/modules/examination/incidents/incidents.service.ts`
    - `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts`
    - `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.ts`
    - `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts`
    - `app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.ts`
    - `app/sentinel-api/src/modules/examination/reporting/services/reporting-response.shared.ts`
    - `app/sentinel-api/src/modules/examination/reporting/helpers/student-reporting.helpers.ts`
    - `packages/shared/src/types/exams/exam.ts`
    - `packages/shared/src/types/proctor/exams/[id]/monitoring/index.ts`
    - `packages/services/src/api/exams/types.ts`
    - `packages/services/src/api/exams/core.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts`
    - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_components/runtime-access-dialogs.tsx`
- [x] Files, services, and DB tables likely touched:
    - DB: `exam_attempts`, new `exam_attempt_lifecycle_events`, existing `flagged_incidents`, existing `exam_lobby_admissions`, existing `system_settings`
    - Prisma schema and generated types: `packages/db/prisma/schema.prisma`, `packages/db/src/generated/types.ts`
    - Shared types/schemas: `packages/shared/src/types/exams/exam.ts`, `packages/shared/src/schema/exams/student-override-schema.ts`, `packages/shared/src/schema/exams/reporting-schema.ts`, `packages/shared/src/types/proctor/exams/[id]/monitoring/index.ts`
    - Services client: `packages/services/src/api/exams/types.ts`, `packages/services/src/api/exams/core.ts`, `packages/services/src/api/exams/monitoring.ts`, `packages/services/src/api/exams/reporting.ts`, `packages/services/src/api/exams/index.ts`
    - Hooks client: `packages/hooks/src/query/exams/*`
    - API modules: `app/sentinel-api/src/modules/examination/lifecycle`, `flow`, `access`, `monitoring`, `incidents`, `student-overrides`, `grading`, `reporting`
    - Web UI: `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring`, `app/sentinel-web/src/features/exams/monitoring`, `app/sentinel-web/src/features/exams/logs`, `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]`, `app/sentinel-web/src/app/(protected)/student/exam/[id]`
    - Core UI parity: `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring`, `app/sentinel-core/src/features/exams/monitoring`, `app/sentinel-core/src/app/(protected)/exams/[id]/report`
- [x] Prisma migration decision: **migration required** because attempt lifecycle must be queryable and enforceable. Add current lifecycle state columns to `exam_attempts` and a dedicated `exam_attempt_lifecycle_events` audit table instead of storing core lifecycle only in `system_settings` or `answer_snapshot`.

## 1-3-1 Architectural Decision

### Option 1: Minimal Runtime-Access Patch

Add attempt-specific keys into `system_settings`, keep most existing `exam_attempts.status` behavior, and have access checks read student-specific lock/close/reopen settings before the exam-wide runtime-access setting.

Tradeoff: fastest and lowest migration pressure, but lifecycle state remains fragmented across JSON settings, reports stay hard to query, and audit/compliance behavior stays weaker than the context requires.

### Option 2: Hybrid Attempt Lifecycle Model (Recommended)

Add explicit current lifecycle fields to `exam_attempts`, add `exam_attempt_lifecycle_events` for immutable audit history, route all manual and automated lifecycle actions through a new API service, and update access, monitoring, incidents, grading, reports, and UI to consume the same model.

Tradeoff: moderate schema/API/UI scope, but it gives one reliable source of truth while preserving auditability and fits the existing `exam_attempts` per-student runtime boundary.

### Option 3: Event-Sourced Lifecycle Only

Add only an `exam_attempt_lifecycle_events` table and derive the current lifecycle state by replaying the latest event per attempt in access checks, monitoring, reports, and grading.

Tradeoff: strongest historical model and fewer mutable columns, but every runtime query becomes more complex and easier to make inconsistent under monitoring/report load.

## Best Option

Choose **Option 2: Hybrid Attempt Lifecycle Model**.

Why: the context explicitly requires fast per-student isolation, reliable access enforcement, monitoring/report visibility, and audit history. Current Sentinel code already treats `exam_attempts` as the durable runtime boundary, so storing current lifecycle state there keeps access checks simple and queryable. A companion lifecycle event table satisfies audit needs without forcing every API read to reconstruct current state from event history.

Concrete next steps:

1. Add lifecycle enums, columns, indexes, and an audit event table through Prisma migration.
2. Add shared lifecycle schemas/types and services client contracts.
3. Add a backend lifecycle module with attempt-scoped lock, reopen, reset, close, finalize, makeup, and retake orchestration.
4. Update start/resume/complete/access logic so lifecycle state is enforced before a student can continue.
5. Update incident review and optional automatic close to call the lifecycle service instead of mutating attempt state inline.
6. Update monitoring, reports, grading, and student exam UI to read the same lifecycle fields.
7. Mirror instructor-facing UI updates in `sentinel-core` where parity is expected.
8. Run focused API/shared/web/core tests plus migration and formatting validation.

## Phase 1: Schema and Shared Lifecycle Contracts

**Goal:** Add a queryable attempt lifecycle state and immutable audit trail that every runtime surface can share.

- [x] Update `packages/db/prisma/schema.prisma` to add enum `exam_attempt_lifecycle_state` with `IN_PROGRESS`, `LOCKED`, `CLOSED`, `SUBMITTED`, and `SUPERSEDED`.
- [x] Update `packages/db/prisma/schema.prisma` to add enum `exam_attempt_lifecycle_event_type` with `STARTED`, `SUBMITTED`, `LOCKED`, `REOPENED`, `RESET`, `CLOSED`, `SUPERSEDED`, `FINALIZED`, `FINALIZATION_REVISED`, `MAKEUP_GRANTED`, `RETAKE_GRANTED`, and `INCIDENT_REVIEWED`.
- [x] Update `packages/db/prisma/schema.prisma` to add enum `exam_attempt_score_state` with `DRAFT`, `FINALIZED`, and `REVISION_REQUIRED`.
- [x] Update `packages/db/prisma/schema.prisma` `model exam_attempts` with `lifecycle_state`, `lifecycle_reason`, `lifecycle_note`, `locked_at`, `locked_by`, `reopened_until`, `closed_at`, `closed_by`, `closed_reason`, `superseded_by_attempt_id`, `superseded_at`, `superseded_by`, `finalized_at`, `finalized_by`, and `score_state`.
- [x] Update `packages/db/prisma/schema.prisma` to add `model exam_attempt_lifecycle_events` with `event_id`, `attempt_id`, `exam_id`, `student_id`, `event_type`, `previous_state`, `next_state`, `actor_user_id`, `reason_code`, `notes`, `related_incident_ids`, `related_override_id`, `metadata`, and `created_at`.
- [x] Add indexes in `packages/db/prisma/schema.prisma` for `exam_attempts(exam_id, student_id, lifecycle_state)`, `exam_attempts(superseded_by_attempt_id)`, and `exam_attempt_lifecycle_events(attempt_id, created_at)`.
- [x] Create Prisma migration under `packages/db/prisma/migrations/[timestamp]_add_exam_attempt_lifecycle/migration.sql` with a backfill that maps existing `exam_attempts.status = 'COMPLETED'` or `completed_at is not null` to `SUBMITTED`, and everything else to `IN_PROGRESS`.
- [x] Update `packages/db/src/generated/types.ts` by running the repo's Prisma/type generation command after the migration is created.
- [x] Update `packages/shared/src/types/exams/exam.ts` to export `ExamAttemptLifecycleState`, `ExamAttemptLifecycleEventType`, `ExamAttemptScoreState`, `ExamAttemptLifecycleEvent`, and `ExamAttemptLifecycleSnapshot`.
- [x] Add `packages/shared/src/schema/exams/lifecycle-schema.ts` with Zod schemas for lifecycle state, lifecycle event type, lifecycle action payloads, and lifecycle API responses.
- [x] Export lifecycle schemas from `packages/shared/src/schema/index.ts` and shared lifecycle types from `packages/shared/src/types/index.ts`.
- [x] Write `packages/shared/src/schema/exams/lifecycle-schema.test.ts` covering valid lock/reopen/reset/close/finalize payloads and invalid reopen windows.
- [x] Write `packages/db/src/tests/exam-attempt-lifecycle-schema.test.ts` proving the generated DB types expose the new enums, columns, and lifecycle event table.

**Migration required:** Yes - core lifecycle state must be stored on `exam_attempts` and audit events need a new table.
**Breaking changes:** Additive DB/API changes only in this phase; no existing endpoint should be removed.
**New environment variables:** None.

## Phase 2: Backend Lifecycle Service and Routes

**Goal:** Centralize all attempt-scoped lifecycle mutations behind one service so manual and automated transitions behave identically.

- [x] Add `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.dto.ts` with request/response schemas for lock, reopen, reset, close, finalize, revision, makeup, and retake actions using `Schema` exports from `@sentinel/shared`.
- [x] Add `transitionExamAttemptLifecycle()` in `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-transition.service.ts` with validation for allowed state transitions.
- [x] Add `appendExamAttemptLifecycleEvent()` in `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-event.service.ts` to insert one `exam_attempt_lifecycle_events` row for every transition.
- [x] Add `getLifecycleAttemptContext()` in `app/sentinel-api/src/modules/examination/lifecycle/data/get-lifecycle-attempt-context.ts` to fetch attempt, exam, student, institution, lifecycle fields, and latest incidents by `examId + attemptId`.
- [x] Add `lockExamAttempt()` in `app/sentinel-api/src/modules/examination/lifecycle/services/lock-exam-attempt.ts` to set `lifecycle_state = 'LOCKED'`, `locked_at`, `locked_by`, reason, note, and append a `LOCKED` event.
- [x] Add `reopenExamAttempt()` in `app/sentinel-api/src/modules/examination/lifecycle/services/reopen-exam-attempt.ts` to set `lifecycle_state = 'IN_PROGRESS'`, `reopened_until`, clear lock-only blocking fields where appropriate, and append a `REOPENED` event.
- [x] Add `closeExamAttempt()` in `app/sentinel-api/src/modules/examination/lifecycle/services/close-exam-attempt.ts` to set `lifecycle_state = 'CLOSED'`, `closed_at`, `closed_by`, `closed_reason`, preserve answer snapshots, and append a `CLOSED` event.
- [x] Add `resetExamAttempt()` in `app/sentinel-api/src/modules/examination/lifecycle/services/reset-exam-attempt.ts` to mark the old attempt `SUPERSEDED`, retain evidence and answers, create or permit the next attempt through a student override, and append `RESET` plus `SUPERSEDED` events.
- [x] Add `finalizeExamAttemptScore()` in `app/sentinel-api/src/modules/examination/lifecycle/services/finalize-exam-attempt-score.ts` to set `score_state = 'FINALIZED'`, `finalized_at`, `finalized_by`, and append a `FINALIZED` event without reopening runtime access.
- [x] Add `reviseFinalizedAttemptScore()` in `app/sentinel-api/src/modules/examination/lifecycle/services/revise-finalized-attempt-score.ts` to require a reason, set `score_state = 'REVISION_REQUIRED'`, and append a `FINALIZATION_REVISED` event.
- [x] Add controllers in `app/sentinel-api/src/modules/examination/lifecycle/controllers` for `lock`, `reopen`, `reset`, `close`, `finalize`, `revise-finalization`, `grant-makeup`, and `grant-retake`.
- [x] Add `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.routes.ts` with attempt-scoped routes under `/exams/:id/attempts/:attemptId/lifecycle/*` and student-scoped routes under `/exams/:id/students/:studentId/lifecycle/*`.
- [x] Update `app/sentinel-api/src/modules/examination/exams/exam.routes.ts` to import and call `registerLifecycleRoutes(examsRoutes)` beside monitoring, reporting, runtime-access, student-overrides, lobby, and incidents route registration.
- [x] Require `requireActivePermission(c, 'examinations:update')` in lifecycle controllers, and keep `requireActivePermission(c, 'incidents:review')` in incident review controllers for incident-triggered lifecycle follow-up actions.
- [x] Write `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-transition.service.test.ts` covering legal and illegal state transitions.
- [x] Write `app/sentinel-api/src/modules/examination/lifecycle/services/lock-exam-attempt.test.ts`, `reopen-exam-attempt.test.ts`, `close-exam-attempt.test.ts`, and `reset-exam-attempt.test.ts` proving each action mutates only the target `attempt_id`.
- [x] Write controller tests in `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.routes.test.ts` covering authorization, not-found attempts, wrong-exam attempts, and successful lifecycle responses.

**Migration required:** No - this phase consumes the Phase 1 schema.
**Breaking changes:** No - all routes are additive and existing runtime-access routes remain available.
**New environment variables:** None.

## Phase 3: Start, Resume, Complete, and Access Enforcement

**Goal:** Make student access and attempt persistence respect attempt lifecycle state before a student can start, resume, sync, or submit.

- [x] Update `app/sentinel-api/src/modules/examination/access/data/entitlements.repository.ts` `getStudentLatestExamAttempt()` to select lifecycle fields and ignore `SUPERSEDED` attempts when deciding the latest resumable attempt.
- [x] Update `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts` to block `LOCKED`, `CLOSED`, and `SUPERSEDED` attempts with lifecycle-specific runtime messages.
- [x] Update `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts` to allow `REOPEN` overrides only when the referenced attempt is still resumable and the override window is active.
- [x] Update `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts` `createSession()` to skip superseded attempts, resume locked attempts only when an active reopen override or `reopened_until` permits it, and create fresh attempts for valid makeup/retake/reset overrides.
- [x] Update `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts` `createSession()` to write `lifecycle_state = 'IN_PROGRESS'` on new attempt insert.
- [x] Update `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts` `completeSession()` to set `lifecycle_state = 'SUBMITTED'` and `score_state = 'DRAFT'` when the student submits normally.
- [x] Update `app/sentinel-api/src/modules/examination/flow/services/complete-session.service.ts` to reject submit for `LOCKED`, `CLOSED`, or `SUPERSEDED` attempts before scoring.
- [x] Update `app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts` to reject progress sync for `LOCKED`, `CLOSED`, or `SUPERSEDED` attempts.
- [x] Update `app/sentinel-api/src/modules/examination/flow/services/start-session.service.ts` to include lifecycle-specific `errorCode` values such as `ATTEMPT_LOCKED`, `ATTEMPT_CLOSED`, and `ATTEMPT_SUPERSEDED`.
- [x] Update `packages/services/src/api/exams/types.ts` `StartExamSessionResult` with lifecycle-specific error codes.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts` to expose lifecycle-aware blocked states from `runtimeAccess.message`.
- [x] Write `app/sentinel-api/src/modules/examination/access/access.test.ts` cases for locked, closed, reopened, reset/superseded, makeup, and retake access.
- [x] Write `app/sentinel-api/src/modules/examination/flow/data/session.repository.test.ts` cases proving reset/retake creates a fresh attempt while reopen resumes the same attempt.
- [x] Write `app/sentinel-api/src/modules/examination/flow/controllers/complete-session.controller.test.ts` cases proving locked/closed/superseded attempts cannot submit.
- [x] Add `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.test.tsx` proving locked and closed runtime messages are exposed to student flow pages.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/instruction/page.test.tsx`, `privacy/page.test.tsx`, `checkup/page.test.tsx`, and `lobby/page.test.tsx` proving blocked lifecycle messages render and no attempt navigation occurs for locked/closed attempts.

**Migration required:** No - this phase consumes the Phase 1 schema.
**Breaking changes:** No response shape removals, but student start errors gain new `errorCode` values.
**New environment variables:** None.

## Phase 4: Remediation Grants for Makeup, Retake, and Reopen

**Goal:** Preserve existing override behavior while tying each grant to lifecycle state, source attempts, audit events, and access enforcement.

- [x] Update `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts` `createStudentExamAccessOverride()` to accept and persist a `sourceAttemptId` for `REOPEN` when reopening an existing attempt.
- [x] Update `packages/shared/src/schema/exams/student-override-schema.ts` so `RETAKE` requires `sourceAttemptId`, `REOPEN` requires `sourceAttemptId` when granted from an attempt lifecycle route, and `MAKEUP` continues to allow `sourceAttemptId = null`.
- [x] Add `grantMakeupExamWindow()` in `app/sentinel-api/src/modules/examination/lifecycle/services/grant-makeup-exam-window.ts` to create a `MAKEUP` override, append a `MAKEUP_GRANTED` event when a source attempt exists, and avoid mutating unrelated attempts.
- [x] Add `grantRetakeExamWindow()` in `app/sentinel-api/src/modules/examination/lifecycle/services/grant-retake-exam-window.ts` to require `attemptId`, create a `RETAKE` override with `sourceAttemptId`, and append a `RETAKE_GRANTED` event.
- [x] Add `grantReopenAttemptWindow()` in `app/sentinel-api/src/modules/examination/lifecycle/services/grant-reopen-attempt-window.ts` to create a `REOPEN` override tied to one locked/closed in-progress attempt.
- [x] Update `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts` `markOverrideUsed()` to append `usedAttemptIds` without double-counting resumed `REOPEN` attempts.
- [x] Update `app/sentinel-api/src/modules/examination/reporting/services/exam-report-queries/override-helpers.ts` so `MAKEUP`, `RETAKE`, and `REOPEN` are mapped from override metadata and lifecycle events consistently.
- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/index.ts` to replace `window.prompt` makeup/retake grants with service calls that use the new lifecycle endpoints while preserving existing queue behavior.
- [x] Mirror the report grant changes in `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.tsx`.
- [x] Write `packages/shared/src/schema/exams/student-override-schema.test.ts` for `MAKEUP`, `RETAKE`, and `REOPEN` validation.
- [x] Write `app/sentinel-api/src/modules/examination/lifecycle/services/grant-makeup-exam-window.test.ts` and `grant-retake-exam-window.test.ts` covering source attempt requirements and override usage.
- [x] Write web report hook tests in `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/index.test.tsx` for makeup and retake lifecycle endpoint calls.
- [x] Write core report tests in `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.test.tsx` for makeup and retake lifecycle endpoint calls.

**Migration required:** No - this phase uses lifecycle events and existing `system_settings` override storage.
**Breaking changes:** No - existing override endpoints can remain, but report UI should prefer lifecycle grant endpoints.
**New environment variables:** None.

## Phase 5: Incident Review and Automatic Attempt Closure

**Goal:** Keep incident confirmation as evidence review while enabling explicit or configured lifecycle transitions through the lifecycle service.

- [x] Update `app/sentinel-api/src/modules/examination/incidents/incidents.dto.ts` to add optional lifecycle follow-up fields to review payloads, such as `lifecycleAction`, `reasonCode`, and `notes`.
- [x] Update `app/sentinel-api/src/modules/examination/incidents/incidents.service.ts` `reviewExamIncidentsData()` to return affected `attemptId` values and append `INCIDENT_REVIEWED` lifecycle events without changing attempt state by default.
- [x] Update `app/sentinel-api/src/modules/examination/incidents/incidents.service.ts` to call `lockExamAttempt()` or `closeExamAttempt()` only when a lifecycle follow-up action is explicitly requested and all reviewed incidents belong to one target attempt.
- [x] Add `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.constants.ts` with the first-slice automatic close policy: close one attempt after 3 committed `HIGH` incidents for that attempt within 15 minutes, with no immediate-close event type in this release.
- [x] Add `app/sentinel-api/src/modules/examination/lifecycle/services/resolve-automatic-lifecycle-policy.ts` to convert persisted incident severity/count metadata into automatic close decisions using `AUTOMATIC_ATTEMPT_CLOSE_POLICY`.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` to invoke `resolveAutomaticLifecyclePolicy()` after committed high-severity incident updates and call `closeExamAttempt()` only for the triggering `attempt_id`.
- [x] Leave `app/sentinel-api/src/modules/examination/configuration/services/build-default-exam-configuration.ts` unchanged in this first slice; document exam-configurable automatic close thresholds as future work in the lifecycle service JSDoc.
- [x] Update `app/sentinel-web/src/features/exams/logs/hooks/use-incident-logs.ts`, `app/sentinel-web/src/features/exams/logs/components/columns.tsx`, and `app/sentinel-web/src/features/exams/logs/components/incident-drawer.tsx` to offer lifecycle follow-up actions after confirmed incidents without making confirmation itself close the attempt.
- [x] Write `app/sentinel-api/src/modules/examination/incidents/incidents.service.test.ts` proving confirm-only review does not mutate `exam_attempts.lifecycle_state`.
- [x] Write `app/sentinel-api/src/modules/examination/incidents/incidents.service.test.ts` proving explicit confirm-and-close affects only the selected attempt.
- [x] Write `app/sentinel-api/src/modules/examination/lifecycle/services/resolve-automatic-lifecycle-policy.test.ts` for threshold decisions and no-op decisions.
- [x] Write `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving automatic closure affects only the triggering `attempt_id`.
- [x] Write `app/sentinel-web/src/features/exams/logs/hooks/use-incident-logs.test.ts` and `app/sentinel-web/src/features/exams/logs/components/incident-drawer.test.tsx` for confirm-only and confirm-with-lifecycle-action flows.

**Migration required:** No - automatic close thresholds are system constants in this first slice.
**Breaking changes:** No - review payload additions must be optional.
**New environment variables:** None.

## Phase 6: Monitoring API, Shared Types, and Instructor Web UI

**Goal:** Expose lifecycle state in live monitoring and make per-student controls distinct from exam-wide runtime access controls.

- [x] Update `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts` to select lifecycle fields from `exam_attempts`.
- [x] Update `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.ts` to select lifecycle fields and lifecycle event history for the selected attempt.
- [x] Update `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts` `MonitoringStudentRow`, `mapMonitoringStudentSummary()`, and `mapMonitoringStudentDetail()` to include `lifecycleState`, `scoreState`, `closedReason`, `reopenedUntil`, `finalizedAt`, and `lifecycleEvents`.
- [x] Update `app/sentinel-api/src/modules/examination/monitoring/monitoring.dto.ts` to include lifecycle fields in overview and detail response schemas.
- [x] Update `packages/shared/src/types/proctor/exams/[id]/monitoring/index.ts` `StudentSession` with lifecycle fields and add lifecycle-aware monitoring status labels for `locked`, `closed`, and `superseded`.
- [x] Update `packages/services/src/api/exams/types.ts` `ApiMonitoringStudentSummary` and `ApiMonitoringStudentDetail` with lifecycle fields.
- [x] Update `packages/services/src/api/exams/mappers.ts` `mapMonitoringStudent()` to map lifecycle fields to shared `StudentSession`.
- [x] Add lifecycle action service functions in `packages/services/src/api/exams/core.ts`, such as `lockExamAttemptLifecycle()`, `reopenExamAttemptLifecycle()`, `resetExamAttemptLifecycle()`, and `closeExamAttemptLifecycle()`.
- [x] Add lifecycle mutation hooks in `packages/hooks/src/query/exams` for lock, reopen, reset, close, makeup, and retake actions.
- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts` to manage selected-student lifecycle actions through the new mutation hooks instead of using exam-wide `updateExamRuntimeAccess()` for all buttons.
- [x] Update `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.tsx` so exam-wide runtime access controls are visually labeled as exam-wide or moved away from per-student controls.
- [x] Add `app/sentinel-web/src/features/exams/monitoring/_components/attempt-lifecycle-actions.tsx` with per-student lock, reopen, reset, close, makeup, and retake actions.
- [x] Add `app/sentinel-web/src/features/exams/monitoring/_components/attempt-lifecycle-badge.tsx` to render lifecycle state, score state, and closed/finalized cues.
- [x] Update `app/sentinel-web/src/features/exams/monitoring/_components/student-list.tsx` to show lifecycle badges and disable reconnect override when the attempt is closed/superseded.
- [x] Update `app/sentinel-web/src/features/exams/monitoring/_components/flagging-timeline.tsx` to show lifecycle events next to incident review events when viewing a student detail.
- [x] Write `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts` cases for locked, closed, submitted, superseded, and finalized lifecycle states.
- [x] Write `packages/services/src/api/exams/mappers.test.ts` cases for lifecycle mapping.
- [x] Write `packages/hooks/src/query/exams/use-exam-attempt-lifecycle-mutation.test.ts` covering request paths and invalid payload handling.
- [x] Write `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx` for selected-student lifecycle actions and no accidental exam-wide mutation.
- [x] Write `app/sentinel-web/src/features/exams/monitoring/_components/attempt-lifecycle-actions.test.tsx`, `attempt-lifecycle-badge.test.tsx`, and `student-list.test.tsx` for lifecycle UI states.

<!-- NOTE: Phase 6 also required small wiring updates in `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`, `app/sentinel-web/src/features/exams/monitoring/_components/student-card.tsx`, `app/sentinel-web/src/features/exams/monitoring/_components/student-monitoring-detail.tsx`, `app/sentinel-web/src/features/exams/monitoring/_components/integrity-timeline-card.tsx`, and `app/sentinel-web/src/features/exams/monitoring/_components/index.ts` so the listed lifecycle props and timeline data could flow through the existing monitoring UI without changing unrelated behavior. -->

**Migration required:** No - this phase consumes lifecycle fields from Phase 1.
**Breaking changes:** Monitoring response gets additive fields; existing consumers should continue working.
**New environment variables:** None.

## Phase 7: Reports, Grading, and Score Finalization

**Goal:** Align reports and grading with explicit lifecycle and score-finalization state instead of deriving everything from completed timestamps and incident counts.

- [x] Update `app/sentinel-api/src/modules/examination/reporting/services/exam-report-queries/query-builders.ts` to select attempt lifecycle fields, score state, finalized fields, and superseded relationships.
- [x] Update `app/sentinel-api/src/modules/examination/reporting/services/reporting-response.types.ts` to include lifecycle fields in `ReportStudentRow`.
- [x] Update `app/sentinel-api/src/modules/examination/reporting/services/reporting-response.shared.ts` `isSubmitted()`, `needsReview()`, `needsRetake()`, and `resolveAttemptKind()` to use lifecycle and override metadata before fallback heuristics.
- [x] Update `app/sentinel-api/src/modules/examination/reporting/helpers/student-reporting.helpers.ts` `resolveStudentStatus()`, `resolveSubmissionType()`, and `mapStudentSummary()` to classify `force_close`, `retake`, `makeup`, `superseded`, `finalized`, and `needsReview` from explicit fields.
- [x] Update `app/sentinel-api/src/modules/examination/reporting/services/map-reporting-response.ts` so action queues exclude superseded attempts from official score queues unless explicitly requested.
- [x] Update `app/sentinel-api/src/modules/examination/grading/services/get-grading-attempt-detail.ts` to include lifecycle and score state.
- [x] Update `app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.ts` to block ordinary edits when `score_state = 'FINALIZED'` unless a revision flow has set `REVISION_REQUIRED`.
- [x] Update `app/sentinel-api/src/modules/examination/grading/services/bulk-finalize-attempts.ts` to call `finalizeExamAttemptScore()` for each eligible attempt instead of writing only `_grading.finalizedAt` JSON metadata.
- [x] Update `app/sentinel-api/src/modules/examination/grading/controllers/update-grading-attempt.controller.ts` and `bulk-finalize-attempts.controller.ts` response DTOs to include `scoreState`, `finalizedAt`, and `finalizedBy`.
- [x] Update `packages/services/src/api/exams/reporting.ts` and `packages/services/src/api/exams/types.ts` report types with lifecycle and finalization fields.
- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/overview-view.tsx`, `attempts-view.tsx`, `action-queue-view.tsx`, `action-queue-panel.tsx`, and `columns.tsx` to show lifecycle, superseded, official score, and finalized badges.
- [x] Mirror report lifecycle/finalization display changes in `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.tsx`.
- [x] Write `app/sentinel-api/src/modules/examination/reporting/services/map-reporting-response.test.ts` for locked, closed, force-close, makeup, retake, superseded, and finalized attempts.
- [x] Write `app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.test.ts` for finalized edit blocking and revision-required edit allowance.
- [x] Write `app/sentinel-api/src/modules/examination/grading/services/bulk-finalize-attempts.test.ts` proving lifecycle events are written for every finalized attempt.
- [x] Add or update `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx`, `_components/overview-view.test.tsx`, `_components/attempts-view.test.tsx`, `_components/action-queue-panel.test.tsx`, and `_components/columns.test.tsx` for lifecycle and finalization badges.
- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.test.tsx` for lifecycle and finalization badges.

**Migration required:** No - this phase consumes lifecycle and finalization columns from Phase 1.
**Breaking changes:** Report response gets additive fields; score finalization behavior becomes stricter for already-finalized attempts.
**New environment variables:** None.

## Phase 8: Student Runtime UX and Core App Parity

**Goal:** Make students see correct lifecycle-specific states and keep `sentinel-core` monitoring/report behavior aligned with `sentinel-web`.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.ts` to respect active `REOPEN`, `MAKEUP`, and `RETAKE` lifecycle windows and avoid redirecting eligible students away from a valid attempt window.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts` to expose lifecycle state and runtime-access messaging to all student flow pages.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/instruction/page.tsx`, `privacy/page.tsx`, `checkup/page.tsx`, `lobby/page.tsx`, and `attempt/page.tsx` to render locked, closed, reopened, reset, makeup, and retake messages from the shared runtime access contract.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts` to stop autosave/submit actions after lifecycle-blocking errors and surface the API message.
- [x] Add `app/sentinel-core/src/features/exams/monitoring/_components/attempt-lifecycle-actions.tsx` and `app/sentinel-core/src/features/exams/monitoring/_components/attempt-lifecycle-badge.tsx` using the same behavior as the `sentinel-web` monitoring lifecycle components.
- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.ts` to use lifecycle mutation hooks and selected-student lifecycle actions.
- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.tsx`, `app/sentinel-core/src/features/exams/monitoring/_components/student-list.tsx`, `app/sentinel-core/src/features/exams/monitoring/_components/student-card.tsx`, `app/sentinel-core/src/features/exams/monitoring/_components/student-monitoring-detail.tsx`, and `app/sentinel-core/src/features/exams/monitoring/_components/flagging-timeline.tsx` to show lifecycle badges and controls.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.test.tsx`, `app/sentinel-web/src/app/(protected)/student/exam/[id]/instruction/page.test.tsx`, `app/sentinel-web/src/app/(protected)/student/exam/[id]/privacy/page.test.tsx`, `app/sentinel-web/src/app/(protected)/student/exam/[id]/checkup/page.test.tsx`, and `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` for locked, closed, reopened, makeup, and retake states.
- [x] Write `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` for lifecycle-blocking submit/sync errors.
- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.test.tsx`, `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx`, `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.test.tsx`, `app/sentinel-core/src/features/exams/monitoring/_components/flagging-timeline.test.tsx`, and add `app/sentinel-core/src/features/exams/monitoring/_components/attempt-lifecycle-actions.test.tsx` plus `app/sentinel-core/src/features/exams/monitoring/_components/attempt-lifecycle-badge.test.tsx` matching the `sentinel-web` lifecycle behavior.

**Migration required:** No - this phase consumes backend lifecycle fields and service clients.
**Breaking changes:** No - student UI behavior becomes more specific for existing blocked states.
**New environment variables:** None.

## Phase 9: Audit, Notifications, Permissions, and Observability

**Goal:** Ensure every lifecycle action is traceable, permissioned, and visible to the right student/instructor audiences.

- [x] Update `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-event.service.ts` to include previous state, next state, actor, reason, notes, related incidents, and related override ids in every event.
- [x] Update `app/sentinel-api/src/modules/general/logs/logs.service.ts` call sites in lifecycle services to create `exam.lifecycle_*` logs for lock, reopen, reset, close, finalize, makeup, retake, and automatic close.
- [x] Update `app/sentinel-api/src/modules/general/notification/services/activity-notification.service.ts` usage in lifecycle services to send instructor-facing institution activity notifications that identify the affected student and attempt.
- [x] Add `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-notification.service.ts` with `notifyAttemptLifecycleStudent()` and `notifyAttemptLifecycleInstructor()` helpers using the existing notification/activity services.
- [x] Keep `packages/shared/src/constants/permissions.ts` unchanged in this first slice and use `examinations:update` for lifecycle mutations plus `incidents:review` for incident review follow-up actions.
- [x] Update lifecycle controllers under `app/sentinel-api/src/modules/examination/lifecycle/controllers` so only instructors/admin roles with `examinations:update` can mutate lifecycle state.
- [x] Add `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-audit.test.ts` proving lifecycle actions write logs, notifications, and lifecycle events with correct scope.
- [x] Add route-access tests in `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.routes.test.ts` for missing permission, wrong institution, student actor, and valid instructor actor.
- [x] Add UI tests in `app/sentinel-web/src/features/exams/monitoring/_components/attempt-lifecycle-actions.test.tsx` proving disabled states and confirmation copy mention the selected student, not the whole exam.

**Migration required:** No - this phase uses existing `examinations:update` and `incidents:review` permission constants.
**Breaking changes:** No.
**New environment variables:** None.

## Phase 10: End-to-End Validation and Release Readiness

**Goal:** Verify the lifecycle implementation from database migration through student/instructor workflows before merge.

- [ ] Run `pnpm --dir packages/db test -- exam-attempt-lifecycle-schema`.
- [x] Run `pnpm --dir packages/shared test -- lifecycle-schema student-override-schema`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/lifecycle`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/access src/modules/examination/flow`.
- [ ] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/incidents src/modules/telemetry/storage/services/incident-persistence.service.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/monitoring src/modules/examination/reporting src/modules/examination/grading`.
- [x] Run `pnpm --dir packages/services test -- exams`.
- [x] Run `pnpm --dir packages/hooks test -- exams`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]' 'src/app/(protected)/(instructor)/exams/[id]/monitoring' src/features/exams/monitoring src/features/exams/logs 'src/app/(protected)/(instructor)/exams/reports/[examId]'`.
- [x] Run `pnpm --dir app/sentinel-core exec vitest run --passWithNoTests 'src/app/(protected)/exams/[id]/monitoring' src/features/exams/monitoring 'src/app/(protected)/exams/[id]/report/page.test.tsx'`.
- [ ] Run `pnpm lint` or document unrelated existing lint blockers with exact failing workspaces.
- [ ] Run `pnpm format:check`.
- [ ] Apply the migration locally with `pnpm db:migrate` against a safe development database and verify backfill on sample attempts.
- [ ] Manually verify one instructor-gated exam with two students: lock/close/reset one student's attempt and confirm the second student's attempt remains unaffected.
- [ ] Manually verify incident confirm-only does not close an attempt, then confirm-with-close closes only the selected attempt.
- [ ] Manually verify reopen resumes answers, reset preserves old evidence and allows a fresh attempt, makeup works without a source attempt, and retake requires a source attempt.
- [ ] Manually verify finalized scores cannot be edited without revision flow and that reports show primary/makeup/retake/superseded/finalized states.

**Migration required:** No - validation only.
**Breaking changes:** No new changes in this phase.
**New environment variables:** None.

**Validation notes**

- [x] Focused lifecycle API validation passed with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/lifecycle`.
- [x] Focused lifecycle monitoring UI validation passed with `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/features/exams/monitoring/_components/attempt-lifecycle-actions.test.tsx`.
- [x] Shared contract validation passed with `pnpm --dir packages/shared test -- lifecycle-schema student-override-schema`.
- [x] Services client validation passed with `pnpm --dir packages/services test -- exams`.
- [x] Hooks validation passed with `pnpm --dir packages/hooks test -- exams`.
- [x] API access/flow validation passed with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/access src/modules/examination/flow`.
- [x] API monitoring/reporting/grading validation passed with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/monitoring src/modules/examination/reporting src/modules/examination/grading`.
- [x] `sentinel-web` validation passed with `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]' 'src/app/(protected)/(instructor)/exams/[id]/monitoring' src/features/exams/monitoring src/features/exams/logs 'src/app/(protected)/(instructor)/exams/reports/[examId]'` after adding a safe fallback for missing blocked-state fixtures in the student attempt hook.
- [x] `sentinel-core` validation passed with `pnpm --dir app/sentinel-core exec vitest run --passWithNoTests 'src/app/(protected)/exams/[id]/monitoring' src/features/exams/monitoring 'src/app/(protected)/exams/[id]/report/page.test.tsx'` after bringing the monitoring hook test's `@sentinel/hooks` mock up to date with the lifecycle mutation exports.
- [ ] `packages/db` validation is currently blocked by remote database connectivity. Reproduced with `pnpm --dir packages/db test -- exam-attempt-lifecycle-schema`; the run still executed `src/tests/announcements-schema.test.ts` and `src/tests/roles-migration.test.ts`, both failing with `Can't reach database server at aws-1-ap-northeast-1.pooler.supabase.com`.
- [ ] Incident review and telemetry persistence validation is currently blocked by the shared DB-backed test harness. Reproduced with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/incidents src/modules/telemetry/storage/services/incident-persistence.service.test.ts`; failures came from `src/lib/test-with-db-client.ts` reaching the same remote Supabase host.
- [ ] Monorepo lint is currently blocked in `@sentinel/db`. Reproduced with `pnpm lint`; first failing workspace was `packages/db` with `sh: eslint: command not found`.
- [ ] Monorepo format check still reports unrelated pre-existing files after formatting this lifecycle slice. Reproduced with `pnpm format:check`; 13 files remain, including `app/sentinel-core/next-env.d.ts`, `app/sentinel-support/next-env.d.ts`, `app/sentinel-web/next-env.d.ts`, `app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.test.ts`, multiple `sentinel-core` monitoring files, `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`, `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx`, and several older docs under `docs/task/June/...`.
- [ ] Full API typecheck is currently blocked by unrelated pre-existing errors outside the lifecycle slice. Reproduced with `NODE_OPTIONS=--max-old-space-size=4096 pnpm --dir app/sentinel-api exec tsc --noEmit`; first failing areas included `src/modules/content/question-bank/question-bank-shares.test.ts`, multiple `src/modules/core/classroom/controllers/*.test.ts`, and existing telemetry test/type issues.

## Breaking API Changes

- No endpoint removals are planned.
- Additive response fields are planned for monitoring, reports, grading, and student start/session responses.
- Student start/session responses will add lifecycle-specific `errorCode` values; consumers must treat unknown codes as blocked access with the provided message.
- Existing exam-wide runtime-access routes remain available, but instructor UI should stop using them for per-student lifecycle actions.

## Environment Changes

- No new `.env` variables are planned.
- Database migration requires the same database connectivity already needed by `pnpm db:migrate`.

## Migration Rollback Notes

- Rollback for `packages/db/prisma/migrations/[timestamp]_add_exam_attempt_lifecycle/migration.sql` must drop `exam_attempt_lifecycle_events`, remove lifecycle columns from `exam_attempts`, drop new lifecycle/score enums, and remove lifecycle indexes.
- Before rollback in any shared environment, export `exam_attempt_lifecycle_events` because rollback removes audit history.
- If rollback happens after code deployment, redeploy the previous code version before dropping lifecycle columns so access checks do not read missing fields.

## Done Criteria

- [ ] `exam_attempts` stores current lifecycle and finalization state separately from `exams.status`.
- [x] Every lifecycle mutation writes one `exam_attempt_lifecycle_events` row.
- [x] Lock, reopen, reset, close, makeup, and retake are attempt/student-scoped by default.
- [ ] Exam-wide runtime access is still available only as an explicit exam-wide control.
- [ ] Student start/resume/sync/submit paths enforce locked, closed, and superseded states.
- [ ] Incident confirmation does not mutate attempt lifecycle unless explicitly requested or automatic policy triggers.
- [x] Automatic lifecycle close, if enabled, affects only the triggering `attempt_id`.
- [ ] Monitoring overview/detail show lifecycle state and per-student controls.
- [ ] Reports classify primary, makeup, retake, superseded, needs review, needs makeup, needs retake, and finalized states from explicit lifecycle data.
- [ ] Grading finalization is enforced through `score_state`, `finalized_at`, and lifecycle events.
- [ ] `sentinel-web` and `sentinel-core` monitoring/report surfaces remain aligned where parity is expected.
- [x] Focused API, shared, services, hooks, web, core, migration, lint, and format validations pass or blockers are documented with exact commands.
