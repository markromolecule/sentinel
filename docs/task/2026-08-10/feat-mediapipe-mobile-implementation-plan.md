# Implementation Plan - Mobile MediaPipe, Audio, LiveKit & Exam Session Parity

**Goal:** Achieve 1:1 functional and experience parity between `sentinel-web` and `sentinel-mobile` across MediaPipe calibration & monitoring, audio anomaly detection, LiveKit proctoring live stream bridge, exam session question/passage rendering, network reconnection guardrails, and post-exam feedback redirection.

---

## Pre-Planning Summary

- **Task Input Summary:** Bring mobile app features (checkup calibration, face center-alignment guide, lobby gating, active student lobby counter, gaze/multi-face incident detection, automated frame capture, audio monitoring, LiveKit camera stream bridge, question rendering, passages, reconnection flow, turn-in and post-exam feedback screen) to 1:1 parity with `sentinel-web`.
- **Target App / Packages:** `app/sentinel-mobile`, `@sentinel/shared`, `@sentinel/hooks`, `@sentinel/services`.
- **Prisma Migration Required:** No — all backend schema entities (`ExamSession`, `TelemetryEvent`, `Incident`, `ExamAttempt`) are already defined and active.

---

## Directory Structure & Phased Execution

The plan is divided into two primary tasks and four phases:

- **Task 1: Mobile MediaPipe, Audio Anomaly & LiveKit Live Monitoring Engine**
    - [`Task1/Phase1.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/feat-mediapipe-mobile/Task1/Phase1.md): MediaPipe Calibration, Center Alignment Guide, Audio Anomaly Setup & Lobby Readiness Gating.
    - [`Task1/Phase2.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/feat-mediapipe-mobile/Task1/Phase2.md): Attempt Page AI Incident Detection, Automatic Frame Capture & LiveKit Proctoring Bridge.

- **Task 2: Mobile Exam Attempt Flow, Question & Passage Rendering, Reconnection & Feedback**
    - [`Task2/Phase1.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/feat-mediapipe-mobile/Task2/Phase1.md): Question & Passage Rendering Fixes & Attempt Screen UI 1:1 Parity.
    - [`Task2/Phase2.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/feat-mediapipe-mobile/Task2/Phase2.md): Network Reconnection Guardrails, Exam Turn-In & Post-Exam Feedback Page Redirection.

---

## Phase 1: MediaPipe Calibration, Center Guide & Lobby Gating (`Task1/Phase1.md`)

**Goal:** Implement MediaPipe face landmarker calibration, hold-still ellipse guide, audio anomaly analyzer setup, and lobby entry gating on mobile.

- [ ] Implement `app/sentinel-mobile/features/exam/lib/mobile-mediapipe-calibration.ts` wrapping `@sentinel/shared` MediaPipe analysis.
- [ ] Write unit tests at `app/sentinel-mobile/features/exam/lib/mobile-mediapipe-calibration.test.ts`.
- [ ] Add face alignment ellipse overlay and progress UI to `app/sentinel-mobile/features/exam/components/checkup/camera-preview.tsx`.
- [ ] Update `app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts` with calibration state management.
- [ ] Implement `app/sentinel-mobile/features/exam/lib/mobile-audio-anomaly.ts` with unit tests at `mobile-audio-anomaly.test.ts`.
- [ ] Update `app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts` to gate lobby entry until calibration and audio readiness are verified, and synchronize student lobby counter.
- [ ] Write unit tests at `app/sentinel-mobile/features/exam/hooks/use-exam-lobby.test.ts`.

---

## Phase 2: Attempt AI Incident Detection & LiveKit Bridge (`Task1/Phase2.md`)

**Goal:** Continuous MediaPipe face/gaze monitoring during attempt, automated frame snapshot capture, and LiveKit proctoring camera publisher on mobile.

- [ ] Implement `app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.ts` for gaze off screen, multiple faces, and no face detection.
- [ ] Write unit tests at `app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.test.ts`.
- [ ] Implement `app/sentinel-mobile/features/exam/lib/mobile-frame-capture.ts` to upload evidence snapshots on security violations.
- [ ] Write unit tests at `app/sentinel-mobile/features/exam/lib/mobile-frame-capture.test.ts`.
- [ ] Implement `app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.tsx` wrapping `useStudentLiveInspectionPublisher` from `@sentinel/hooks`.
- [ ] Write component tests at `app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.test.tsx`.
- [ ] Wire up monitoring & LiveKit bridge inside `app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`.

---

## Phase 3: Question Display Fix, Question Types & Reading Passages (`Task2/Phase1.md`)

**Goal:** Fix missing questions on mobile attempt page, support all 5 question types, and render reading passages matching `sentinel-web`.

- [ ] Refactor `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts` to handle multi-choice, multi-select, true/false, short answer, essay, and passages.
- [ ] Update unit tests at `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.test.ts`.
- [ ] Create `app/sentinel-mobile/features/exam/components/session/passage-card.tsx` for reading passage rendering with tests at `passage-card.test.tsx`.
- [ ] Refactor `app/sentinel-mobile/features/exam/components/session/question-card.tsx` to render passage and controls per question type with tests at `question-card.test.tsx`.

---

## Phase 4: Network Reconnection, Exam Turn-In & Feedback Page (`Task2/Phase2.md`)

**Goal:** Auto-reconnection flow on network drop, server-side exam submission, and redirection to post-exam Feedback page matching `sentinel-web`.

- [ ] Implement `app/sentinel-mobile/features/exam/lib/mobile-exam-reconnection.ts` with offline detection and retry backoff.
- [ ] Write unit tests at `app/sentinel-mobile/features/exam/lib/mobile-exam-reconnection.test.ts`.
- [ ] Update `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts` to submit attempt payload via `submitExamAttempt` API and navigate to result screen.
- [ ] Write unit tests at `app/sentinel-mobile/features/exam/hooks/use-exam-session.test.ts`.
- [ ] Update `app/sentinel-mobile/app/exam/[id]/result/index.tsx` and `features/exam/components/detail/result-view.tsx` to match `sentinel-web` feedback screen with tests at `result-view.test.tsx`.

---

## Done Criteria & Verification Plan

- All tasks reference concrete files and functions.
- Every phase includes co-located unit/component tests (`*.test.ts` / `*.test.tsx`).
- Verification commands:
    - `pnpm --dir app/sentinel-mobile test`
    - `pnpm --dir app/sentinel-mobile build`
