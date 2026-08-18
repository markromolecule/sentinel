---
title: "Phase 3: Exam Session Landmark Stream Integration & End-to-End Verification"
type: phase
parent: "fix-002-mobile-mediapipe-calibration"
phase: "03"
status: planned
created: "2026-08-18"
tags: [task, phase, mobile, mediapipe, monitoring, session, verification]
---

# Phase 3: Exam Session Landmark Stream Integration & End-to-End Verification

## Objective

Connect the real-time MediaPipe landmark stream to `useMobileMediaPipeMonitoring` during active mobile exam sessions (`exam-session-screen.tsx`), replacing the empty `landmarksByFace` array, and perform comprehensive automated and end-to-end verification.

## Dependencies & Prerequisites

- Phase 1 `MobileMediaPipeBridge` and Phase 2 Calibration Profile.

## Impacted Files & Components

- [MODIFY] `app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`: Connect landmark stream to `useMobileMediaPipeMonitoring`, ensuring active face tracking and anomaly detection.
- [MODIFY] `app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.ts`: Validate integration with loaded calibration baseline profile and telemetry dispatcher.
- [MODIFY] `app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`: Verify that only valid calibrated profiles permit lobby progression.

## Implementation Tasks

- [ ] Task 1 — Integrate `MobileMediaPipeBridge` into `exam-session-screen.tsx` to stream live `landmarksByFace` during exam sessions.
- [ ] Task 2 — Verify that `useMobileMediaPipeMonitoring` analyzes frames against the student's saved `MediaPipeCalibrationProfile` from checkup.
- [ ] Task 3 — Ensure anomaly alerts (`GAZE_OFF_SCREEN`, `MULTIPLE_FACES`, `NO_FACE_DETECTED`) trigger only upon sustained threshold violation (e.g. 2 consecutive frames) and respect telemetry cooldowns (10s).
- [ ] Task 4 — Execute complete unit test suite across `sentinel-mobile`.

## Verification & Testing

- `pnpm --dir app/sentinel-mobile test`
- Verification of test pass rates, TypeScript type safety, and zero regression across existing mobile features.

## Risks & Rollback

- **Risk**: High CPU/battery consumption during lengthy exams.
- **Mitigation**: Throttle frame processing interval to 500ms–1000ms during exam sessions as configured in `mediaPipeSandbox.frameIntervalMs`.
