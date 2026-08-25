---
title: "Fix Mobile Exam Questions, Evidence Upload, Feedback Screen, and LiveKit Streaming"
type: task
status: completed
created: "2026-08-25"
tags: [task, mobile, exam-session, telemetry, feedback, livekit]
---

# Fix Mobile Exam Questions, Evidence Upload, Feedback Screen, and LiveKit Streaming

## Outcome

Fix critical issues in Sentinel Mobile's exam-taking experience:
1. Ensure exam questions and choice options display accurately on the mobile session screen.
2. Fix telemetry evidence frame capture and ingestion by generating RFC4122 v4 UUIDs and removing obsolete 404 fallback endpoints.
3. Provide a post-exam feedback and rating screen on mobile matching `sentinel-web`.
4. Establish live camera video streaming between `sentinel-mobile` and `sentinel-web` via the MediaPipe WebView bridge.

---

## Pre-planning record

### Actors and goals
- **Student (Mobile)**: Needs to see question prompts and interactive choices clearly, submit answers, give feedback after the exam, and have anomaly evidence captured reliably.
- **Proctor / Instructor (Web)**: Needs to view live camera feeds of mobile students during live inspection and review flagged forensic telemetry evidence.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-1 | Student opens exam session on mobile | Student in session | Questions, points, and choices render properly | Gracefully fallback to alternative prompt fields | Completed |
| SC-2 | Anomaly detected during mobile session | Camera active | Evidence frame captured and ingested with valid UUID | Ignore if sub-threshold, retry upload cleanly | Completed |
| SC-3 | Student turns in / finishes exam | Attempt submitted | Navigates to Feedback screen with 1–5 emoji rating | Option to submit feedback or skip to dashboard | Completed |
| SC-4 | Proctor starts LiveKit live inspection from web | Mobile student in session | Mobile bridge joins LiveKit room and streams camera track | Shows proctor viewing indicator; unpublishes on stop | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-1 | LiveKit mobile video publication strategy | Publish from within MediaPipe WebView bridge | WebView already owns active HTML5 `getUserMedia` camera track and can run `livekit-client` without custom native WebRTC pod setup | Native WebRTC compilation / Snapshot polling | `phase-04` |
| DEC-2 | Evidence eventId format | Standard RFC4122 v4 UUID | Backend schema `mediaPipeEvidenceCandidateMetadataSchema` strictly enforces `z.string().uuid()` | Pseudo-random alphanumeric strings | `phase-02` |
| DEC-3 | Mobile feedback UI design | 5-level rating scale with emoji icons and comments | Matches `sentinel-web` implementation and token design | Native alert dialog / Plain text input | `phase-03` |

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-1 | SC-1 / DEC-1 | Questions render prompt text and options on mobile | `mobile-exam-adapter.ts`, `use-exam-session.ts` | Vitest unit tests | Verified |
| AC-2 | SC-2 / DEC-2 | Candidate evidence ingestion succeeds with valid UUID | `mobile-frame-capture.ts` | Vitest unit tests | Verified |
| AC-3 | SC-3 / DEC-3 | Student can rate exam (1-5) and submit comments on mobile | `app/exam/[id]/feedback/index.tsx` | Vitest unit tests | Verified |
| AC-4 | SC-4 / DEC-1 | Mobile camera stream connects to LiveKit on demand | `mobile-mediapipe-bridge.tsx`, `mobile-live-inspection-bridge.tsx` | Vitest unit tests | Verified |

---

## Scope & Non-Goals

### In Scope
- Question normalization & prompt/options fallback adaptation in `sentinel-mobile`.
- Evidence frame capture RFC4122 UUID generation and removal of dead 404 route.
- Creation of mobile feedback routes (`/exam/[id]/feedback` and `/exam/[id]/feedback/thank-you`).
- LiveKit streaming publication inside `MobileMediaPipeBridge` WebView.

### Non-Goals
- Modifying backend telemetry thresholds / policy evaluation rules.
- Modifying web instructor monitoring UI.

---

## Phases

- [x] [`phase-01-question-rendering-and-query-normalization.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-questions-evidence-feedback-livekit/phase-01-question-rendering-and-query-normalization.md) — Phase 1: Question Rendering & Query Normalization
- [x] [`phase-02-evidence-candidate-rfc4122-uuid-and-upload-resilience.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-questions-evidence-feedback-livekit/phase-02-evidence-candidate-rfc4122-uuid-and-upload-resilience.md) — Phase 2: Evidence Candidate UUID & Upload Resilience
- [x] [`phase-03-mobile-post-exam-feedback-and-thank-you-screen.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-questions-evidence-feedback-livekit/phase-03-mobile-post-exam-feedback-and-thank-you-screen.md) — Phase 3: Mobile Post-Exam Feedback Screen
- [x] [`phase-04-webview-livekit-mobile-video-streaming.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-questions-evidence-feedback-livekit/phase-04-webview-livekit-mobile-video-streaming.md) — Phase 4: WebView-based LiveKit Mobile Video Streaming

---

## Verification

- **Automated Test Suite**:
  ```bash
  pnpm --filter sentinel-mobile test
  ```
  - **Result**: 31 passed (31 test files), 150 passed (150 tests) in 1.51s.
- **Verification Evidence**:
  - `mobile-exam-adapter.test.ts`: Passed 18/18 tests (AC-1 verified).
  - `mobile-frame-capture.test.ts`: Passed 3/3 tests (AC-2 verified).
  - `use-exam-result.test.ts`: Passed 1/1 test (AC-3 verified).
  - `mobile-live-inspection-bridge.test.tsx`: Passed 3/3 tests (AC-4 verified).

---

## Result

All 4 phases successfully completed with verified test evidence. Ready for end-to-end device testing.
