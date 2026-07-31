# Telemetry Duplication and Audio Anomalies Implementation Plan

## 1. The Context

The student attempt route mounts `useStudentExamAttempt()` in both `page.tsx` and `attempt-view.tsx`, so every browser-security listener and audio-monitoring controller is registered twice; this duplicates toasts and telemetry, and leaves one monitoring instance active when the other suspends itself for turn-in. Audio startup is additionally fragile because `MonitoringPreloader` only warms the shared anomaly worker when `micRequired` is true, even though `audio_anomaly_detection` can independently require the audio pipeline; the server-side `AudioAnomalyRule` repeat threshold is intentional and is outside the required change.

**Task summary:** Refactor the student attempt UI to consume one shared `useStudentExamAttempt()` result and warm the audio anomaly worker whenever anomaly detection is enabled, with regression coverage for listener ownership, turn-in suspension, and worker warmup.

**Affected scope:**

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.test.tsx` (new)
- Existing regression suites to run without changing their production contracts:
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.test.tsx`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx`

**Services and database tables:** No backend service or database table changes; `AudioAnomalyRule` and its configured confidence/repeat behavior remain unchanged.

**Breaking API changes:** None outside the route-local component boundary. `AttemptView` gains a required route-local `attempt` prop, and its only production caller is updated in the same change.

**New environment variables:** None.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Move the sole `useStudentExamAttempt()` call to `AttemptView` and make `page.tsx` render the view without owning loading or blocked-state decisions.
- **Tradeoff:** This avoids duplicate monitoring quickly but forces loading and access gating into the view, weakening the existing page-level route boundary and making the component responsible for unrelated states.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Keep `page.tsx` as the single hook owner, pass the complete typed hook result into `AttemptView`, and independently harden `MonitoringPreloader` so the shared worker is warmed whenever audio anomaly detection is enabled.
- **Tradeoff:** Passing the full hook return object creates a broad route-local prop contract that must be updated if the hook return shape changes.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Introduce an attempt-state React context provider that instantiates `useStudentExamAttempt()` once and lets both the page gate and nested view consume the same context value.
- **Tradeoff:** A provider adds indirection, runtime misuse cases, and test setup overhead for a value currently shared by only one parent-child pair.

## 1. The Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** It preserves the current page-level loading and blocked-state architecture while establishing one explicit owner for all attempt state and monitoring side effects. The route-local prop is simpler to trace and test than a new context, requires no dependency or backend change, and directly eliminates the duplicate `AudioContext`, worker listener, toast, telemetry, and fullscreen listener lifecycles within the available complexity budget.

### Phase 1: Establish One Attempt Hook Owner

**Goal:** Ensure one mounted student attempt page creates exactly one attempt state and monitoring lifecycle.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx`, assign the complete `useStudentExamAttempt()` return value to `attempt`, retain loading and blocked-state branching against that value, pass it to `<AttemptView attempt={attempt} />`, and add JSDoc to the modified exported page component.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`, export a documented `AttemptViewProps` type whose `attempt` field is `ReturnType<typeof useStudentExamAttempt>`, accept that prop, destructure the existing view fields from it, remove the internal hook call, and add JSDoc to the modified exported component.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx`, add a regression assertion that rendering the active attempt invokes the mocked security, MediaPipe, and audio monitoring integrations once rather than twice.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx`, extend the turn-in test to verify the single monitoring owner calls `suspendSecurityMonitoring()` once before the turn-in transition and does not produce a fullscreen lock from an independently active instance.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/attempt/page.test.tsx'` and confirm loading, blocked, answering, and submission rendering still pass through the new prop boundary.

**Migration required:** No — this phase changes only route-local React ownership and tests.

### Phase 2: Harden Audio Worker Warmup

**Goal:** Guarantee the shared audio anomaly worker is available whenever the anomaly rule is enabled, independently of the microphone-required gate.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.tsx`, change the audio warmup condition to call `warmupAudioAnomaly()` whenever `configuration.aiRules?.audio_anomaly_detection` is true, while leaving microphone permission acquisition under the existing audio provider/attempt monitoring flow.
- [x] Create `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.test.tsx` with mocked `useCheckupAudio()` and `useStudentExamMediaPipeStream()` hooks, and verify audio warmup occurs for `audio_anomaly_detection: true` with both `micRequired: true` and `micRequired: false`.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.test.tsx`, verify audio warmup does not occur when anomaly detection is false and confirm the existing camera/face-detection MediaPipe warmup condition remains unchanged.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.test.tsx'` and confirm each configuration invokes each warmup function exactly once or zero times as specified.

**Migration required:** No — worker initialization is client-only and uses the existing provider-owned worker.

### Phase 3: Verify Monitoring and Telemetry Regressions

**Goal:** Demonstrate that the unified lifecycle preserves audio telemetry behavior and removes the reported duplicate and turn-in anomalies.

- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.test.tsx' 'src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx'` to verify attempt orchestration, shared stream/worker use, one toast per anomaly callback, suspension, and telemetry emission remain intact.
- [x] Run `pnpm --dir app/sentinel-web test` to catch route-level or shared frontend regressions, then run `pnpm --dir app/sentinel-web lint` and `pnpm format:check` to validate repository style and static quality requirements.
- [x] Manually start an exam with clipboard, right-click, fullscreen, and audio anomaly monitoring enabled; trigger one copy action and one right-click action and confirm each produces exactly one client toast and one network telemetry request.
- [x] Manually select **Turn In**, proceed to review, and confirm the intentional fullscreen exit produces no `FULL_SCREEN_EXIT` request, security lock, or persisted incident.
- [x] Manually test audio anomaly detection with `micRequired` disabled and `audio_anomaly_detection` enabled; confirm the preloaded worker reaches the running phase, a qualifying talking/noise detection shows exactly one `Audio Anomaly Detected` toast, sends one `AUDIO_ANOMALY` request, and appears once in instructor monitoring when it satisfies the existing server confidence/repeat policy.
- [x] Record browser console and network evidence for the manual checks, distinguishing a successfully emitted but policy-suppressed low-confidence event from a client pipeline failure; do not change `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts` unless a separate policy requirement is approved.

**Migration required:** No — validation covers existing client and server contracts without schema mutation.

## Next Steps

1. Update `page.tsx` and `attempt-view.tsx` to make the page the sole `useStudentExamAttempt()` owner and lock the invariant with page-level tests.
2. Update `monitoring-preloader.tsx` and add its co-located Vitest suite for anomaly-enabled configurations regardless of `micRequired`.
3. Run the focused and workspace validation commands, then complete the duplication, fullscreen turn-in, and audio persistence manual scenarios.

## Done Criteria

- [x] The mounted attempt route calls `useStudentExamAttempt()` exactly once and `AttemptView` consumes the passed typed result.
- [x] One monitored browser action produces one warning toast and one telemetry request.
- [x] Turn-in suspends the only security monitoring instance before fullscreen exits and produces no `FULL_SCREEN_EXIT` anomaly.
- [x] Audio anomaly worker warmup depends on `audio_anomaly_detection`, not `micRequired`.
- [x] A qualifying audio detection produces one client toast and one telemetry request, while server persistence continues to follow the existing confidence/repeat policy.
- [x] All modified exported functions and types have JSDoc, and inline comments are limited to non-obvious lifecycle decisions.
- [x] Focused Vitest suites, the sentinel-web test suite, lint, and formatting checks pass.
- [x] No Prisma migration, rollback operation, environment variable, or backend API change is required.

## Migration Rollback Note

No migration is planned, so no database rollback is necessary. If the frontend refactor must be reverted, revert the page-to-view prop handoff and preloader condition together with their regression tests; no persisted data cleanup is required.
