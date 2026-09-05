---
title: "Sentinel Mobile Exam Runtime, Question Engine & Telemetry Parity"
type: context
status: draft
created: "2026-09-05"
tags: [context, mobile, exam, mediapipe, telemetry, proctoring]
feature: "sentinel-mobile-parity"
---

# Sentinel Mobile Exam Runtime, Question Engine & Telemetry Parity Context Specification

## 1. Overview & Objective

- **Problem Statement:** 
  `sentinel-mobile` was developed as a companion app for students taking proctored exams on mobile devices. While LiveKit inspection is functional, key monitoring and telemetry capabilities (MediaPipe face/gaze evaluation, camera checkup calibration, screenshot prevention, and app-pinning telemetry) and question rendering parity with `sentinel-web` require complete verification and alignment. Specifically, MediaPipe sandbox settings were previously not auto-resolved from exam AI rules in mobile, causing MediaPipe and calibration to be silently skipped in standard exams, while several question types had subtle rendering or state bugs (such as unlabelled choices, boolean answer handling in True/False, and improper answered-state indicators in the question navigator).

- **Business / User Value:** 
  Institutions and instructors require high exam integrity regardless of whether a student takes an assessment on `sentinel-web` or `sentinel-mobile`. Students expect an identical, intuitive testing experience with seamless question navigation, prompt legibility, and fair, transparent proctoring feedback.

- **Success Criteria:** 
  1. All 8 question types (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `ESSAY`, `ENUMERATION`, `MATCHING`, `FILL_BLANK`) render accurately with points, option labels (A, B, C, D), and support polymorphic answers (string, boolean, array, object).
  2. Question navigation drawer correctly indicates answered, unanswered, flagged, and current questions without type coercion bugs.
  3. MediaPipe face landmarker and calibration run during system checkup and during the active exam session whenever `cameraRequired` and AI rules (`gaze_tracking`, `face_detection`, `multiple_faces_detection`) are configured.
  4. Hardware screenshot protection (`FLAG_SECURE`) and screenshot detection listener emit `SCREENSHOT_ATTEMPT` telemetry.
  5. App backgrounding and app pinning violations emit `APP_BACKGROUNDING` and `APP_PINNING_VIOLATION` telemetry, properly disambiguated from screenshot events.
  6. All unit and integration tests pass across `sentinel-mobile` and `@sentinel/shared`.

---

## 2. Requirements & User Stories

### User Stories / Scenarios
- *As a student on mobile, I want questions to clearly show their point values, prompt text, and labelled choices (A, B, C, D), so that I can easily navigate and answer each question.*
- *As a student answering True/False questions, I want my selection to remain highlighted and reflect as "Answered" in the question drawer even if the value is boolean `false`.*
- *As an instructor, I want MediaPipe gaze and face anomaly detection to run actively on student mobile devices whenever AI proctoring rules are enabled, ensuring exam integrity parity with web.*
- *As a proctoring system, I want mobile screenshot attempts, notification drawer pulls, and app switching to be accurately recorded in the incident timeline.*

### Functional Requirements
- [ ] **FR-1:** Centralize or adapt `resolveStudentExamMediaPipeSandbox` in `mobile-exam-adapter.ts` so that `adaptExamForMobile` activates `mediaPipeSandbox` when `configuration.cameraRequired` and AI rules are enabled.
- [ ] **FR-2:** Ensure `use-exam-checkup.ts` enforces face calibration when AI rules are active, providing visual feedback in the ellipse guide.
- [ ] **FR-3:** Ensure `exam-session-screen.tsx` mounts `MobileMediaPipeBridge` whenever camera/AI monitoring is enabled, allowing live landmark stream processing and LiveKit live inspection.
- [ ] **FR-4:** Update `question-card.tsx` to render option letters (`A.`, `B.`, `C.`, `D.`) for `MULTIPLE_CHOICE` and `MULTIPLE_RESPONSE`.
- [ ] **FR-5:** Display point values (`X points`) in `question-card.tsx` header for question weight clarity.
- [ ] **FR-6:** Fix boolean answer handling in `question-card.tsx` and `question-drawer.tsx` so boolean `true`/`false` answers are rendered and marked as answered correctly.
- [ ] **FR-7:** Fix empty array `[]` and empty object `{}` evaluation in `question-drawer.tsx` so incomplete multi-select or matching answers do not falsely show as answered.
- [ ] **FR-8:** Support multiple numbered fields for `ENUMERATION` questions with fallback minimum count.
- [ ] **FR-9:** Respect `shuffleQuestions` settings when ordering questions in `mobile-exam-adapter.ts`.
- [ ] **FR-10:** Verify hardware screen capture prevention and event emission for screenshot and backgrounding telemetry.

### Edge Cases & Failure Modes
- **Offline / Transient Disruption:** Answer state is preserved locally and synced via debounced updates and jittered heartbeat. Reconnection handles resume.
- **Camera Permission Denied:** Checkup screen provides clear permission grant CTA and blocks progression until resolved.
- **Low Light / Face Occlusion:** MediaPipe emits warning banner (`Face not detected` or `Looking away from screen`) with cooldown before triggering incident telemetry.
- **Recent Screenshot Suppressing Pinning:** iOS screenshot gestures that briefly trigger `inactive`/`background` AppState within 2000ms do not double-flag `APP_PINNING_VIOLATION`.

---

## 3. Technical & Architectural Context

- **Affected Layers:**
  - `app/sentinel-mobile/features/exam/components/session/question-card.tsx` (question UI)
  - `app/sentinel-mobile/features/exam/components/session/question-drawer.tsx` (navigator)
  - `app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx` (session proctoring bridge)
  - `app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts` (checkup calibration)
  - `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts` (session state & telemetry)
  - `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts` (data transformation & sandbox resolution)
  - `packages/shared/src/mediapipe/runtime.ts` / `types.ts` (shared rules)

- **Data Models & Contracts:**
  - `MobileSessionQuestion`: extends question representation to include point values, option tokens, pairs, and blanks.
  - `TelemetryEventType`: `APP_BACKGROUNDING`, `APP_PINNING_VIOLATION`, `SCREENSHOT_ATTEMPT`, `NOTIFICATION_BLOCK_VIOLATION`, `GAZE_OFF_SCREEN`, `MULTIPLE_FACES`, `NO_FACE_DETECTED`.

---

## 4. UI/UX & Interaction Guidelines

- **Typography & Theme:** NativeWind + `Colors` system adhering to light and dark theme palette.
- **Visual Feedback:** 
  - Option selection highlighted with `primary` border and subtle background tint.
  - Option letters `A.`, `B.`, `C.` styled with `font-semibold text-sm` matching web.
  - Clear red alert banner for proctoring warnings (`Face not detected`, `Looking away from screen`).
  - Subtle top floating badge when LiveKit live inspection is active.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Full question type display parity (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `ESSAY`, `ENUMERATION`, `MATCHING`, `FILL_BLANK`).
  - Complete checkup and in-session MediaPipe activation logic.
  - Robust answer detection in question drawer.
  - Telemetry verification for screenshot, app pinning, notification blur, and MediaPipe anomalies.
- **Out of Scope / Non-Goals:**
  - Rewriting LiveKit protocol (already tested and operational).
  - Web kiosk lockdown browser replacement (Web relies on OS blur heuristic; Mobile uses native `FLAG_SECURE` and `AppState`).

---

## 6. References & External Context

- ADR: `docs/decisions/2026-08-31-screenshot-detection-and-prevention.md`
- ADR: `docs/decisions/2026-09-05-mobile-web-exam-runtime-and-telemetry-parity.md`
- Web Reference: `app/sentinel-web/src/features/exams/_components/engine/question-renderer/`
- Shared Scoring Engine: `packages/shared/src/exams/score-exam-attempt-core.ts`
