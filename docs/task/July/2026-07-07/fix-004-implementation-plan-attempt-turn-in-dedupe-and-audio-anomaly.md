# Fix 004 Implementation Plan: Attempt Turn In, Event Dedupe, And Audio Anomaly

**Status:** Planned  
**Date:** 2026-07-07  
**Type:** fix  
**Scope:** `sentinel-web`, `sentinel-api`, `packages/shared`, `packages/db`

## Pre-Planning

- **Summary of the Task:** Fix three proctoring runtime issues: Turn In should not create a `FULL_SCREEN_EXIT`, first-time student event triggers should not duplicate incidents or inflate occurrence counts, and audio anomaly monitoring should flag calibrated microphone noise or speech while it says it is running.
- **Source Files Scanned:**
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `docs/task/2026-07-05/fix-003-implementation-plan-audio-event-flagging-and-exam-flow-bugs.md`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-ui-state.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.tsx`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/create-audio-graph.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-anomaly-telemetry.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx`
    - `app/sentinel-web/src/workers/audio-anomaly.worker.ts`
    - `app/sentinel-web/src/workers/audio-anomaly-engine.ts`
    - `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts`
    - `app/sentinel-web/src/workers/tests/audio-anomaly.integration.test.ts`
    - `packages/shared/src/audio/audio-anomaly.ts`
    - `packages/shared/src/audio/yamnet-class-mapper.ts`
    - `packages/shared/src/audio/yamnet-class-mapper.test.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.dto.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/rules/web-rules.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-details.utils.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/storage.constants.ts`
    - `packages/db/prisma/schema.prisma`
    - `packages/db/prisma/migrations/20260706000000_add_telemetry_dedupe_index/migration.sql`
- **Files, Services, And DB Tables To Touch:**
    - Web attempt submit flow: `use-attempt-submission.ts`, `use-attempt-ui-state.ts`, `use-attempt-monitoring.ts`, attempt page tests.
    - Web browser telemetry: `use-exam-monitoring/index.ts`, `use-interaction-listeners.ts`, `use-telemetry.ts`, web telemetry payload utilities, monitoring hook tests.
    - Web audio monitoring: `student-exam-audio-provider.tsx`, `use-audio-anomaly-worker.ts`, `audio-anomaly-controller.ts`, `create-audio-graph.ts`, `audio-anomaly.worker.ts`, `audio-anomaly-engine.ts`, audio worker and engine tests.
    - Shared audio calibration: `packages/shared/src/audio/audio-anomaly.ts`, `packages/shared/src/audio/yamnet-class-mapper.ts`, shared audio tests.
    - API telemetry persistence: `incident-writer.service.ts`, `incident-session-eligibility.service.ts`, `incident-details.utils.ts`, `ai-rules.ts`, `web-rules.ts`, `incident-persistence.service.test.ts`.
    - DB tables: `exam_attempts`, `flagged_incidents`, and the settings table that stores `audio_anomaly_config`.
- **Prisma Migration Needed:** No. `flagged_incidents` already has `dedupe_key` and the partial unique index `flagged_incidents_dedupe_key_unique`; audio configuration is already stored through existing settings, and the attempt lifecycle already records completion state in `exam_attempts`. Add a Prisma migration only if implementation proves a new durable telemetry event id or raw event audit table is required after regression tests fail under concurrency.

## 1-3-1 Options

### Option 1: Client-Side Guards Only

Patch the attempt page to suppress fullscreen telemetry during Turn In, debounce first browser events more aggressively in `use-interaction-listeners.ts`, and lower audio thresholds in shared defaults.

- **Tradeoff:** Fastest to implement, but it relies on browser timing and does not fully protect instructor data if duplicate requests reach the API.

### Option 2: End-To-End Telemetry Contract Hardening

Define deterministic client event identities, suppress submit teardown synchronously, enforce idempotency and occurrence semantics in `incident-writer.service.ts`, and calibrate the audio worker with observable runtime diagnostics and sample-rate-correct inference.

- **Tradeoff:** More work across web, API, and shared audio utilities, but it fixes the source of the data-quality issues and keeps student/instructor timelines trustworthy.

### Option 3: Unified Attempt Runtime State Machine

Replace the scattered monitoring phase, suspension, media, and submission state with one attempt runtime state machine that owns browser telemetry, audio telemetry, MediaPipe, and navigation.

- **Tradeoff:** Clean long-term direction, but too broad and risky for the current bug-fix scope.

## Best Option

Choose **Option 2: End-To-End Telemetry Contract Hardening**.

Why: The three issues are all runtime telemetry correctness problems. Existing code already has useful boundaries: `useAttemptSubmission()` owns Turn In transition, `useExamMonitoring()` and `useInteractionListeners()` own browser events, `useAudioAnomalyWorker()` owns audio detection, and `appendIncidentRecord()` owns incident persistence and occurrence counts. Hardening those contracts is more maintainable than UI-only masking and much smaller than a runtime rewrite.

**Concrete next steps:**

1. Add focused failing regressions for Turn In fullscreen suppression, first-event duplicate prevention, occurrence count semantics, and audio anomaly detection.
2. Make Turn In synchronously suspend monitoring before any route transition or fullscreen teardown can dispatch events.
3. Make client telemetry event identity deterministic per physical student action and per audio anomaly acceptance.
4. Make backend incident persistence idempotent when first-trigger duplicate requests arrive close together.
5. Add audio runtime diagnostics and sample-rate/calibration fixes so “Audio running” means audio frames can actually produce telemetry.
6. Run focused web, shared, and API Vitest suites, then perform manual QA against the student attempt and instructor monitoring pages.

## Phase 1: Regression Reproduction And Telemetry Trace Baseline

**Goal:** Capture the exact reported failures in tests and lightweight diagnostics before changing behavior.

- [x] Add a failing regression in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx` proving `handleSubmit()` suppresses `FULL_SCREEN_EXIT` even when `fullscreenchange` fires immediately after the Turn In click and before the deferred `exitFullscreen()` timer.
- [x] Add a failing regression in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` for the full attempt page flow: answer all questions, click `Turn In`, dispatch `fullscreenchange`, and assert no fullscreen telemetry, lock, or toast is produced.
- [x] Add failing regressions in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` for first `RIGHT_CLICK_ATTEMPT`, first `CLIPBOARD_ATTEMPT`, first `TAB_SWITCH`, and first `FULL_SCREEN_EXIT` emitting exactly one telemetry payload each.
- [x] Add failing regressions in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving two same-action first-trigger requests for the same `attempt_id`, `rule_key`, `platform`, and deterministic dedupe key leave one incident with `details.occurrenceCount = 1`.
- [x] Add failing regressions in `incident-persistence.service.test.ts` proving a later distinct event for the same rule updates the same incident to `details.occurrenceCount = 2` inside the configured dedupe/aggregation window.
- [x] Add a failing regression in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` proving a running worker that receives `ANOMALY_DETECTED` emits one `AUDIO_ANOMALY` telemetry request with `anomalyType`, `confidenceScore`, and no duplicate toast.
- [x] Add failing regressions in `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts` proving speech/noise-like frames trigger after the configured consecutive frame threshold and low-amplitude silence does not trigger when `SILENCE_DETECTED` is disabled.
- [x] Add a temporary development-only diagnostic object in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` that logs `hasStream`, `isStreamLive`, `hasWorker`, `audioMonitoringPhase`, and `examSessionId` only in `NODE_ENV === 'development'`.

<!-- NOTE: Phase 1 validation on 2026-07-07 captured the expected submit-ordering regression in `use-attempt-submission.test.tsx`: the new test observed `isSuspended: false` at the moment the submitting phase was entered. -->
<!-- NOTE: The focused `incident-persistence.service.test.ts` suite could not complete locally during Phase 1 because Prisma could not reach `aws-1-ap-northeast-1.pooler.supabase.com`; this is an environment connectivity blocker, not a test-assertion failure yet. -->

**Migration required:** No — this phase adds tests and development-only telemetry diagnostics.

## Phase 2: Turn In Fullscreen Exit Suppression

**Goal:** Ensure student-initiated Turn In transitions never create a fullscreen-exit incident, while real active-attempt fullscreen exits still flag normally.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts` so `proceedToTurnInReview()` calls a synchronous monitoring suspension action before `setMonitoringPhase('submitting')`, `setIsRedirectingToTurnIn(true)`, `writeStoredExamTurnInPreview()`, `router.replace()`, or `document.exitFullscreen()`.
- [x] Update `use-attempt-submission.ts` so `document.exitFullscreen()` is skipped when monitoring was not successfully suspended, and log a development-only warning for that impossible state.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts` to expose a stable `suspendSecurityMonitoring()` implementation that updates `isMonitoringSuspendedRef.current` immediately, not only after React state/effect propagation.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` so `handleFullscreenChange()` exits before telemetry when `monitoringPhase.current` is `submitting`, `navigating-to-turn-in`, or `suspended`, and add a single `isSubmitTeardown` helper if the condition is repeated.
- [x] Update `use-interaction-listeners.ts` so fullscreen suppression does not suppress real active-attempt exits when `monitoringPhase.current === 'active'` and `isMonitoringSuspended.current === false`.
- [x] Write or update `use-attempt-submission.test.tsx` for ordering: suspension ref update, preview write, route replace, deferred fullscreen exit.
- [x] Write or update `use-exam-monitoring.test.ts` for immediate `fullscreenchange` after suspension and active fullscreen exit still emitting `FULL_SCREEN_EXIT`.
- [x] Write or update `attempt/page.test.tsx` for the screenshot path where the student is in fullscreen, clicks `Turn In`, the button enters `Preparing...`, and no `FULL_SCREEN_EXIT` appears.

**Migration required:** No — this phase changes frontend runtime ordering only.

## Phase 3: First-Trigger Browser Event Dedupe

**Goal:** Make each physical browser-security action produce one telemetry request and one reviewable incident on first trigger.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts` or the existing telemetry metadata helper so browser security events can include a deterministic `dedupeKey` derived from `examSessionId`, `eventType`, a normalized action source, and a short time bucket.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` so `registerClipboardIncident()` marks the event timestamp before any `preventDefault()` path can invoke both `keydown` and `copy/cut/paste` handlers for the same physical action.
- [x] Update `use-interaction-listeners.ts` so `blockContextMenu`, `registerFocusIncident`, `handleFullscreenChange`, and print-screen handling all reuse a shared burst guard helper with event-specific windows: clipboard/right-click/print-screen `800ms`, fullscreen `1000ms`, focus `1000ms`.
- [x] Update `use-interaction-listeners.ts` so each accepted action passes the deterministic `dedupeKey` into `emitTelemetryEvent()` and duplicate burst attempts return before generating a new metadata object.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts` so the emitted payload preserves `metadata.dedupeKey`, `metadata.eventId`, and `metadata.clientActionAt` without regenerating conflicting ids downstream.
- [x] Write or update `use-exam-monitoring.test.ts` proving one right-click creates one telemetry call, two right-click DOM events inside `800ms` create one telemetry call, and a second right-click after the burst window creates one additional telemetry call with a distinct dedupe key.
- [x] Write or update `use-exam-monitoring.test.ts` proving one copy shortcut plus one `copy` event from the browser still creates one `CLIPBOARD_ATTEMPT`.
- [x] Write or update web telemetry client tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client.test.ts` proving deterministic metadata is preserved in the ingestion payload.

**Migration required:** No — this phase uses the existing optional `dedupe_key` persistence field.

## Phase 4: Backend Incident Idempotency And Occurrence Semantics

**Goal:** Ensure duplicate first-trigger requests cannot create duplicate instructor timeline rows or incorrectly show `x2`.

- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts` so duplicate `metadata.dedupeKey` requests return the existing incident result or `null` without calling `updateExistingIncident()` and without incrementing `occurrenceCount`.
- [x] Update `incident-writer.service.ts` so the fallback path after a unique constraint violation re-queries by `attempt_id`, `rule_key`, `platform`, and `dedupe_key` first, then falls back to latest matching incident only when `dedupe_key` is absent.
- [x] Update `incident-writer.service.ts` so `findExistingIncidentWithinWindow()` ignores incidents with the same dedupe key as the current payload when deciding whether to increment occurrences.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-details.utils.ts` only if `getNextOccurrenceCount()` can interpret malformed details as `2` on the first accepted event; otherwise leave it unchanged.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.ts` only if `FULL_SCREEN_EXIT` can still persist after `exam_attempts.completed_at` is set or lifecycle state is complete.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for duplicate same dedupe key returning one row with `occurrenceCount = 1`.
- [x] Write or update `incident-persistence.service.test.ts` for two distinct dedupe keys inside the aggregation window returning one row with `occurrenceCount = 2`.
- [x] Write or update `incident-persistence.service.test.ts` for concurrent first-trigger writes with the same dedupe key and assert one row after `Promise.all()`.
- [x] Write or update `incident-persistence.service.test.ts` for completed-attempt `FULL_SCREEN_EXIT` rejection while active-attempt `FULL_SCREEN_EXIT` persists.

<!-- NOTE: Phase 4 verified that `incident-details.utils.ts` and `incident-session-eligibility.service.ts` already satisfied the required semantics, so they were reviewed and left unchanged. -->

**Migration required:** No — the partial unique index on `flagged_incidents(attempt_id, rule_key, platform, dedupe_key)` already exists. Rollback note: if a migration becomes necessary, rollback must drop only the new index/column created for this fix and preserve existing incident rows.

## Phase 5: Audio Runtime Signal Path And Sample Rate Calibration

**Goal:** Make audio anomaly detection observable and capable of producing incidents from real microphone speech/noise.

- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/create-audio-graph.ts` to include the `audioContext.sampleRate` in the callback payload or controller state so the worker knows whether samples are 16 kHz, 44.1 kHz, or 48 kHz.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/_types.ts` to add a typed `AudioFramePayload` containing `samples` and `sampleRate`.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts` so `PROCESS_AUDIO` sends both samples and sample rate to `audio-anomaly.worker.ts`.
- [x] Update `app/sentinel-web/src/workers/audio-anomaly.worker.ts` so `PROCESS_AUDIO` passes `sampleRate` into `AudioAnomalyEngine.processAudioChunk()`.
- [x] Update `app/sentinel-web/src/workers/audio-anomaly-engine.ts` to resample incoming audio to the 16 kHz YAMNet frame expectation before filling the `EXPECTED_SAMPLES = 15600` buffer.
- [x] Add a small exported helper with JSDoc in `audio-anomaly-engine.ts` or a colocated `resample-audio.ts` that linearly resamples `Float32Array` PCM from the browser sample rate to `16000`.
- [x] Update `audio-anomaly-engine.ts` to compute RMS after resampling and expose development-only debug values for `rms`, `topClassIds`, top class scores, selected anomaly confidence, frame counters, and cooldown status.
- [x] Update `packages/shared/src/audio/audio-anomaly.ts` only after test evidence shows defaults are too strict; proposed first calibration is `TALKING: 0.45`, `BACKGROUND_NOISE: 0.55`, and `consecutiveFrameThreshold: 2`, subject to worker tests and manual QA.
- [x] Update `packages/shared/src/audio/yamnet-class-mapper.ts` only if bundled YAMNet labels prove the current class ids for speech/noise/typing/tapping are wrong.
- [x] Add an RMS fallback in `audio-anomaly-engine.ts` for `BACKGROUND_NOISE` only when RMS exceeds a calibrated threshold for consecutive frames and YAMNet confidence remains below class threshold.
- [x] Write or update `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts` for 48 kHz input resampling into a 16 kHz YAMNet-sized frame.
- [x] Write or update `audio-anomaly-engine.test.ts` for `TALKING` confidence triggering at calibrated thresholds after the required consecutive frames.
- [x] Write or update `audio-anomaly-engine.test.ts` for RMS fallback triggering `BACKGROUND_NOISE` when class scores are low but amplitude is high.
- [x] Write or update `app/sentinel-web/src/workers/tests/audio-anomaly.integration.test.ts` for worker `INIT`, `START_DETECTION`, `PROCESS_AUDIO`, and one `ANOMALY_DETECTED` message.
- [x] Write or update `packages/shared/src/audio/yamnet-class-mapper.test.ts` for any changed thresholds or YAMNet class mappings.

<!-- NOTE: Phase 5 review found no evidence that the bundled YAMNet class ids were wrong, so `yamnet-class-mapper.ts` was intentionally left unchanged while its tests were updated for the calibrated defaults. -->

**Migration required:** No — this phase changes browser processing and shared calibration constants only.

## Phase 6: Audio Telemetry Persistence And Monitoring Timeline Display

**Goal:** Ensure detected audio anomalies produce one student warning and one instructor-visible timeline item with accurate occurrence metadata.

- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts` so `onAnomaly` returns early when `isSuspendedRef.current` is true before showing a toast or calling telemetry.
- [x] Update `use-audio-anomaly-worker.ts` so one worker message with multiple anomaly entries emits one telemetry request per anomaly type, but repeated identical worker messages inside the configured cooldown do not bypass engine cooldown by remounting the hook.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-anomaly-telemetry.ts` so audio events include a deterministic `dedupeKey` based on `examSessionId`, `AUDIO_ANOMALY`, `anomalyType`, and a cooldown-aligned time bucket.
- [x] Update `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts` only if above-threshold audio metadata does not immediately produce a persistable event.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/storage.constants.ts` only if `AUDIO_DETECTED` copy, severity, or rule mapping is missing `AUDIO_ANOMALY` metadata.
- [x] Update instructor timeline mapping only if `app/sentinel-web/src/features/exams/monitoring/_components/flagging-timeline.tsx` does not show `anomalyType`, `confidenceScore`, and `occurrenceCount` for audio flags.
- [x] Write or update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` for one toast, one telemetry request, suspended suppression, and deterministic audio dedupe key.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.test.ts` for above-threshold `TALKING` and `BACKGROUND_NOISE` producing `AUDIO_DETECTED`.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for first audio anomaly `occurrenceCount = 1` and repeated distinct audio anomaly `occurrenceCount = 2`.
- [x] Write or update `app/sentinel-web/src/features/exams/monitoring/_components/flagging-timeline.test.tsx` for audio anomaly label, confidence copy, and `x2` only when occurrence count is actually `2`.

<!-- NOTE: Phase 6 review confirmed `ai-rules.ts`, `storage.constants.ts`, and `flagging-timeline.tsx` already supported the required audio persistence and display semantics, so those files were intentionally left unchanged while their tests and upstream telemetry contracts were strengthened. -->

**Migration required:** No — audio anomaly metadata already fits inside telemetry metadata and incident details.

## Phase 7: Validation And Manual QA

**Goal:** Confirm the fix with focused automated suites and the exact student/instructor scenario from the screenshots.

- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx' 'src/app/(protected)/student/exam/[id]/attempt/page.test.tsx'`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts' 'src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client.test.ts'`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx src/workers/tests/audio-anomaly-engine.test.ts src/workers/tests/audio-anomaly.integration.test.ts`.
- [x] Run `pnpm --dir packages/shared exec vitest run --passWithNoTests src/audio/yamnet-class-mapper.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/ingestion/rules/ai-rules.test.ts src/modules/telemetry/storage/services/incident-persistence.service.test.ts`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/features/exams/monitoring/_components/flagging-timeline.test.tsx`.
- [ ] Run `pnpm lint` after focused suites pass.
- [ ] Run `pnpm format:check` after implementation files are formatted.
- [ ] Manually verify active fullscreen exit during an attempt still flags `FULL_SCREEN_EXIT`.
- [ ] Manually verify clicking `Turn In` from fullscreen does not create `FULL_SCREEN_EXIT`, does not lock the attempt, and proceeds to the result page.
- [ ] Manually verify first right-click shows one student warning and one instructor timeline item with no `x2` badge.
- [ ] Manually verify first clipboard attempt shows one student warning and one instructor timeline item with `occurrenceCount = 1`.
- [ ] Manually verify a second separate right-click or clipboard action increments the same incident to `x2`.
- [ ] Manually verify “Audio running” plus audible speech/noise produces one `Audio Anomaly Detected` toast and one instructor `AUDIO_DETECTED` timeline item after the configured frame threshold.
- [ ] Manually verify repeated continuous audio does not spam incidents inside cooldown.

<!-- NOTE: `pnpm lint` failed outside this fix scope because `packages/db` resolves `eslint` as missing (`sh: eslint: command not found`) before the rest of the repo can complete linting. -->
<!-- NOTE: `pnpm format:check` failed outside this fix scope because Prettier reported existing style drift across 93 files, many unrelated to this telemetry/audio change set. -->
<!-- NOTE: Manual QA was retried after fixing the web login role resolver. The seeded student credential (`josephdump6@gmail.com`) now signs into `sentinel-web` successfully and the seeded instructor credential (`cianessevielle@gmail.com`) signs into the protected instructor dashboard successfully. A real in-progress attempt was confirmed in the database for exam `b2db60e8-9e26-43b3-b6c2-d52de8f99fb7` / attempt `c83444bb-7ef8-438e-ade3-8a408d71120c`, and the protected instructor monitoring overview plus student detail route loaded correctly, showing existing `Fullscreen Exit Detected` and `Background Noise detected x6` timeline items. The remaining student-side manual checks are still blocked because `/student/exam` currently shows `No exams found`, and directly opening the historical in-progress attempt loops on `Loading exam flow...` / redirects back to lobby without exposing a usable live attempt surface for fresh fullscreen, turn-in, right-click, clipboard, or audio trigger actions. -->

**Migration required:** No — validation does not require schema changes.

## Public API / Type Changes

- No endpoint path changes are planned.
- Telemetry ingestion payload remains compatible; it will more consistently include `metadata.dedupeKey`, `metadata.eventId`, and `metadata.clientActionAt`.
- Worker-internal audio frame messages may gain a `sampleRate` field, but this is not a public API.
- Audio incident metadata should continue to use existing `anomalyType` and `confidenceScore` fields.

## Breaking API Changes

- None expected.

## New Environment Variables

- None expected.

## Migration Rollback Note

- No Prisma migration is planned. If implementation later proves that a schema change is unavoidable, add a dedicated migration with a matching rollback note that removes only the newly introduced telemetry index/column and preserves existing `flagged_incidents` data.
