---
title: "Sentinel Mobile Exam Runtime, Question Engine & Telemetry Parity"
type: task
status: planned
created: "2026-09-05"
tags: [task, mobile, exam-runtime, mediapipe, telemetry, questions]
---

# Task: Sentinel Mobile Exam Runtime, Question Engine & Telemetry Parity

## Overview

Finalize all functionalities of `sentinel-mobile` so that student mobile exam taking matches the capabilities, reliability, proctoring security, and visual fidelity of `sentinel-web`.

## Context & Architecture Decisions

- Context: [sentinel-mobile-parity-and-telemetry.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/5/sentinel-mobile-parity-and-telemetry.md)
- ADR: [2026-09-05-mobile-web-exam-runtime-and-telemetry-parity.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/decisions/2026-09-05-mobile-web-exam-runtime-and-telemetry-parity.md)

## Phased Breakdown

- [x] **Phase 1: MediaPipe Activation & Checkup Calibration Parity**
  - Integrate deterministic `resolveStudentExamMediaPipeSandbox` into `mobile-exam-adapter.ts`.
  - Enforce front camera calibration in `use-exam-checkup.ts` when AI rules are active.
  - Mount `MobileMediaPipeBridge` in `exam-session-screen.tsx` whenever camera/AI monitoring is enabled.
- [ ] **Phase 2: Question Engine Display & Type Parity**
  - Add option letter badges (`A.`, `B.`, `C.`, `D.`) to `MULTIPLE_CHOICE` and `MULTIPLE_RESPONSE` in `question-card.tsx`.
  - Add point badges (`X points`) to question headers.
  - Fix boolean True/False answer selection handling.
  - Expand `ENUMERATION` and `FILL_BLANK` with multi-item numbered inputs.
- [ ] **Phase 3: Question Drawer & Navigation Integrity**
  - Refactor `question-drawer.tsx` to use `isQuestionAnswered` helper, fixing boolean false and empty array/object bugs.
  - Respect `shuffleQuestions` configuration in `adaptExamQuestionsForMobile` to prevent accidental un-shuffling.
- [ ] **Phase 4: Telemetry & Multi-Layer Security Verification**
  - Verify native screenshot prevention (`FLAG_SECURE`) and `SCREENSHOT_ATTEMPT` event generation.
  - Verify `APP_BACKGROUNDING` and `APP_PINNING_VIOLATION` isolation and cooldown.
  - Verify MediaPipe anomaly detection (`GAZE_OFF_SCREEN`, `MULTIPLE_FACES`, `NO_FACE_DETECTED`) and evidence photo capture.
