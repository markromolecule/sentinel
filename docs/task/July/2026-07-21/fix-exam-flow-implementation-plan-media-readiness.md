# Phase 3 — Live Camera, Microphone, and MediaPipe Readiness

## Task Summary

Require actual live camera/audio tracks and completed MediaPipe initialization/calibration before first entry or reconnection can leave the lobby.

## 1. The Context

The checkup currently allows `isPersistedCheckupReady` to stand in for live device state and visually promotes required camera/microphone states to granted after reload. The lobby validates stored MediaPipe activation age but does not validate current audio/video tracks or successful runtime initialization, so attempt monitoring can begin before audio is ready.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add a fixed delay before navigating from lobby to attempt.
- **Tradeoff:** Timing does not prove readiness and behaves poorly across devices and permission failures.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Expose explicit live readiness from the existing providers, require it in checkup/lobby entry, await MediaPipe/audio warmup, and fail closed with retryable UI.
- **Tradeoff:** Provider contracts and several component tests must change together.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Move all media acquisition into the attempt and display a blocking monitoring bootstrap overlay there.
- **Tradeoff:** Violates the requested lobby reconnection gate and risks starting the exam timer before monitoring is ready.

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** The providers already own streams and workers, so explicit readiness is a small extension of the current design. It removes time-based assumptions and keeps permissions, retry, and cleanup at the preflight boundary.
- **Next Steps:**
    1. Define provider-level readiness and failure states.
    2. Make checkup/lobby entry await all required resources.
    3. Assert the attempt never mounts monitoring against missing resources.

### Phase 3: Establish a Fail-Closed Monitoring Readiness Gate

**Goal:** Required monitoring resources are live and initialized at the exact moment the attempt begins or resumes.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.tsx`, expose a JSDoc-documented readiness state that requires a live audio track and, when audio anomaly detection is enabled, a successfully created/ready worker; make concurrent `ensureAudioAccess()` calls share one promise.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider.tsx`, expose separate live-camera and landmarker readiness/errors, make `warmupMediaPipe()` awaitable and concurrency-safe, and stop treating initialization failure as a silent success.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-checkup-manager.ts`, return a single structured readiness result derived from required policy, live tracks, and initialization state; preserve camera and microphone error messages independently.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/checkup/page.tsx`, remove the branch that substitutes persisted readiness for live granted states, keep stored calibration only as reusable calibration data, and require fresh live tracks after provider remount/reconnect.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-checkup-mediapipe.ts`, accept a valid stored calibration profile only after the current camera stream and landmarker are ready; otherwise require and persist a fresh calibration.
- [x] Add a lobby readiness coordinator in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-readiness.ts` that combines privacy/checkup completion, current camera/audio tracks, MediaPipe landmarker/calibration, worker readiness, online state, and policy requirements.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`, await the readiness coordinator immediately before issuing the entry token; on track end or warmup failure, stay in the lobby and show a concrete retry action.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts`, fail closed and redirect to lobby if a required track ends or an initialized runtime becomes unavailable before/during monitoring; checkpoint answers before redirect through Phase 2's interruption contract.
- [x] Add/extend Vitest coverage in `student-exam-audio-provider.test.tsx`, `student-exam-mediapipe-provider.test.tsx`, `use-student-checkup-manager.test.tsx`, `use-checkup-mediapipe.test.tsx`, `checkup/page.test.tsx`, `lobby/_hooks/use-lobby-state.test.tsx`, and `attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.test.tsx` for slow initialization, denial, missing device, track-ended, worker failure, MediaPipe failure, retry, optional devices, and successful readiness.
      **Migration required:** No — live readiness belongs to in-memory provider state; existing session storage can retain calibration metadata without claiming a live track exists.

## Done Criteria

- [x] A persisted checkup flag alone never enables entry after reload.
- [x] Required audio/video tracks are live, and required MediaPipe/worker runtimes report ready, before navigation to attempt.
- [x] Slow initialization keeps the student in a visible pending state instead of continuing silently.
- [x] Denied or ended devices produce retryable, device-specific feedback.
- [x] Optional camera/microphone policies do not request or block on unused devices.

## Additional Considerations

- **Breaking API changes:** None.
- **New environment variables:** None.
- **Migration rollback:** Not applicable.
- **Resource ownership:** Only the providers stop their owned tracks/workers; consumers observe state and request recovery.
