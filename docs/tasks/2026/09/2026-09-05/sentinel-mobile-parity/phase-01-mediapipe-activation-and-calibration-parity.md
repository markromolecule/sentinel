---
title: "Phase 1: MediaPipe Activation & Checkup Calibration Parity"
type: phase
status: completed
created: "2026-09-05"
tags: [phase, mobile, mediapipe, calibration]
---

# Phase 1: MediaPipe Activation & Checkup Calibration Parity

## Goal

Ensure MediaPipe face landmark detection and calibration run automatically on mobile whenever camera and AI proctoring rules are enabled, eliminating the bug where MediaPipe was skipped on standard exams.

## Tasks

- [x] 1. Update `mobile-exam-adapter.ts`:
  - Implement `resolveStudentExamMediaPipeSandbox` to derive `mediaPipeSandbox` when `exam.configuration.cameraRequired` and AI rules (`gaze_tracking`, `face_detection`, `multiple_faces_detection`) are present.
- [x] 2. Update `use-exam-checkup.ts`:
  - Enforce calibration requirement in checkup when AI rules are active.
- [x] 3. Update `exam-session-screen.tsx`:
  - Mount `MobileMediaPipeBridge` in active session when AI rules are active, ensuring `cameraRef` provides `startLiveInspection` and landmarks stream to `useMobileMediaPipeMonitoring`.
- [x] 4. Add unit test coverage in `mobile-exam-adapter.test.ts` and `use-mobile-mediapipe-monitoring.test.ts`.

## Verification Evidence

- Command: `pnpm --filter sentinel-mobile test` (32/32 test files passed, 191/191 tests passed)
- Files modified:
  - `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts`
  - `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.test.ts`
- Criteria verified:
  - [x] Automated tests pass: `pnpm --filter sentinel-mobile test`
  - [x] An exam with `aiRules.gaze_tracking: true` correctly activates MediaPipe in checkup and active session.
