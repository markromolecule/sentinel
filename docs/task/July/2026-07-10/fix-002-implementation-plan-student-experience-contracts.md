# Fix 002 Implementation Plan: Student Experience Contracts

**Status:** Planned  
**Date:** 2026-07-10  
**Type:** fix  
**Scope:** `sentinel-web`, `sentinel-core`, `sentinel-api`, `packages/shared`, `packages/hooks`, `packages/services`  
**Source context:** `docs/context/July/July 11/issue-for-the-student-experience.md`

## Pre-Planning

- **Summary of the task:** Restore trustworthy student examination behavior by enforcing private classroom assignment visibility, durable telemetry, correct event semantics, recoverable audio monitoring, and explicit attempt recovery across student and staff surfaces.
- **Primary bottleneck:** The system has separate assignment, telemetry, browser-lifecycle, and attempt-recovery paths without proven end-to-end invariants; local/unit success does not prove the production user flow.
- **Source files scanned:**
    - `docs/context/July/July 11/issue-for-the-student-experience.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts`
    - `packages/shared/src/exams/resolve-exam-status.ts`
    - `app/sentinel-web/src/app/(protected)/student/_lib/normalize-student-exam.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/_hooks/use-exam-list.ts`
    - `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/workers/telemetry.worker.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts`
    - `app/sentinel-web/src/workers/audio-anomaly-engine.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/`
    - `app/sentinel-web/src/features/exams/monitoring/`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/`
- **Tables/services involved:** `exams`, `exam_section_assignments`, `exam_assigned_sections`, `enrollments`, `class_groups`, `exam_attempts`, `exam_lobby_admissions`, `flagged_incidents`, telemetry settings, Redis/BullMQ ingestion queue, audio worker, student session storage, and staff monitoring queries.
- **Migration decision:** No new Prisma migration is planned. Existing columns and the existing telemetry dedupe migration are sufficient. A missing production index must be repaired by applying the existing migration; bad legacy assignment rows require a documented reversible data-remediation operation, not an untracked schema change.

## 1. The Context

Private classroom-assigned exams, proctoring telemetry, audio detection, fullscreen handling, and recovery each appear to work in isolated paths but fail as complete student-to-staff contracts. The underlying bottleneck is the absence of one verified invariant for assignment visibility, durable production telemetry, event lifecycle ordering, and attempt recovery. The immediate constraint is that production evidence is not available in the repository, so implementation must begin with diagnostic gates and must not assume the earlier frontend-status or queue hypotheses are proven.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Keep the existing data model and polling architecture; add targeted assignment-write/read parity tests, production telemetry worker checks, audio stream re-acquisition, recovery redirects, and server-side event guards only where reproduction proves a gap.
- **Tradeoff:** Leaves assignment representations and recovery state distributed, so future lifecycle features may require more defensive coordination.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Introduce a canonical exam-access resolver and explicit persisted attempt lifecycle state, standardize telemetry health/worker observability, and make list/detail/lobby/monitoring consume the same contracts.
- **Tradeoff:** Requires broader API, database, UI, and migration coordination before the student-visible result is delivered.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Move student visibility and monitoring to event-driven projections: emit assignment/attempt/incident events, materialize student exam availability and staff timelines, and use realtime transport instead of polling.
- **Tradeoff:** Adds projection consistency, replay, deployment, and operational complexity that is disproportionate while the current source-of-truth contracts remain unverified.

## 1. The Execution

**The Recommendation:** Option A — The Pragmatic Path, with the canonical contract boundaries from Option B documented as the target design.

**The Justification:** The repository already has shared student visibility predicates, existing assignment tables, Redis/BullMQ ingestion, server-side incident persistence, lobby/reconnect utilities, and focused Vitest coverage. The safest complexity budget is to prove and repair those paths first, avoiding a schema migration or new realtime dependency before production evidence identifies a need. The plan still creates explicit contracts and observability so the same unresolved behavior cannot be hidden by passing unit tests.

**Next Steps:**

1. Establish production-like reproductions and classify each failure at the database, API, browser, queue, worker, or monitoring boundary.
2. Repair the confirmed assignment, telemetry, event-ordering, audio-lifecycle, and recovery gaps using existing tables and services.
3. Verify focused tests, production-like Redis/worker behavior, authenticated manual flows, and staff-surface parity before marking the plan complete.

## Phase 0: Baseline, Diagnostics, and Stop Conditions

**Goal:** Produce reproducible evidence and prevent implementation against an unverified root cause.

- [x] Record one affected `exam_id`, `attempt_id`, and `student_user_id` in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md` without exposing credentials in the repository.
- [x] Run the visibility SQL in `docs/context/July/July 11/issue-for-the-student-experience.md` and record `is_public`, publication/status fields, both assignment representations, institution scope, and active enrollment scope in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md`.
- [x] Capture authenticated raw responses for `GET /api/exams` and `GET /api/exams/:id`; classify the visibility failure as missing database relation, missing API row, list/detail mismatch, or frontend filtering in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md`.
- [x] Capture one browser telemetry request from `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-anomaly-telemetry.ts` or the active web telemetry client, including event ID, dedupe key, attempt ID, student ID, HTTP status, and response body in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md`.
- [x] Record effective telemetry ingestion mode, telemetry settings, Redis queue/buffer stats, worker readiness/errors/stalls, and `flagged_incidents` write latency from `app/sentinel-api/src/modules/telemetry/telemetry-monitoring.controller.ts` in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md`.
- [x] Verify whether production has the existing `flagged_incidents_dedupe_key_unique` index before changing `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`.
- [ ] Capture audio phase, live-track state, model-load result, enabled anomaly types, thresholds, cooldown, and top-class/confidence diagnostics from `app/sentinel-web/src/hooks/use-audio-anomaly-worker/` for a speech/shouting reproduction.
- [ ] Capture answer-draft, stored-session, lobby-marker, attempt-status, reconnect, and admission state from `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/`, `use-exam-session`, and the lobby APIs before and after reload/network loss/audio-track termination.
- [x] Write a baseline diagnostic test in `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.test.ts` proving effective mode resolution is explicit for `sync`, `redis`, and missing-Redis fallback.
- [x] Write or update a baseline visibility test in `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts` proving the affected query path can be classified from compiled SQL and fixture data.

**Migration required:** No — diagnostics and tests use existing schema.  
**Exit condition:** Do not proceed with a code fix for a branch until its boundary classification is recorded. If production access is unavailable, mark the branch blocked in the execution log rather than claiming a root cause.

## Phase 1: Private Assigned Exam Visibility Invariant

**Goal:** Make a published private classroom-assigned exam visible only to students with a matching active enrollment, consistently across list, detail, history, lobby, and runtime access.

<!-- NOTE: The captured environment classified the original visibility report as a database-state mismatch rather than a proven write/predicate/frontend bug. The completed items below were verified with focused source inspection plus targeted tests; no new Phase 1 code mutation was required in this pass. -->

- [x] If the baseline shows missing assignment rows, update `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.ts` and `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.ts` so classroom targets persist `exam_section_assignments` transactionally and preserve rows during an `isPublic`-only update.
- [x] If the baseline shows stale legacy rows, document a reversible one-time remediation in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md` with affected exam IDs, before/after counts, and rollback SQL; do not create a new migration.
- [x] If the baseline shows a predicate mismatch, update `buildStudentExamVisibilityPredicate()` in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts` so exact classroom assignment, enrollment, institution, archived-classroom, publication, and remediation rules remain explicit and shared.
- [x] Confirm `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` and `get-exam-by-id.ts` apply the same publication and student visibility predicates for student requests.
- [x] If list/detail/runtime access diverges, update `app/sentinel-api/src/modules/examination/access/services/resolve-lobby-runtime-access.ts` and `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts` to consume the same student assignment decision rather than duplicating a weaker predicate.
- [x] Only if the raw API response contains the exam but the UI hides it, update `app/sentinel-web/src/app/(protected)/student/_lib/normalize-student-exam.ts`, `student/exam/_hooks/use-exam-list.ts`, or `student/history/_hooks/use-student-history/index.ts`; preserve `available`, `upcoming`, and `in-progress` semantics for private assignments.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.test.ts` and `update-exam.service.test.ts` for private/public classroom assignment persistence and `isPublic`-only updates.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts`, `get-exams.test.ts`, and `get-exam-by-id.test.ts` for private assigned visibility, unrelated-student rejection, archived enrollment rejection, direct assignment, and list/detail parity.
- [x] Write or update tests in `app/sentinel-web/src/app/(protected)/student/exam/_hooks/use-exam-list.test.ts`, `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts`, `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx`, and `app/sentinel-web/src/app/(protected)/student/exam/[id]/checkup/page.test.tsx` proving an API-returned private assignment is not filtered out.

**Migration required:** No — use existing assignment/enrollment tables. Repair the existing dedupe index separately if missing.  
**Breaking changes:** None expected; this narrows access to the intended assignment contract and removes the need to make an exam public as a workaround.

## Phase 2: Durable Production Telemetry Pipeline

**Goal:** Ensure accepted telemetry is either persisted or visibly failed, and that instructor/admin monitoring reflects committed incidents within the agreed target latency.

- [x] Update `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.ts` only if baseline evidence shows accepted Redis jobs or buffered batches can be lost, silently abandoned, or reported as successful without a durable outcome.
- [x] Update `app/sentinel-api/src/modules/telemetry/ingestion/workers/telemetry.worker.ts` and `telemetry-job-processor.service.ts` to expose failed/stalled/terminal outcomes with enough identifiers to reconcile a job to an attempt and event.
- [x] Add or update telemetry health response fields in `app/sentinel-api/src/modules/telemetry/telemetry-monitoring.controller.ts` so mode, queue depth, buffer depth, failed jobs, and worker availability are distinguishable from “API is reachable.”
- [x] Add a deployment/runbook note under `docs/task/2026-07-10/` documenting `pnpm --dir app/sentinel-api start:telemetry-worker`, matching `REDIS_URL`, queue/job/buffer names, database credentials, restart policy, and alert thresholds.
- [x] If batch buffering is used in production, document and test the flush path through `app/sentinel-api/src/modules/telemetry/ingestion/controllers/flush-telemetry.controller.ts`; preserve the snapshot on failed flush for recovery.
- [x] Verify the existing `20260706000000_add_telemetry_dedupe_index` migration is applied in the target database; if absent, apply that existing migration through the approved deployment process and record the result.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.test.ts` for sync persistence, Redis enqueue, missing-Redis fallback, queue stats, and batch buffering.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/ingestion/services/telemetry-job-processor.service.test.ts` and `telemetry.worker` coverage for persisted, terminal-dropped, retried, failed, and stalled outcomes.
- [x] Write or update `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.test.ts` and `get-exam-monitoring-student-detail.test.ts` proving a committed `flagged_incidents` row appears in the overview and student detail response.
- [x] Run one production-like Redis test using `app/sentinel-api/src/modules/telemetry/ingestion/workers/telemetry.worker.ts` with the worker running, then stop the worker and record queue-health failure without deleting accepted events in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md`.

**Migration required:** No new migration. The existing telemetry dedupe migration may need to be applied if the target database is missing it.  
**New environment variables:** None; existing `TELEMETRY_INGESTION_MODE`, `REDIS_URL`, queue/buffer names, and worker settings must be aligned across processes.  
**Breaking changes:** Health responses may gain additive fields; existing ingestion and monitoring endpoints remain compatible.

## Phase 3: Event Integrity and Turn-In Semantics

**Goal:** Persist credible incident semantics: genuine active-attempt events are accepted once, duplicates are predictable, and normal turn-in never creates a fullscreen violation.

- [x] Reproduce fullscreen turn-in and record whether the browser emits a payload before completion, after completion, or both.
- [x] Verify `suspendSecurityMonitoring()` ordering in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/` occurs before completion request, preview storage, route transition, and `document.exitFullscreen()`.
- [x] If ordering is incorrect, update the concrete submission hook and `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/` so suspension refs are synchronous and late listeners cannot emit.
- [x] Preserve server authority in `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.ts` by ignoring post-completion `FULL_SCREEN_EXIT` while accepting active-attempt fullscreen exits.
- [x] Verify `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` increments occurrence counts only for the documented same-rule/time-window stream and preserves first/latest event metadata.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/mappers/insert-incident.mapper.ts` only if the baseline shows the dedupe key conflates distinct events or separates exact duplicates.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx` and `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` for suspension-before-submit, active fullscreen exit, post-submit fullscreen exit, and late event suppression.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for first occurrence, exact duplicate, same-rule window aggregation, outside-window new incident, and completed-attempt suppression.
- [x] Write parity tests for `app/sentinel-web/src/features/exams/monitoring/` and `app/sentinel-core/src/features/exams/monitoring/` only where incident count, occurrence count, lifecycle, or severity presentation is changed.

**Migration required:** No — use existing attempt completion fields, incident details, and dedupe index.  
**Breaking changes:** None expected; duplicate and post-completion events become no-ops by design.

## Phase 4: Audio Lifecycle, Calibration, and Recovery

**Goal:** Make audio monitoring recoverable and make audio incidents explainable enough for instructor review.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.tsx` to expose an explicit ended-track/reacquisition state without pretending an ended `MediaStream` is live.
- [x] Update `ensureAudioAccess()` and the attempt monitoring integration under `student/exam/[id]/attempt/_hooks/` so reconnect/re-entry requests a new stream when the old track is ended, while respecting browser permission and exam configuration.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts` and `use-audio-anomaly-worker.ts` so worker initialization, model loading, stream loss, and recovery have distinct phases and recoverable user-facing errors.
- [x] Update `app/sentinel-web/src/workers/audio-anomaly-engine.ts` only when the diagnostic fixture proves incorrect frame sizing, resampling, class evaluation, cooldown, or threshold behavior.
- [x] Update `packages/shared/src/audio/yamnet-class-mapper.ts`, `packages/shared/src/audio/audio-anomaly.ts`, and related schemas only when the labeled fixture proves class IDs/defaults/thresholds are wrong; do not solve a model ambiguity by renaming `TYPING` to `TALKING`.
- [x] Add diagnostic metadata to the existing telemetry metadata path in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-anomaly-telemetry.ts` and the API mappers only if payload compatibility is preserved; include anomaly type, confidence, threshold/config version, and stream/worker phase.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.test.tsx` or the nearest provider suite for ended-track detection and permission-preserving re-acquisition.
- [x] Write tests in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` and `audio-anomaly-controller` coverage for initialization failure, recovery, suspension, one accepted event, and one telemetry request.
- [x] Write tests in `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts` and `audio-anomaly.integration.test.ts` using labeled speech, keyboard-like sound, background noise, and silence fixtures; assert configured thresholds and enabled anomaly types rather than human-intent assumptions.
- [x] Write/update `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.test.ts` and incident persistence tests for audio metadata and dedupe behavior.

**Migration required:** No — reuse existing telemetry details/metadata.  
**Breaking changes:** None expected; new diagnostic metadata is additive.

## Phase 5: Attempt Recovery and Lobby Reconciliation

**Goal:** Recover an interrupted attempt through one explicit server/client flow that preserves answers, prevents duplicate completion, and returns the student to the correct lobby/admission state.

- [x] Document the current attempt/lobby state machine and existing enums in `docs/task/2026-07-10/fix-002-execution-log-student-experience.md` before adding state names.
- [x] Update `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts`, `app/sentinel-api/src/modules/examination/lobby/lobby.service.ts`, and the relevant `app/sentinel-api/src/modules/examination/lifecycle/` service to make recovery reconciliation idempotent for reload, network loss, and power-loss re-entry.
- [x] Reuse existing answer draft/session storage in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/` and `use-exam-session` initialization, but require a server reconciliation result before resuming the attempt.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/` so missing/stale lobby markers, resumable attempts, and recovery-required attempts route deterministically to lobby rather than causing an attempt/lobby redirect loop.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/` hooks/components so instructor-gated recovery waits for admission and automatic recovery can continue only when runtime access permits it.
- [x] Ensure recovery suspends old telemetry/audio monitoring before teardown and starts fresh monitoring only after a valid attempt/lobby state and live audio stream are established.
- [x] Update instructor monitoring/lobby surfaces in `app/sentinel-web/src/features/exams/monitoring/` and administrator equivalents in `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/` to show recovery-required, lobby-waiting, approved, resumed, and terminal states using existing APIs where possible.
- [x] Write API tests in `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.test.ts`, `lobby/lobby.service.test.ts`, and the affected `lifecycle` service test for idempotent recovery, stale attempt rejection, duplicate submission prevention, lobby admission gating, and answer reconciliation.
- [x] Write web tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.test.tsx`, `lobby/_hooks/use-lobby-state.test.tsx`, `lobby/page.test.tsx`, and `attempt/_hooks/use-student-exam-attempt/index.test.tsx` for reload, missing marker, stored answer restoration, network/re-entry, and audio recovery routing.
- [x] Write staff-surface tests in `app/sentinel-web/src/features/exams/monitoring/_components/attempt-lifecycle-badge.test.tsx` and `app/sentinel-core/src/features/exams/monitoring/_components/attempt-lifecycle-badge.test.tsx` proving recovery state and telemetry state are visible consistently.

**Migration required:** No, unless implementation reveals that an explicit persisted lifecycle state cannot be represented by existing `exam_attempts` fields and enums. If that occurs, stop and create a separate schema decision before coding.  
**Breaking changes:** Avoid endpoint changes; prefer additive recovery fields and idempotent behavior.

## Phase 6: Cross-Surface Contract Validation and Release Readiness

**Goal:** Demonstrate that the complete student-to-staff flows work in a production-like environment before declaring the issue resolved.

- [x] Run focused API tests for assignment predicates, exam list/detail, create/update assignment persistence, telemetry queue/worker, incident persistence, monitoring overview, and recovery services.
- [x] Run focused web/shared tests for student list/history normalization, submission/fullscreen monitoring, audio worker/engine, session/lobby recovery, and monitoring UI.
- [x] Verify student exam list/detail role resolution ignores generic token claims such as `authenticated` and still admits real students once the database-backed student profile resolves.
- [x] Fix the mixed-role student/staff audience collision on shared exam read endpoints by adding an explicit additive student-view override (`viewer=student`) and wiring student list/detail/history consumers to use it.
- [ ] Run `pnpm format:check` and `pnpm lint`; document unrelated existing blockers without marking the plan complete.
- [ ] Manually verify private published classroom assignment appears on student exam list, available history, detail, checkup, and lobby, while unrelated students remain blocked.
- [ ] Manually verify a Redis-mode event reaches `flagged_incidents` and instructor monitoring while the worker is running; verify stopped-worker health, retry, and recovery behavior.
- [ ] Manually verify one genuine fullscreen exit is recorded, Turn In creates no fullscreen incident, exact duplicate events do not increment occurrence count, and a later same-rule event follows the documented aggregation rule.
- [ ] Manually verify speech/shouting, keyboard-like sound, background noise, disabled anomaly types, microphone denial, model-load failure, and ended-track recovery.
- [ ] Manually verify reload, network interruption, and simulated power/browser termination restore answers and elapsed time, route through lobby, respect instructor admission, and display recovery state to staff.
- [ ] Attach request traces, relevant DB/Redis query results, worker logs, screenshots, and test commands to the execution log.
- [ ] Mark each prior plan item as verified, superseded, or still open; do not copy prior `[x]` status without current evidence.

**Migration required:** No — validation only.

## Public API / Type Changes

- No endpoint path changes are planned.
- Additive exam-read query metadata is allowed when required to disambiguate shared student/staff surfaces; the implemented `viewer=student` override follows this rule and remains backward compatible because callers that omit it keep the existing behavior.
- Additive telemetry health fields are allowed for mode, queue depth, buffer depth, worker state, and failure counts.
- Additive recovery/runtime fields are allowed only if existing clients can ignore them.
- Existing exam list/detail, telemetry event, incident, lobby, and monitoring response fields must remain backward compatible.

## Environment and Deployment Changes

- No new environment variables are expected.
- Production must run `pnpm --dir app/sentinel-api start:telemetry-worker` when `TELEMETRY_INGESTION_MODE=redis`.
- API and worker must share `REDIS_URL`, `TELEMETRY_REDIS_QUEUE_NAME`, `TELEMETRY_REDIS_JOB_NAME`, `TELEMETRY_REDIS_BUFFER_NAME`, database credentials, and compatible retry/concurrency settings.
- Document worker restart policy, failed-job inspection, buffer flush procedure, and health-alert thresholds.

## Rollback Notes

- Revert application changes by workstream if a focused regression appears; preserve diagnostic logs and production queue snapshots.
- Do not delete queued telemetry during rollback. Pause consumers, inspect failed/waiting jobs, and resume with the compatible worker build.
- If audio calibration increases false positives, revert threshold/class configuration while retaining diagnostic metadata.
- If recovery routing causes loops, disable only the new recovery transition behind the existing runtime-access gate and preserve stored answer drafts.
- If legacy assignment remediation is performed, reverse only the recorded inserted/updated rows using the execution-log SQL.
- No new Prisma migration rollback is required. The existing telemetry dedupe migration must remain applied once verified.

## Out of Scope

- Replacing polling with SSE/WebSocket/realtime projections.
- Replacing YAMNet with a new machine-learning model.
- Automatic exam closure or retake policy redesign.
- New global incident severity policy unrelated to the reported event/recovery contracts.
- Broad redesign of instructor/admin monitoring layouts.

## Done Criteria

- [ ] The affected private published classroom-assigned exam is visible to the enrolled student without making it public.
- [ ] Student list, detail, history available, checkup, lobby, and runtime access use the same assignment decision.
- [ ] An accepted production-like Redis event is durably persisted and visible in instructor/admin monitoring within the agreed latency.
- [ ] Queue/worker failure is observable and recoverable; accepted events are not silently discarded.
- [ ] Genuine active-attempt events, duplicates, occurrence counts, and post-completion fullscreen events match documented semantics.
- [ ] Audio monitoring reports its actual lifecycle, re-acquires a dead stream, and produces calibrated, explainable event metadata.
- [ ] Reload, network loss, and power/browser termination preserve recoverable answers and route through the correct lobby/admission flow.
- [ ] Instructor and administrator surfaces show recovery and incident state consistently.
- [ ] Every touched source module has focused Vitest coverage, and each phase’s tests pass.
- [ ] `pnpm lint` and `pnpm format:check` are run or have documented unrelated blockers.
- [ ] No new Prisma migration was created unless a separate approved schema decision was made.
