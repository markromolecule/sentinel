---
title: "Mobile Exam Session Reliability, Question Rendering, Audio Monitoring, Anomaly Device Notifications, and Submission Idempotency"
type: context
status: draft
created: "2026-08-26"
tags: [context, mobile, exam-session, telemetry, audio-monitoring, notifications, submission, feedback]
feature: "mobile-exam-reliability-and-anomaly-notifications"
---

# Mobile Exam Session Reliability, Question Rendering, Audio Monitoring, Anomaly Device Notifications, and Submission Idempotency Context Specification

## 1. Overview & Objective

- **Problem Statement:** During mobile exam sessions on `sentinel-mobile`, five critical operational and UX issues were observed:
  1. **Question Rendering & Session ID Timing:** Questions failed to render reliably on physical mobile devices due to session ID storage validation race conditions and missing question structure unwrapping fallbacks.
  2. **Gaze Tracking Filtering:** Gaze tracking events triggered in the background were debounced/ignored by backend threshold filters (`Event ignored: threshold not met`) before reaching the persisted threshold required to appear on the instructor's live dashboard.
  3. **iOS Audio Session Initialization & Metering:** Audio monitoring failed on iOS physical devices during checkup with `Failed to configure audio session: Session activation failed` due to audio/camera session configuration collisions, and was not actively metered/telemetred during the live session screen.
  4. **Physical Device Anomaly Feedback:** Students lacked physical device notifications (tactile haptic alerts, top warning banners, and background notifications) when security anomalies or violation flags occur.
  5. **Submission Idempotency & Feedback Failure:** When turning in an exam session or navigating to feedback, retried submission requests returned a `409 Conflict` (`This exam session has already been submitted`), causing the mobile client to show a blocking "Turn in failed: this exam session has already been submitted" error instead of gracefully recognizing the completed state and proceeding to feedback / result screens.
- **Business / User Value:** Ensuring 100% exam session reliability on mobile devices prevents student exam disruption, captures real-time auditory and visual anomalies without crashing iOS audio sessions, gives students immediate tactile feedback on infractions, and eliminates submission panics caused by non-idempotent completion errors.
- **Success Criteria:**
  - All 8 question types (Multiple Choice, Multiple Response, True/False, Identification, Essay, Fill-in-the-Blank, Enumeration, Matching) and Reading Passages render and accept input without crashing or rendering blank screens.
  - Audio recording/metering initializes smoothly on iOS/Android without native audio session activation exceptions.
  - Audio anomaly events are actively sampled, metered, and dispatched via mobile telemetry.
  - Physical devices provide immediate feedback (tactile haptic alerts + top warning banners) when anomalies are flagged.
  - Exam turn-in and post-exam feedback gracefully handle 409 "already submitted" conflicts by routing seamlessly to the thank-you / result screens without displaying an error alert.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As a Student taking an exam on mobile*, I want all question types and reading passages to render instantly and clearly so that I can submit answers without blockers.
- *As a Student on mobile*, I want my physical device to alert me (via haptic feedback and a warning banner) if I look away or background the app, so that I can immediately correct my behavior before exceeding penalty thresholds.
- *As a Student submitting an exam on mobile*, I want my submission and post-exam feedback to succeed seamlessly even if the network retries or if the session is already marked completed on the server, so that I never see a "Turn in failed" error for an already submitted exam.
- *As an Instructor proctoring an exam*, I want to receive verified, debounced telemetry for gaze deviations, loud noises/speech, and app switching in real time on the live monitoring dashboard.

### Functional Requirements

- [ ] **FR-1: Mobile Question & Session Resiliency:** Harden `useExamSession` and `mobile-exam-adapter` against storage timing races, empty questions payloads, and ensure fallback inputs exist for all question types.
- [ ] **FR-2: Safe iOS/Android Audio Session Configuration:** Configure `expo-audio` / `AudioModule` with non-conflicting category options (`mixWithOthers: true`, `allowsRecording: true`, `interruptionMode: 'doNotMix'`) so mic checkup and session audio monitoring do not collide with active camera frames.
- [ ] **FR-3: Active Session Audio Anomaly Monitoring:** Mount a lightweight background audio meter during `ExamSessionScreen` to evaluate noise/speech thresholds (`evaluateMobileAudioLevel`) and stream telemetry events.
- [ ] **FR-4: Physical Device Anomaly Alerts (Haptics & Banners):** Trigger tactile warning vibrations via `expo-haptics` and highlight top warning banners whenever an anomaly (e.g. `GAZE_OFF_SCREEN`, `AUDIO_ANOMALY`, `APP_BACKGROUNDING`) is detected.
- [ ] **FR-5: Exam Submission & Feedback Idempotency:**
  - In `use-exam-session.ts` `executeSubmission`: If `completeExamSession` fails with "already been submitted" or HTTP 409, treat as a success, clear session storage, and proceed immediately to `/exam/[id]/feedback` or `/exam/[id]/result`.
  - In `app/exam/[id]/feedback/index.tsx`: Handle existing submission attempts cleanly and redirect to `/exam/[id]/feedback/thank-you`.
- [ ] **FR-6: Telemetry Threshold Clarity:** Document and align client-side warning triggers with backend threshold policies.

### Edge Cases & Failure Modes

- **Double-Tap / Network Retry on Submit:** Multiple submission dispatches return 409; the client catches this specific status/message and routes to the completion screen without raising an alert.
- **Audio Permission Denied / Session Busy:** Fall back gracefully with an on-screen notice without blocking exam progression if audio is optional.
- **Fast Question Navigation / Offline Storage:** Maintain local answer state in memory and persist immediately to avoid losing answers on network drops.
- **Backgrounding Violation:** Trigger immediate haptic pulse upon app state transition to inactive/background, log `APP_BACKGROUNDING` telemetry, and prompt student upon foreground return.

---

## 3. Technical & Architectural Context

- **Affected Domains / Layers:**
  - Mobile App (`app/sentinel-mobile/`): `features/exam/hooks/`, `features/exam/components/session/`, `features/exam/lib/`, `app/exam/[id]/feedback/`.
  - Backend API (`app/sentinel-api/`): `modules/telemetry/`, `modules/examination/`.
  - Shared Packages (`packages/shared/`, `packages/hooks/`): Telemetry types, question adapter contracts.
- **Existing Files & Reference Symbols:**
  - [`app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts)
  - [`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx)
  - [`app/sentinel-mobile/features/exam/components/session/question-card.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-card.tsx)
  - [`app/sentinel-mobile/features/exam/components/session/passage-card.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/passage-card.tsx)
  - [`app/sentinel-mobile/app/exam/[id]/feedback/index.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/feedback/index.tsx)
  - [`app/sentinel-mobile/features/exam/lib/mobile-audio-anomaly.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-audio-anomaly.ts)
  - [`app/sentinel-mobile/features/exam/lib/mobile-telemetry-client.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-telemetry-client.ts)
- **Security & Authorization:**
  - Authenticated attempt token / session ID required for all telemetry dispatches.
  - Sensitive answer keys strictly omitted from student view payload.

---

## 4. UI/UX & Interaction Guidelines

- **Haptic Feedback:** Use `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` on anomaly triggers.
- **Warning Toast / Status:** Render a high-contrast amber warning chip (`⚠️ Warning: Multiple Faces Detected / Gaze Off-Screen`) at the top of `ExamSessionScreen`.
- **Submission Error Handling:** Never show red failure modals when an exam is already submitted; transition directly to the post-exam summary or feedback form.
- **Question Layout:** Clean card container with passage accordion at the top and sticky bottom navigation (Previous / Flag / Next / Submit).

---

## 5. Scope & Boundaries

- **In Scope:**
  - Resilient question rendering and input handling on mobile.
  - Idempotent submission and feedback navigation preventing "turn in failed" errors.
  - Audio recording configuration fix for iOS checkup and active session metering.
  - Haptic feedback and visual warning banner on mobile anomaly triggers.
  - Test suite coverage across mobile question rendering and telemetry hooks.
- **Out of Scope / Non-Goals:**
  - Modifying instructor grading flows or altering database scoring tables.

---

## 6. References & External Context

- Context Factory Template: `context-factory/docs/templates/Context.md`
- Mobile Telemetry Engine: `app/sentinel-api/src/modules/telemetry/`
- Expo Audio & Haptics Documentation
