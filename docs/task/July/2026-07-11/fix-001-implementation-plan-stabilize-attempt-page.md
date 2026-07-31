# Implementation Plan — Stabilize the Student Attempt Page

> **Task summary:** stabilize attempt-page monitoring so each physical action produces one correctly classified and counted occurrence, detector feedback is timely and testable, turn-in produces no false fullscreen incident, mobile backgrounding is persisted, screenshot limitations are explicit, and passage rendering is covered by representative fixtures.

## 1. The Context

The attempt page has several symptoms across independent layers: detector classification and latency, client event emission, API deduplication/aggregation, submission teardown, platform-specific browser capabilities, and passage rendering. The existing code already has dedupe keys, database serialization, occurrence aggregation, detector thresholds, and turn-in guards, so the main bottleneck is the absence of a single correlation trail and deterministic cross-layer tests that identify where a physical action is delayed, suppressed, duplicated, or aggregated.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Patch the visible defects directly by lowering audio and gaze thresholds, emitting mobile visibility changes through the current telemetry callback, and adding a turn-in delay before fullscreen exit.
- **Tradeoff:** Fastest implementation, but threshold changes may hide pipeline defects, mobile events would retain desktop semantics, and duplication would remain difficult to diagnose.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Preserve the existing architecture and aggregation model, add development-only correlation diagnostics and deterministic contract tests, then implement narrowly scoped fixes for mobile event semantics, submission ordering, audio selection/latency, gaze stability, and passage rendering.
- **Tradeoff:** Requires more test and diagnostic work before user-visible tuning, but produces measurable behavior and reduces regression risk across web and API workspaces.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Replace direct detector-to-API calls with a client-side event journal that assigns sequence numbers, persists events locally, batches delivery, and reconciles acknowledgements from the API.
- **Tradeoff:** Provides strong offline and ordering guarantees, but introduces a new telemetry paradigm, recovery states, storage cleanup, and significantly more scope than the current defects require.

## 1. The Execution

**The Recommendation:** Option B — The Strategic Path.

**The Justification:** It fits the existing hook, worker, shared-runtime, and API service boundaries without adding dependencies or changing the database model. It preserves the established meaning of one aggregated incident row with `occurrenceCount` for distinct occurrences, while making every stage observable and independently testable before tuning detector behavior.

**Next Steps:**

1. Add correlation diagnostics and lock the occurrence/deduplication contract with tests.
2. Harden turn-in ordering and implement canonical mobile `APP_BACKGROUNDING` emission.
3. Calibrate audio and gaze behavior with deterministic fixtures, then complete passage and platform validation.

---

## Pre-Planning Notes and Decisions

- Preserve the current persistence contract: repeated distinct occurrences of the same rule inside the server window aggregate into one `flagged_incidents` row and increment `details.occurrenceCount`; the same logical action with the same `dedupeKey` does not increment it.
- Use `APP_BACKGROUNDING` as the canonical mobile lifecycle event. Do not remap mobile backgrounding to desktop `TAB_SWITCH`.
- Treat browser screenshot shortcut monitoring as best effort. Do not claim that browser JavaScript can guarantee detection or prevention of operating-system screenshots.
- Preserve configured downward-gaze behavior; do not globally classify downward reading as an incident.
- Do not retrain or manually edit `public/models/yamnet/model.json` during this plan. Change model assets only if recorded fixtures prove that class mapping and runtime tuning cannot meet agreed targets.
- Use development-only structured diagnostics; do not expose debug payloads or raw media data in production.
- Passage work is limited to runtime projection and responsive behavior. Passage authoring and upload changes remain outside this plan.

## Impacted Files, Services, and Data

### Sentinel Web

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_types/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-passage.tsx`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx`
- `app/sentinel-web/src/workers/audio-anomaly-engine.ts`
- `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts`
- `app/sentinel-web/src/workers/tests/audio-anomaly.integration.test.ts`
- `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv` (validation only unless fixture evidence requires mapping changes)

### Shared Packages

- `packages/shared/src/audio/audio-anomaly.ts`
- `packages/shared/src/audio/yamnet-class-mapper.ts`
- `packages/shared/src/mediapipe/analysis.ts`
- `packages/shared/src/mediapipe/calibration.ts`
- `packages/shared/src/mediapipe/runtime.ts`
- Co-located Vitest files under `packages/shared/src/audio/` and `packages/shared/src/mediapipe/`
- `packages/shared/src/schema/telemetry/telemetry-schema.ts`

### Sentinel API

- `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.dto.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-details.utils.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-session-eligibility.service.test.ts`

### Database tables

- `exam_attempts`: read and row-locked during telemetry eligibility/persistence.
- `flagged_incidents`: inserted or updated for accepted events; existing `dedupe_key` unique index remains unchanged.

**Migration required:** No — the existing `dedupe_key`, JSON incident details, event schema, and unique index support the selected approach. No Prisma model or SQL migration should be created.

---

## Phase 1: Establish Correlated Event Diagnostics

**Goal:** Make one physical action traceable from browser detection through API persistence without storing raw audio, video, or landmarks.

- [x] Add an exported `MonitoringEventTrace` type and development-only trace writer in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/monitoring-event-trace.ts`; include detector source, event type/subtype, `eventId`, `dedupeKey`, detection time, emission time, and disposition, and add JSDoc to every exported symbol.
- [x] Extend `createTelemetryActionMetadata()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.ts` to keep one stable correlation identity for all browser signals belonging to the same configured action bucket.
- [x] Update `useTelemetry()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts` to record `suppressed`, `emitting`, `accepted`, and `failed` stages only when `NODE_ENV === 'development'`.
- [x] Add a structured API diagnostic helper in `app/sentinel-api/src/modules/telemetry/storage/services/incident-telemetry-diagnostics.ts` and call it from `appendIncidentRecord()` for `inserted`, `aggregated`, and `duplicate-ignored` dispositions without logging student media or secrets.
- [x] Write `monitoring-event-trace.test.ts` beside the new client utility to verify production no-op behavior and stable structured development output.
- [x] Extend `action-metadata.test.ts` and `use-exam-monitoring.test.ts` to prove duplicate DOM signals in one action bucket share a dedupe identity while later physical actions receive a new identity.
- [x] Extend `incident-persistence.service.test.ts` to assert the diagnostic disposition and resulting count for insert, same-key duplicate, distinct-key aggregation, request retry, and concurrent first writes.

**Migration required:** No — diagnostics use existing event metadata and persistence results.

### Phase 1 Verification

- [ ] Run `pnpm --dir app/sentinel-web test --run` and confirm the correlation and monitoring tests pass.
- [x] Run `pnpm --dir app/sentinel-api test --run` and confirm the persistence concurrency and dedupe tests pass.
- [ ] In a development attempt, perform one right-click and verify one correlation identity reaches an `inserted` or `aggregated` API disposition.

<!-- NOTE: Focused Phase 1 web tests pass. Full sentinel-web suite currently has pre-existing unrelated failures outside the Phase 1 file list. Focused DB-backed sentinel-api telemetry persistence verification passes after moving the new concurrency case onto the standalone DB pattern already used in this file. -->

---

## Phase 2: Lock the Occurrence and Deduplication Contract

**Goal:** Guarantee that duplicate delivery is ignored and each later distinct action increments the aggregated incident exactly once.

- [x] Extract and export a pure action-burst acceptance utility from `use-interaction-listeners.ts` into `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-burst.ts`, with JSDoc defining inclusive/exclusive bucket boundaries.
- [x] Update `useInteractionListeners()` to use the shared burst utility for clipboard, focus, fullscreen, print-screen, and right-click events while retaining separate per-event-type state.
- [x] Update `findExistingIncidentWithinWindow()` and duplicate-key handling documentation in `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts` so code comments explicitly distinguish duplicate delivery from aggregation of a later occurrence.
- [x] Update `buildIncidentDetails()` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-details.utils.ts` only if tests show that latest event metadata overwrites the stored correlation identity incorrectly; retain the cumulative `occurrenceCount` as the authoritative count.
- [x] Add `action-burst.test.ts` beside the utility covering two browser signals inside one burst, the exact boundary, distinct event types, and a later accepted action.
- [x] Extend `use-exam-monitoring.test.ts` to cover React Strict Mode remount behavior and verify listener cleanup prevents parallel emissions.
- [x] Extend `incident-persistence.service.test.ts` to prove identical `dedupeKey` requests leave `occurrenceCount` unchanged and distinct keys inside/outside the aggregation window increment or create rows according to the existing contract.

**Migration required:** No — retain the current `flagged_incidents_dedupe_key_unique` index and JSON occurrence details.

### Phase 2 Verification

- [x] Run the focused web telemetry and API persistence Vitest files.
- [ ] Verify the monitoring timeline shows one incident row with the expected `occurrenceCount` after three distinct actions and does not increment after replaying one request.

---

## Phase 3: Make Turn-In Teardown Atomic

**Goal:** Ensure monitoring is synchronously suspended before submission, fullscreen exit, or navigation can generate teardown telemetry.

- [x] Refactor `proceedToTurnInReview()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts` so `setMonitoringPhase('submitting')` occurs before calling `suspendSecurityMonitoring()`, writing preview state, routing, or scheduling fullscreen exit.
- [x] Keep `isMonitoringSuspendedRef` and `monitoringPhaseRef` synchronized immediately in `useExamMonitoring()` and ensure `suspendSecurityMonitoring()` is idempotent in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts`.
- [x] Preserve the active-attempt behavior in `handleFullscreenChange()` so a genuine fullscreen exit still emits `FULL_SCREEN_EXIT` and locks the exam.
- [x] Preserve completed-session rejection in `checkTelemetrySessionEligibility()` and document why post-completion `FULL_SCREEN_EXIT` is ignored while other recently completed telemetry follows the grace-period policy.
- [x] Extend `use-attempt-submission.test.tsx` to dispatch `fullscreenchange` synchronously during submission, after `router.replace()`, and after the zero-delay fullscreen callback; assert no telemetry emission in all teardown cases.
- [x] Extend `use-exam-monitoring.test.ts` to verify active fullscreen exits still emit once and all submitting/navigation/suspended phases suppress them.
- [x] Extend `incident-session-eligibility.service.test.ts` to verify late and retried completed-attempt fullscreen requests remain silent and do not reach persistence.

**Migration required:** No — lifecycle ordering and eligibility behavior only.

### Phase 3 Verification

- [x] Run the focused submission, monitoring, and session-eligibility tests.
- [ ] Complete an attempt in Chrome and Safari while fullscreen is active and verify no post-submit `FULL_SCREEN_EXIT` trace or count change.

---

## Phase 4: Emit Canonical Mobile Backgrounding Telemetry

**Goal:** Persist exactly one `APP_BACKGROUNDING` occurrence for each supported mobile foreground-to-background transition.

- [x] Generalize `useTelemetry()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts` so it does not reject all mobile emissions; instead validate whether the requested event is supported for the detected platform.
- [x] Add a mobile telemetry payload builder in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts` that emits `platform: MOBILE` and `eventType: APP_BACKGROUNDING` using the shared schema.
- [x] Update `registerFocusIncident()` and `handleVisibilityChange()` in `use-interaction-listeners.ts` so mobile `document.hidden` produces one `APP_BACKGROUNDING` action with a stable dedupe key and warning toast, while desktop continues to emit `TAB_SWITCH`.
- [x] Do not emit a second background occurrence from the accompanying `window.blur`; use the existing burst/correlation utility to collapse the transition.
- [x] Update API ingestion DTO/rule routing only if the existing `APP_BACKGROUNDING` mobile contract is not accepted by `ingestion.dto.ts` and the configured mobile rule.
- [x] Extend `web-telemetry-client.test.ts` for the mobile platform payload and event enablement contract.
- [x] Extend `use-exam-monitoring.test.ts` with mobile user-agent cases for visibility-only, blur-plus-visibility, return-to-foreground, and a second later background transition.
- [x] Extend the relevant API ingestion rule test beside `app/sentinel-api/src/modules/telemetry/ingestion/rules/mobile-rules.ts` to prove `APP_BACKGROUNDING` is accepted and persisted once.

**Migration required:** No — `APP_BACKGROUNDING` and mobile platform values already exist in the shared telemetry schema.

### Phase 4 Verification

- [x] Run focused web monitoring, payload, ingestion-rule, and persistence tests.
- [ ] Validate on real iOS Safari/PWA and Android Chrome/PWA: background once, return, and confirm one accepted occurrence for the transition.

---

## Phase 5: Make Audio Classification and Latency Deterministic

**Goal:** Ensure enabled audio types are classified from the correct YAMNet scores and produce a toast and telemetry event within an agreed, measurable latency budget.

- [x] Add labeled, synthetic score fixtures for `TALKING`, `TYPING`, `TAPPING`, `MOUTH_BREATHING`, `BACKGROUND_NOISE`, silence, and mixed classifications under `app/sentinel-web/src/workers/tests/fixtures/`; store scores or generated PCM only, not recorded student audio.
- [x] Add an exported pure trigger-decision utility in `packages/shared/src/audio/audio-anomaly-trigger.ts` that accepts confidence, threshold, consecutive-frame state, and cooldown state; include JSDoc and keep anomaly-type policy explicit.
- [x] Refactor `AudioAnomalyEngine.runInference()` in `app/sentinel-web/src/workers/audio-anomaly-engine.ts` to use the trigger-decision utility and attach capture-window and inference timestamps to worker debug snapshots.
- [x] Update the worker/controller message types in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/_types.ts` so development diagnostics can calculate capture-to-toast latency without changing the production telemetry contract.
- [x] Update `AudioAnomalyController.handleMessage()` and `useAudioAnomalyWorker()` to preserve the same selected anomaly type, confidence, and detection timestamp from worker result through toast and `emitAudioTelemetry()`.
- [x] Remove redundant hook-level cooldown suppression only if fixture tests prove the engine already provides the required per-type cooldown guarantee; otherwise document which layer owns noise suppression versus network retry protection.
- [x] Change `YAMNET_CLASS_IDS_BY_ANOMALY_TYPE`, thresholds, or `consecutiveFrameThreshold` in `packages/shared/src/audio/audio-anomaly.ts` only when the fixture matrix demonstrates a specific false positive, false negative, or latency breach.
- [x] Add tests beside `audio-anomaly-trigger.ts` for threshold boundaries, consecutive frames, per-type counters, cooldown expiration, and mixed types.
- [x] Extend `audio-anomaly-engine.test.ts` for resampling, buffer-window timing, enabled-type filtering, mixed speech/typing selection, and counter reset after a non-qualifying frame.
- [x] Extend `use-audio-anomaly-worker.test.tsx` and `audio-anomaly.integration.test.ts` to prove toast subtype, persisted subtype, confidence, and timestamp all come from the same worker detection and are not released by a later unrelated sound.

**Migration required:** No — audio settings and anomaly metadata already fit existing schemas.

### Phase 5 Verification

- [x] Run shared audio, worker, hook, and integration Vitest suites.
- [x] Record fixture results in `docs/testing/attempt-monitoring-audio-matrix.md`, including enabled types, top class IDs, confidence, result, and latency.
- [ ] If real speech still fails after mapping and threshold validation, create a separate model-evaluation task rather than replacing `model.json` in this change.

---

## Phase 6: Stabilize Gaze Classification and Dispatch

**Goal:** Detect sustained off-screen gaze within the configured duration plus one frame interval while preserving centered, low-confidence, and permitted downward-reading behavior.

- [x] Add landmark fixtures for center, left, right, up, down, closed eyes, viewport edges, partial face, and low confidence under `packages/shared/src/mediapipe/tests/fixtures/`.
- [x] Refactor any duplicated gaze-boundary calculations in `packages/shared/src/mediapipe/calibration.ts` and `analysis.ts` into exported pure helpers with JSDoc, without changing thresholds until fixture outcomes are recorded.
- [x] Update `evaluateMediaPipeSignalDispatch()` in `packages/shared/src/mediapipe/runtime.ts` only if tests show intermittent low-confidence frames incorrectly erase a sustained off-screen interval; make any allowed grace behavior explicit and bounded by frame count or milliseconds.
- [x] Keep the attempt duration clamp in `use-mediapipe-runtime-thresholds.ts`, and expose the resolved confidence threshold, duration, frame interval, calibration state, and downward-gaze policy through development diagnostics.
- [x] Update `useMediapipeCameraRuntime()` to preserve detection and emission timestamps in correlation diagnostics and reset tracker state only on an actual centered/no-signal transition or session/runtime teardown.
- [x] Add or extend co-located tests for `analysis.ts`, `calibration.ts`, and `runtime.ts` covering every landmark fixture, threshold boundary, one-frame interruption, repeat behavior, and configured downward-gaze tolerance.
- [x] Extend `use-attempt-mediapipe-monitoring/index.test.tsx` to verify sustained signal timing equals the resolved duration plus no more than one frame interval and emits one incident.

**Migration required:** No — MediaPipe settings and incident metadata already support the required behavior.

### Phase 6 Verification

- [x] Run shared MediaPipe and attempt monitoring Vitest suites.
- [ ] Record real-device results for glasses/no glasses and normal/low light in `docs/testing/attempt-monitoring-gaze-matrix.md` without storing student-identifying images.

<!-- NOTE: Focused Phase 6 MediaPipe verification passes with `pnpm --dir packages/shared test --run src/mediapipe/analysis.test.ts src/mediapipe/calibration.test.ts src/mediapipe/runtime.test.ts` and `pnpm --dir app/sentinel-web test --run src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/index.test.tsx`. Real-device glasses/lighting matrix remains pending. -->

---

## Phase 7: Formalize Best-Effort Screenshot Monitoring

**Goal:** Correctly detect keyboard events delivered by supported browsers without claiming guaranteed operating-system screenshot prevention.

- [x] Extract exported `detectScreenCaptureShortcut()` from `use-interaction-listeners.ts` into `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/screen-capture-shortcut.ts` with JSDoc and explicit macOS/Windows key combinations.
- [x] Update `handleKeyDown()` to call the pure detector and preserve one `PRINT_SCREEN_ATTEMPT` per accepted action burst.
- [x] Keep `preventDefault()` as best-effort behavior and update the toast copy in `use-interaction-listeners.ts` so it says the shortcut was detected/logged rather than guaranteeing that capture was blocked.
- [x] Add `screen-capture-shortcut.test.ts` for `PrintScreen`, `Cmd+Shift+3/4/5`, `Meta+Shift+S`, near misses, repeat events, and mobile exclusion.
- [x] Extend `use-exam-monitoring.test.ts` to prove delivered shortcut events emit once and lock only when the configured rule is enabled.
- [x] Create `docs/testing/attempt-monitoring-platform-compatibility.md` documenting which tested browser/OS combinations deliver each shortcut and which are intercepted by the operating system.

**Migration required:** No — existing `PRINT_SCREEN_ATTEMPT` telemetry is retained.

### Phase 7 Verification

- [x] Run focused shortcut and monitoring tests.
- [ ] Manually execute the compatibility matrix on Chrome/Edge Windows and Chrome/Safari macOS, recording observed event delivery rather than inferred support.

<!-- NOTE: Focused Phase 7 verification passes with `pnpm --dir app/sentinel-web test --run src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/screen-capture-shortcut.test.ts` and `pnpm --dir app/sentinel-web test --run src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts`. The manual browser/OS compatibility matrix remains pending. -->

---

## Phase 8: Verify and Harden Passage Projection

**Goal:** Render passage content consistently across question changes, content types, panel states, and supported viewport sizes.

- [x] Add runtime fixtures for no passage, plain/rich text, image content, long content, and malformed/empty content beside `exam-attempt-runtime-passage.tsx` tests.
- [x] Add `exam-attempt-runtime-passage.test.tsx` beside `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-passage.tsx` to verify title, body, image, sanitization boundary, empty state, and panel visibility.
- [x] Update `ExamAttemptRuntimePassage` only where fixture tests identify incorrect projection, unsafe markup handling, overflow, or missing responsive classes.
- [x] Update `attempt-view.tsx` so passage scrolling remains independent and does not hide question navigation or answer controls at supported desktop and mobile breakpoints.
- [x] Extend `attempt/page.test.tsx` and `use-student-exam-attempt/index.test.tsx` to navigate between questions with and without passages and verify panel state and current content do not leak from the previous question.
- [ ] Add expected desktop and mobile screenshots to `docs/testing/attempt-passage-rendering-matrix.md` after product/design approval; keep the checklist blocked until those fixtures are approved.

**Migration required:** No — runtime rendering consumes existing passage fields.

### Phase 8 Verification

- [x] Run passage component, attempt hook, and attempt page Vitest suites.
- [ ] Verify long rich text and image passages at desktop and mobile viewports against the approved rendering matrix.

<!-- NOTE: Focused Phase 8 verification passes with `pnpm --dir app/sentinel-web test --run src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-passage.test.tsx`, `pnpm --dir app/sentinel-web test --run src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx`, and `pnpm --dir app/sentinel-web test --run src/app/(protected)/student/exam/[id]/attempt/page.test.tsx`. Screenshot approval and viewport matrix validation remain pending. -->

---

## Phase 9: Cross-Layer Regression and Release Readiness

**Goal:** Prove the stabilized attempt page satisfies event integrity and detector behavior across supported environments without breaking active monitoring.

- [ ] Add an integration scenario to `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` covering active monitoring, one browser incident, one audio incident, one gaze incident, submission, and teardown.
- [ ] Extend `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` with a mixed-event attempt proving counts remain isolated by `rule_key`, platform, and dedupe key.
- [ ] Run `pnpm --dir app/sentinel-web test --run` and resolve only failures introduced by this task.
- [ ] Run `pnpm --dir app/sentinel-api test --run` and resolve only failures introduced by this task.
- [ ] Run `pnpm lint`, `pnpm format:check`, and the affected workspace builds.
- [ ] Complete the browser/device matrix from the context document and attach anonymized correlation traces for failures.
- [ ] Update this plan’s checkboxes and verification notes during implementation, following `.agents/workflows/to-do-workflow.md`.

**Migration required:** No — verification and release documentation only.

### Phase 9 Verification

- [ ] Confirm one physical action produces one accepted occurrence and duplicate delivery does not increment it.
- [ ] Confirm a later distinct action increments the existing aggregated incident exactly once.
- [ ] Confirm audio toast and persisted subtype/timestamp match the same detection.
- [ ] Confirm sustained gaze emits within configured duration plus one frame interval.
- [ ] Confirm normal turn-in creates no fullscreen occurrence after submission starts.
- [ ] Confirm mobile backgrounding persists one `APP_BACKGROUNDING` occurrence per transition.
- [ ] Confirm screenshot documentation states best-effort browser support.
- [ ] Confirm approved passage fixtures render correctly on desktop and mobile.

---

## Breaking Changes, Configuration, and Rollback

- **Breaking API changes:** None planned. Mobile payload construction must use the existing telemetry schema and endpoint.
- **New environment variables:** None.
- **New dependencies:** None planned.
- **Prisma migration:** Not required.
- **Migration rollback:** Not applicable because no schema change is planned. If implementation reveals an unavoidable schema requirement, stop and create a separate migration plan with forward SQL, data backfill, and rollback SQL before changing Prisma.
- **Behavioral rollback:** Revert mobile `APP_BACKGROUNDING` emission independently if device testing shows duplicate lifecycle events; retain diagnostics and tests. Revert threshold/mapping changes independently if fixture false positives exceed the approved target.
- **Privacy:** Diagnostics must exclude raw microphone samples, images, video frames, facial landmarks, access tokens, and personally identifying content.

## Done Criteria

- [ ] Every accepted browser, audio, gaze, and mobile occurrence has a traceable correlation identity and API disposition in development.
- [ ] Duplicate delivery with the same `dedupeKey` does not change `occurrenceCount`.
- [ ] Later distinct actions follow the documented aggregation contract and increment exactly once.
- [ ] Audio and gaze fixture matrices meet approved accuracy and latency targets.
- [ ] Submission teardown cannot emit or persist a false `FULL_SCREEN_EXIT`.
- [ ] Mobile backgrounding emits canonical `APP_BACKGROUNDING` telemetry exactly once per transition.
- [ ] Screenshot behavior and limitations are documented from observed browser/OS testing.
- [ ] Passage fixtures pass component, navigation, and responsive rendering validation.
- [ ] Every phase has at least one concrete Vitest task and an explicit migration decision.
- [ ] All new exported functions have JSDoc, and inline comments are limited to non-obvious policy or timing logic.
- [ ] Focused tests, affected workspace tests, lint, formatting, and builds pass.
