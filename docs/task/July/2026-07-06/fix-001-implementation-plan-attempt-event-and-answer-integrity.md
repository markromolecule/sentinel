# Attempt Event And Answer Integrity Implementation Plan

## Task Summary

Fix the student attempt experience by preventing answer-key exposure, making telemetry event counts idempotent, suppressing false fullscreen events during intentional transitions, restoring attempt audio anomaly monitoring, and formalizing configurable lifecycle policies for automatic closure, retakes, and makeup windows.

## Pre-Planning

- [x] Read and summarize the task input in one sentence: protect attempt integrity by closing answer leaks and aligning proctoring event/lifecycle behavior with actual student actions.
- [x] Scan relevant source files to understand existing patterns:
    - `docs/context/July/issues-event-attempt.md`
    - `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.service.ts`
    - `app/sentinel-web/src/features/exams/_components/engine/question-renderer/*`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/*`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/*`
    - `app/sentinel-api/src/modules/telemetry/ingestion/*`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/*`
    - `app/sentinel-api/src/modules/examination/lifecycle/*`
- [x] Identify files, services, and DB tables touched:
    - API services: `getExamDetail`, `mapExamDetailResponse`, telemetry ingestion/persistence, lifecycle policy resolution, makeup/retake grant services.
    - Frontend hooks/components: student attempt monitoring hooks, question renderers, audio anomaly hook/controller, web telemetry payload utilities.
    - Shared contracts: `packages/shared/src/types/exams/exam.ts`, `packages/shared/src/schema/telemetry/telemetry-schema.ts`, exam configuration schemas.
    - DB tables: `flagged_incidents`, `exam_attempts`, `exam_configurations`, `student_exam_access_overrides`, `exam_attempt_lifecycle_events`.
- [x] Determine if a Prisma migration is needed: Yes, add a durable uniqueness guard for `flagged_incidents.dedupe_key` so server idempotency remains correct under concurrent duplicate telemetry posts.

## 1-3-1 Options

### Option 1: Minimal Hotfix

Patch the visible answer placeholders, extend existing client burst guards, suppress fullscreen during submit, and add audio diagnostics without changing contracts or database constraints.

**Tradeoff:** Fastest delivery, but it leaves answer keys in the student API payload and does not fully protect telemetry from duplicate concurrent posts.

### Option 2: Contract-First Integrity Fix

Introduce student-safe question mapping, telemetry event identifiers with server idempotency, submit-aware fullscreen suppression, audio stream recovery, and configurable lifecycle policies using existing configuration JSON plus a small dedupe index migration.

**Tradeoff:** More work than a hotfix, but it directly addresses root causes while fitting the current API/service/hook patterns.

### Option 3: Full Proctoring Event Ledger Refactor

Create a separate raw telemetry event ledger, store every emitted event independently, derive incidents asynchronously, and rebuild occurrence counts from the ledger.

**Tradeoff:** Most scalable long-term model, but it is a broad architecture change with larger migration, backfill, and reporting risks.

## Best Option

Choose **Option 2: Contract-First Integrity Fix**.

It is the best fit because the investigation found true API contract leakage, not just rendering bugs, and duplicate event accuracy needs server-side idempotency rather than only client-side debounce. This option keeps the existing `exam_configurations`, telemetry ingestion, lifecycle, and renderer structure, adds only one targeted DB migration for reliable dedupe, and avoids a large event-ledger rewrite before the current attempt flow is stable.

## Concrete Next Steps

1. Implement student-safe exam question mapping and renderer placeholder fixes.
2. Add telemetry `eventId` / `dedupeKey` contracts and server idempotency with a unique partial index.
3. Make fullscreen monitoring phase-aware so submit/turn-in transitions do not log false `FULL_SCREEN_EXIT` events.
4. Add attempt audio anomaly recovery and `AudioContext` resume handling.
5. Move automatic close thresholds into exam configuration and enforce lifecycle eligibility for retake/makeup windows.
6. Run focused Vitest suites for API services, controllers, hooks, renderers, and telemetry persistence.

## Phase 1: Student-Safe Question Payloads

**Goal:** Ensure student attempt APIs and runtime renderers cannot expose answer keys.

- [x] Add exported JSDoc-documented helper `sanitizeQuestionForStudentAttempt(question: ExamQuestion): ExamQuestion` in `app/sentinel-api/src/modules/examination/exams/services/student-question-sanitizer.service.ts`.
- [x] In `sanitizeQuestionForStudentAttempt`, remove `content.correctAnswer`, `content.correctBoolean`, and `content.acceptedAnswers` for student responses.
- [x] In `sanitizeQuestionForStudentAttempt`, convert `FILL_BLANK` content to neutral `blanks` placeholders or a count-only representation that preserves the number of inputs without answer values.
- [x] In `sanitizeQuestionForStudentAttempt`, convert `MATCHING` content so `pairs[].right` is not returned to students; keep `pairs[].left` and add neutral answer slots or shuffled public choices only if existing renderer support is updated in this phase.
- [x] In `sanitizeQuestionForStudentAttempt`, convert `ENUMERATION` content so item count is preserved without returning accepted answer strings.
- [x] Call `sanitizeQuestionForStudentAttempt` only in the `studentUserId` branch of `getExamDetail` in `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`, after shuffle/randomize logic and before `mapExamDetailResponse`.
- [x] Keep instructor/admin exam detail responses unchanged in `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`.
- [x] Update `FillBlankQuestion` in `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/fill-blank-question.tsx` to use neutral placeholders when `showCorrectAnswer` is false.
- [x] Update `MatchingQuestion` in `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/matching-question.tsx` to use neutral placeholders when `showCorrectAnswer` is false.
- [x] Update `EnumerationQuestion` in `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/enumeration-question.tsx` so runtime field count works with sanitized content.
- [x] Write `app/sentinel-api/src/modules/examination/exams/services/student-question-sanitizer.service.test.ts` covering `MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `FILL_BLANK`, `MATCHING`, `ENUMERATION`, and `ESSAY`.
- [x] Extend or add `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.test.ts` to assert student responses are sanitized and instructor responses still include answer keys.
- [x] Add renderer tests under `app/sentinel-web/src/features/exams/_components/engine/question-renderer/` for `FillBlankQuestion`, `MatchingQuestion`, and `EnumerationQuestion` runtime placeholders.

**Migration required:** No — this phase changes API mapping and frontend rendering over existing exam question JSON only.

## Phase 2: Telemetry Event Idempotency

**Goal:** Guarantee one logical student action creates one telemetry occurrence even if the browser or network submits duplicates.

- [x] Extend telemetry metadata contracts in `packages/shared/src/schema/telemetry/telemetry-schema.ts` with optional `eventId`, `dedupeKey`, and `clientActionAt` fields under `telemetryMetadataSchema`.
- [x] Mirror the metadata contract in `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.dto.ts` by relying on the shared telemetry metadata shape.
- [x] Update `BuildWebTelemetryPayloadArgs` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_types.ts` to accept optional `eventId` and `dedupeKey`.
- [x] Update `buildWebTelemetryPayload` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts` to attach `metadata.eventId`, `metadata.dedupeKey`, and `metadata.clientActionAt`.
- [x] Add a small helper `createTelemetryActionMetadata(eventType: WebTelemetryEventType)` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.ts`.
- [x] Update `useTelemetry.emitTelemetryEvent` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts` to generate and pass action metadata once per logical event.
- [x] Update `use-interaction-listeners.ts` to keep existing burst guards but pass the generated metadata through the single `emitTelemetryEvent` call path for `TAB_SWITCH`, `CLIPBOARD_ATTEMPT`, `RIGHT_CLICK_ATTEMPT`, `PRINT_SCREEN_ATTEMPT`, and `FULL_SCREEN_EXIT`.
- [x] Update `buildTelemetryIncidentInsertShape` in `app/sentinel-api/src/modules/telemetry/storage/mappers/insert-incident.mapper.ts` to prefer `payload.metadata.dedupeKey` for `incident.dedupeKey`.
- [x] Update `IncidentPersistenceService.appendEvent` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` to check `flagged_incidents.dedupe_key` before incrementing `occurrenceCount`; exact duplicate `dedupeKey` should no-op instead of incrementing.
- [x] Add a Prisma migration under `packages/db/prisma/migrations/` that creates a unique partial index on `flagged_incidents(attempt_id, rule_key, platform, dedupe_key)` where `dedupe_key is not null`.
- [x] Add rollback SQL notes in the migration README or plan execution notes to drop the unique partial index if needed.
- [x] Update `packages/db/prisma/schema.prisma` only if Prisma can represent the chosen index without losing the partial condition; otherwise document the raw SQL index in the migration file.
- [x] Write `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.test.ts`.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` for first-event duplicate sequences: `keydown` plus `paste`, `visibilitychange` plus `blur`, repeated `contextmenu`, and repeated `fullscreenchange`.
- [x] Extend `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` to prove duplicate `dedupeKey` leaves `occurrenceCount = 1` and a later distinct `dedupeKey` increments to 2.
- [x] Extend `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.dto.test.ts` to accept the new metadata fields and reject malformed values.

**Migration required:** Yes — add a unique partial index for `flagged_incidents.dedupe_key` to make idempotency safe under concurrent duplicate requests. Rollback is dropping that index; no data column rollback is required because `dedupe_key` already exists.

## Phase 3: Fullscreen Submit And Minimize Classification

**Goal:** Prevent intentional submit/navigation flows from being logged as fullscreen violations while preserving active-exam fullscreen enforcement.

- [x] Add exported type `AttemptMonitoringPhase` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/_types.ts` with values `active`, `submitting`, `navigating-to-turn-in`, and `suspended`.
- [x] Update `UseExamMonitoringArgs` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/_types.ts` to accept `monitoringPhase?: AttemptMonitoringPhase`.
- [x] Update `useExamMonitoring` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts` to derive `isMonitoringSuspendedRef` from `monitoringPhase` and existing `isMonitoringSuspended`.
- [x] Update `useAttemptMonitoring` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` to pass `monitoringPhase` based on `isRedirectingToTurnIn`.
- [x] Update `useAttemptSubmission` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts` to set the monitoring phase to `submitting` before opening turn-in navigation or exiting fullscreen.
- [x] Update `handleFullscreenChange` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` to ignore fullscreen exits when phase is `submitting`, `navigating-to-turn-in`, or `suspended`.
- [x] Keep active exam behavior in `handleFullscreenChange`: when phase is `active`, emit `FULL_SCREEN_EXIT`, lock with `fullscreen-exit`, and show the existing warning.
- [x] Add a policy comment in `handleVisibilityChange` clarifying that minimize/window-hidden remains a visibility/focus event and is not silently remapped to fullscreen exit.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` for submit/turn-in fullscreen exit suppression.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` to assert active fullscreen exits still emit and suspended/submitting exits do not.

**Migration required:** No — this phase changes client monitoring state and tests only.

## Phase 4: Attempt Audio Anomaly Recovery

**Goal:** Make audio anomaly monitoring reliably start or recover during the attempt route after checkup permission succeeds.

- [x] Add exported JSDoc-documented helper `isLiveAudioStream(stream: MediaStream | null): boolean` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.tsx`.
- [x] Extend `StudentExamAudioContextValue` in `student-exam-audio-provider.tsx` with `ensureAudioAccess(configuration: ExamConfiguration): Promise<void>` that reuses a live stream or calls `requestAudioAccess`.
- [x] Update `useAttemptMonitoring` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` to call `ensureAudioAccess` when mic/audio anomaly are enabled and no live audio stream exists.
- [x] Update `createAudioGraph` in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/create-audio-graph.ts` to call `audioContext.resume()` when the created context starts in `suspended` state.
- [x] Update `AudioAnomalyController.start` in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts` to report a specific recoverable error when no live tracks are available.
- [x] Update `useAudioAnomalyWorker` in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts` to include `runtimeConfig` in the lifecycle effect dependencies or document why controller config syncing is sufficient after startup.
- [x] Add guarded development-only diagnostics in `useAttemptMonitoring` for `audioStream` live state, worker presence, `examSessionId`, and audio phase without logging secrets or noisy production output.
- [x] Extend `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` for provided live stream startup, missing stream recovery, and suspended `AudioContext.resume()`.
- [x] Add or extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` to verify attempt monitoring requests/reuses audio after checkup.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` to show recoverable audio warning when stream recovery fails.

**Migration required:** No — this phase changes browser media handling and tests only.

## Phase 5: Configurable Automatic Close Policy

**Goal:** Replace the hard-coded automatic close threshold with exam configuration while preserving the current default behavior.

- [x] Extend `ExamConfiguration` in `packages/shared/src/types/exams/exam.ts` with `automaticClosePolicy` fields: `enabled`, `highIncidentThreshold`, `windowMinutes`, `useOccurrenceCount`, and `immediateCloseEventTypes`.
- [x] Extend shared exam configuration schemas in `packages/shared/src/schema/exams/*` to validate `automaticClosePolicy` with defaults matching the current constant: enabled, 3 HIGH incidents, 15 minutes.
- [x] Update API configuration mapping in `app/sentinel-api/src/modules/examination/configuration/services/map-exam-configuration-state.ts` to read/write `automaticClosePolicy` from existing configuration JSON.
- [x] Update configuration save logic in `app/sentinel-api/src/modules/examination/configuration/services/save-exam-configuration.ts` to persist validated `automaticClosePolicy`.
- [x] Update instructor/admin exam configuration UI in `app/sentinel-core/src/features/exams/config/_components/ai-rules-section.tsx` or the owning exam rules component to expose automatic close toggles, threshold count, window minutes, occurrence-count mode, and immediate-close event type choices.
- [x] Update `resolveAutomaticLifecyclePolicy` in `app/sentinel-api/src/modules/examination/lifecycle/services/resolve-automatic-lifecycle-policy.ts` to read the attempt exam configuration and apply the configured threshold.
- [x] Update `resolveAutomaticLifecyclePolicy` to support both incident-row counting and summed `details.occurrenceCount` when `useOccurrenceCount` is true.
- [x] Update `resolveAutomaticLifecyclePolicy` to close immediately when the triggering event type is included in `immediateCloseEventTypes`.
- [x] Keep `AUTOMATIC_ATTEMPT_CLOSE_POLICY` in `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.constants.ts` as the fallback default only.
- [x] Add JSDoc to any new exported policy resolver helpers in `resolve-automatic-lifecycle-policy.ts`.
- [x] Extend `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for default automatic close compatibility and configured thresholds.
- [x] Add `app/sentinel-api/src/modules/examination/lifecycle/services/resolve-automatic-lifecycle-policy.test.ts` for row-count mode, occurrence-count mode, disabled policy, and immediate-close events.
- [x] Extend existing configuration tests in `app/sentinel-api/src/modules/examination/configuration/configuration.test.ts` and `app/sentinel-core/src/features/exams/config/_components/exam-rules-section.test.tsx`.

**Migration required:** No — store policy in the existing exam configuration JSON shape; no new table or column is needed.

## Phase 6: Retake And Makeup Eligibility Rules

**Goal:** Enforce clear lifecycle eligibility for reopen, retake, and makeup windows after exam end-date policy is finalized.

- [x] Add exported JSDoc-documented helper `assertRemediationWindowEligibility` in `app/sentinel-api/src/modules/examination/lifecycle/services/remediation-window-eligibility.service.ts`.
- [x] In `assertRemediationWindowEligibility`, require `availableUntil > availableFrom` for both makeup and retake windows.
- [x] In `assertRemediationWindowEligibility`, require retake `sourceAttemptId` to reference an attempt for the same `examId` and `studentId`.
- [x] In `assertRemediationWindowEligibility`, reject retake grants unless the source attempt lifecycle is `SUBMITTED`, `CLOSED`, or `FINALIZED` equivalent according to the existing lifecycle state model.
- [x] In `assertRemediationWindowEligibility`, reject makeup grants for students who already have an active non-superseded attempt unless product policy explicitly allows a makeup over an in-progress attempt.
- [x] Add a single product-policy constant in `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.constants.ts` for whether makeup/retake grants require `exam.end_date_time` to have passed.
- [x] Call `assertRemediationWindowEligibility` from `grantMakeupExamWindow` in `app/sentinel-api/src/modules/examination/lifecycle/services/grant-makeup-exam-window.ts`.
- [x] Call `assertRemediationWindowEligibility` from `grantRetakeExamWindow` in `app/sentinel-api/src/modules/examination/lifecycle/services/grant-retake-exam-window.ts`.
- [x] Update `grantMakeupExamWindowBodySchema` and `grantRetakeExamWindowBodySchema` in `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.dto.ts` only for request-shape validation that can be done without DB access.
- [x] Update report action queue copy in `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-view.tsx` if the finalized policy requires after-end-date grants only.
- [x] Extend `app/sentinel-api/src/modules/examination/lifecycle/services/grant-makeup-exam-window.test.ts`.
- [x] Extend `app/sentinel-api/src/modules/examination/lifecycle/services/grant-retake-exam-window.test.ts`.
- [x] Extend `app/sentinel-api/src/modules/examination/lifecycle/lifecycle.routes.test.ts` for 409 responses from ineligible grants.
- [x] Extend `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/index.test.tsx` for surfaced eligibility failures.

**Migration required:** No — this phase uses existing `exam_attempts`, `student_exam_access_overrides`, `exam_attempt_lifecycle_events`, and remediation schedule tables.

## Phase 7: Cross-App Validation And Release Readiness

**Goal:** Verify the integrity fixes across API, student attempt UI, instructor/core configuration, and support telemetry views.

- [x] Run focused API tests with `pnpm --dir app/sentinel-api exec vitest run` for exam detail, telemetry ingestion/storage, lifecycle, and configuration test files touched above.
- [x] Run focused web tests with `pnpm --dir app/sentinel-web exec vitest run` for question renderers, attempt page, attempt monitoring, telemetry client, and audio anomaly tests touched above.
- [x] Run focused core tests with `pnpm --dir app/sentinel-core exec vitest run` for exam configuration UI tests touched above.
- [x] Run shared package tests with `pnpm --dir packages/shared test` or focused Vitest command for telemetry/exam schema tests touched above.
- [x] Run `pnpm lint` after implementation to catch cross-workspace TypeScript/ESLint issues.
- [x] Manually verify a student attempt flow with `FILL_BLANK`, `MATCHING`, `ENUMERATION`, and `MULTIPLE_RESPONSE` questions to confirm answer keys are absent from visible UI and network payloads.
- [x] Manually verify duplicate browser actions produce accurate toasts and support/instructor occurrence counts.
- [x] Manually verify submit/turn-in does not create `FULL_SCREEN_EXIT`, while deliberate active fullscreen exit still does.
- [x] Manually verify audio anomaly reaches `running` during attempt with mic and audio anomaly enabled.
- [x] Manually verify configured automatic close thresholds and retake/makeup eligibility errors in instructor workflows.

**Migration required:** No — validation only; the required telemetry dedupe index migration is owned by Phase 2.

## Breaking API Changes

- Student `GET /exams/:id` responses will stop returning answer-key fields inside `questions[].content`; this is an intentional security fix.
- Instructor/admin exam detail responses should remain unchanged.
- Telemetry ingestion will accept additional optional metadata fields; existing clients remain compatible.

## New Environment Variables

- [ ] None expected.

## Migration Rollback Note

- [ ] Phase 2 migration rollback should drop only the unique partial index on `flagged_incidents(attempt_id, rule_key, platform, dedupe_key)` where `dedupe_key is not null`.
- [ ] Do not drop `flagged_incidents.dedupe_key`; the column already exists and may contain historical data.
- [ ] Before applying the unique index, add a migration precheck or cleanup step for existing duplicate non-null dedupe keys if any exist.

## Done Criteria

- [x] Student attempt API payloads no longer include answer-key fields for objective question types.
- [x] Runtime renderers do not display answer-key placeholders when `showCorrectAnswer` is false.
- [x] One logical student action produces one toast and one persisted occurrence.
- [x] Duplicate telemetry posts with the same dedupe key do not increment `occurrenceCount`.
- [x] Submit/turn-in fullscreen transitions do not log `FULL_SCREEN_EXIT`.
- [x] Active deliberate fullscreen exits still lock/log according to exam settings.
- [x] Audio anomaly monitoring starts or presents a recoverable warning during attempt.
- [x] Automatic close policy is configurable and defaults to the current 3 HIGH incidents within 15 minutes behavior.
- [x] Retake and makeup grants follow the finalized lifecycle eligibility policy.
- [x] All touched exported functions have JSDoc.
- [x] Focused Vitest suites and lint pass or have documented pre-existing unrelated failures.
