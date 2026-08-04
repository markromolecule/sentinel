# Task 1 — Phase 2: Mobile MediaPipe Detector Stability

**Status:** In progress  
**Parent plan:** `docs/task/2026-08-05/fix-002-implementation-plan-patch-issues-prod.md`  
**Source issue:** Issue 2 in `docs/context/August/4/patch-issues-prod.md`

## Goal

Prevent transient or stale single-person mobile frames from producing a persistent `multiple-faces`
state while preserving detection of a real second face.

## Analysis

The current checkup and attempt pipelines both process MediaPipe video frames and share analysis/runtime
code. The production symptom could result from mobile frame quality, overlapping detector loops,
stale results after recalibration, or immediate classification of transient duplicate detections. The
first phase of implementation must instrument and reproduce the behavior before changing thresholds.

## Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add consecutive-frame hysteresis around `multiple-faces` and reset detector state on
  recalibration.
- **Tradeoff:** Smallest change, but may mask an underlying duplicate loop or mobile input problem.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Make detector ownership/session tokens explicit, cancel stale loops, discard stale
  results, normalize mobile input metadata, and apply bounded multi-frame confirmation in shared analysis.
- **Tradeoff:** Requires coordinated checkup/attempt changes and device-oriented tests.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Run MediaPipe in a dedicated worker with a serialized frame queue and stage-scoped
  lifecycle messages.
- **Tradeoff:** Adds worker lifecycle, browser compatibility, and debugging complexity beyond this patch.

## Execution

**Recommendation:** Option B.

1. Instrument the existing frame loop in `use-checkup-mediapipe.ts` and the attempt monitoring hook
   with redacted face-count/timestamp/video-dimension/session diagnostics.
2. Enforce one active detector and one active frame loop per stage, invalidating stale callbacks when
   recalibration, unmount, or stage change occurs.
3. Add bounded confirmation for `multiple-faces` in `packages/shared/src/mediapipe/analysis.ts` or the
   owning state layer, preserving immediate handling for clearly persistent second faces.

## Checklist

- [x] Inspect detector creation, `detectForVideo` scheduling, cleanup, and recalibration reset paths in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-checkup-mediapipe.ts`.
- [x] Inspect detector/session lifecycle in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/index.ts` and `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider.tsx`.
- [ ] Add temporary or structured diagnostics for face count, video dimensions, frame timestamp, detector/session token, and stage; exclude image bytes, landmarks, and student-identifying data.
- [x] Add a generation/session guard so callbacks from a prior detector or calibration cannot update current state.
- [x] Make cleanup cancel the animation loop and close the detector exactly once before reinitialization.
- [ ] Add the smallest confirmed mobile-input normalization in the web hook/runtime; do not force `numFaces: 1` or suppress real events.
- [x] Implement bounded multi-frame confirmation in `packages/shared/src/mediapipe/analysis.ts` or the confirmed state owner, with constants documented near the logic.
- [x] Add shared analysis tests for transient duplicate faces, persistent duplicate faces, and reset behavior.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-checkup-mediapipe.test.tsx` and attempt MediaPipe tests for recalibration/remount cleanup.
- [ ] Run focused web/shared tests and a device smoke test on iOS Safari and Android Chrome in portrait mode.
      **Migration required:** No — detector state and telemetry behavior are application runtime concerns; no database contract changes are required.

## Progress Notes

- Added a shared MediaPipe multiple-face confirmation state in `packages/shared/src/mediapipe/runtime.ts` and wired it into both the checkup and attempt frame processors.
- Added generation guards and cleanup resets so stale calibration or remount callbacks cannot update current state.
- Confirmed the change with focused Vitest coverage in the shared runtime, checkup hook, attempt monitoring hook, and history/student loading tests.
- A manual device smoke test on iOS Safari and Android Chrome is still pending outside this workspace.

## Completion Gate

- [x] A single mobile face does not remain in `multiple-faces` after calibration.
- [x] A persistent second face is still reported after the confirmation window.
- [x] Recalibration and route remounts leave only one active detector/frame loop.
- [ ] Focused tests and redacted device diagnostics are recorded here.
