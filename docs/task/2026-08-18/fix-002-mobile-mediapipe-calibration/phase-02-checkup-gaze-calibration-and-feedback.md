---
title: "Phase 2: Live Checkup Gaze Calibration, Candidate Evaluation & Feedback"
type: phase
parent: "fix-002-mobile-mediapipe-calibration"
phase: "02"
status: planned
created: "2026-08-18"
tags: [task, phase, mobile, mediapipe, calibration, checkup]
---

# Phase 2: Live Checkup Gaze Calibration, Candidate Evaluation & Feedback

## Objective

Replace the simulated `setInterval` / mock-landmarks timer in `use-exam-checkup.ts` with real-time frame evaluation using `@sentinel/shared` `evaluateMediaPipeCalibrationCandidate`, `isMobileCalibrationStable`, and `buildMobileCalibrationProfile`. Update `CameraPreview` to render dynamic guidance based on live face position and gaze state.

## Dependencies & Prerequisites

- Phase 1 `MobileMediaPipeBridge` providing live `landmarksByFace`.

## Impacted Files & Components

- [MODIFY] `app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts`: Replace simulation logic with real landmark ingestion, candidate evaluation, 6-frame stability window accumulator, and baseline calibration profile storage.
- [MODIFY] `app/sentinel-mobile/features/exam/components/checkup/camera-preview.tsx`: Connect live `isFaceCentered`, `calibrationFeedback`, and `calibrationProgress` to SVG ellipse stroke coloring, feedback pill text, and progress bar animation.
- [MODIFY] `app/sentinel-mobile/features/exam/lib/mobile-mediapipe-calibration.ts`: Ensure comprehensive evaluation helpers for center alignment, eyes closed, and stability.
- [MODIFY] `app/sentinel-mobile/features/exam/lib/mobile-mediapipe-calibration.test.ts`: Unit test suite covering real-time candidate evaluation, edge cases, and stability checks.

## Implementation Tasks

- [ ] Task 1 — Refactor `use-exam-checkup.ts` to ingest real-time `landmarksByFace` from `MobileMediaPipeBridge`.
- [ ] Task 2 — Call `evaluateMediaPipeCalibrationCandidate` on each incoming frame to detect eyes closed, face count, face area (too-close / too-far), cropped bounds, and off-center position.
- [ ] Task 3 — Collect 6 consecutive stable frames (`isMobileCalibrationStable`) where face center drift <8%, head pose drift <12%, and iris drift <28%.
- [ ] Task 4 — Upon collecting 6 stable frames, compute `buildMobileCalibrationProfile`, set `isCalibrated(true)`, set `calibrationProgress(100)`, and save the profile to AsyncStorage.
- [ ] Task 5 — Update `camera-preview.tsx` UI to dynamically reflect `isFaceCentered` (green vs dashed white), show specific guidance messages ("Align face in guide", "Hold still...", "Both eyes appear closed", "Move farther away", etc.), and animate the progress bar accordingly.

## Verification & Testing

- `pnpm --dir app/sentinel-mobile test features/exam/lib/mobile-mediapipe-calibration.test.ts`
- `pnpm --dir app/sentinel-mobile test features/exam/hooks/use-exam-checkup.test.ts` (if existing or add test suite)
- Verify that closing eyes or moving out of the frame halts calibration and resets the hold counter.

## Risks & Rollback

- **Risk**: Rapid lighting changes or camera shake causing false stability drops.
- **Mitigation**: Decrement buffer by 1–2 frames rather than zeroing out completely on minor single-frame jitter, matching `useCheckupMediaPipe` in `sentinel-web`.
