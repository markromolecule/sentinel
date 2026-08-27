---
title: "Mobile Exam Session Improvements & Fixes"
type: context
status: ready
created: "2026-08-25"
tags: [context, mobile, exam-session, telemetry, feedback, livekit]
feature: "mobile-exam-session-fixes"
---

# Mobile Exam Session Improvements & Fixes Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Questions not showing:** In `sentinel-mobile`, the exam session screen displays a blank question area above the navigator because questions and choices are missing or unnormalized in the display adapter, and `useExamQuery` lacked `{ viewer: 'student' }`.
  2. **Candidate Ingestion 400 & Fallback 404:** `mobile-frame-capture.ts` generates pseudo-random non-UUID strings for `metadata.eventId`, which fails backend Zod UUID validation (400 Bad Request). Its catch block then invokes an obsolete non-existent route `/student/exam-attempts/:id/incidents/evidence` (404 Not Found).
  3. **Missing Post-Submit Feedback:** After exam submission on mobile, the user is redirected straight to the tabs dashboard without the post-exam feedback and rating workflow present in `sentinel-web`.
  4. **Gaze Off Screen Policy Filtering (Verified Working):** The backend telemetry engine appropriately suppressed sub-threshold gaze deviations, as confirmed in terminal logs.
  5. **LiveKit Mobile Camera Publishing:** LiveKit proctor inspection on `sentinel-web` fails to connect to `sentinel-mobile` because mobile was providing a mock dummy track rather than publishing the active camera stream.

- **Business / User Value:**
  - Guarantees seamless exam taking on mobile devices across all question formats (Multiple Choice, True/False, Essay, Identification, Matching, Fill in the Blank, Enumeration).
  - Ensures robust capture and upload of forensic telemetry evidence to Supabase Storage without client errors.
  - Captures valuable student experience feedback post-submission.
  - Enables instructors to view real-time mobile camera inspection video directly on `sentinel-web`.

- **Success Criteria:**
  - Exam session screen on mobile displays full question text, points, passages, and choices/inputs for all questions.
  - Evidence frame capture uses valid RFC4122 v4 UUIDs, successfully ingests candidates, and uploads snapshots directly to signed Supabase storage URLs.
  - Submitting an exam routes to `/exam/[id]/feedback` allowing students to rate (1–5 emoji scale) and describe their experience, or skip to dashboard.
  - LiveKit publisher in the mobile MediaPipe bridge connects to the LiveKit room when a proctor initiates live inspection, streaming the mobile camera video to `sentinel-web`.

---

## 2. Requirements & User Stories

### User Stories
- *As a student taking an exam on mobile, I want to see the question prompt, reference passages, and interactive answer options so that I can complete my exam without interface bugs.*
- *As an instructor monitoring an exam, I want to trigger live camera inspection and see the student's mobile camera stream in real time.*
- *As an instructor, I want flagged anomalies to capture valid forensic evidence frames with correct metadata and image artifacts.*
- *As a student finishing an exam, I want to rate my test-taking experience and submit feedback to improve future assessments.*

### Functional Requirements
- [x] **FR-1 (Question Normalization & Query):**
  - Update `use-exam-session.ts` to query exam data with `{ viewer: 'student' }`.
  - Harden `mobile-exam-adapter.ts` to defensively extract question text from `content.prompt`, `content.question`, `content.text`, or `question.prompt`.
  - Ensure `options` parses string arrays, object arrays (`{ id, text }` or `{ label, value }`), and handles all question types.
- [x] **FR-2 (Evidence Capture & RFC4122 UUID):**
  - Update `mobile-frame-capture.ts` to use standard UUID generation for `metadata.eventId` (e.g. `crypto.randomUUID()`).
  - Eliminate the dead fallback route call to `/student/exam-attempts/:id/incidents/evidence`.
- [x] **FR-3 (Mobile Feedback Flow):**
  - Implement mobile feedback screen at `app/exam/[id]/feedback/index.tsx` matching `sentinel-web` design tokens (5 rating levels: Bad, Poor, Fair, Good, Excellent with emojis, star badges, optional feedback textarea, and validation).
  - Add optional thank-you confirmation view and skip-to-dashboard option.
  - Update `use-exam-result.ts` and `use-exam-session.ts` to transition to feedback upon submission / turn-in.
- [x] **FR-4 (WebView LiveKit Video Publisher):**
  - Embed LiveKit publication logic directly inside `MobileMediaPipeBridge` WebView where the active HTML5 camera stream is already running.
  - Pass the LiveKit inspection room credentials/token from the React Native hook to the WebView bridge via `postMessage`.
  - Enable bidirectional signaling: when live inspection is requested by an instructor, the WebView joins the LiveKit room and publishes the local camera track; when ended, it unpublishes and leaves the room.

---

## 3. Technical & Architectural Context

### Affected Components & Layers
- **Mobile Client (`app/sentinel-mobile/`)**:
  - `features/exam/components/session/exam-session-screen.tsx`
  - `features/exam/components/session/question-card.tsx`
  - `features/exam/components/session/mobile-live-inspection-bridge.tsx`
  - `features/exam/components/checkup/mobile-mediapipe-bridge.tsx`
  - `features/exam/lib/mobile-exam-adapter.ts`
  - `features/exam/lib/mobile-frame-capture.ts`
  - `features/exam/hooks/use-exam-session.ts`
  - `features/exam/hooks/use-exam-result.ts`
  - `app/exam/[id]/feedback/index.tsx` (New route)
  - `app/exam/[id]/feedback/thank-you.tsx` (New route)

### Key Contracts & DTOs
- `ingestEvidenceCandidateSchema` (`app/sentinel-api/src/modules/telemetry/evidence/evidence.dto.ts`): Requires `eventId: z.string().uuid()`.
- `createFeedbackSchema` (`app/sentinel-api/src/modules/general/feedbacks/feedback.dto.ts`): Requires `attemptId: string`, `rating: number (1-5)`, `experience?: string | null`.
- `LiveInspectionDirective` (`packages/shared/src/types`): Coordinates publisher token, room name, and lease lifecycle.

---

## 4. Scope & Boundaries

- **In Scope:**
  - Question rendering & prompt/options normalization in mobile exam session.
  - Evidence frame capture UUID fix & error recovery.
  - Mobile feedback screen & navigation flow.
  - WebView-based LiveKit video track publication for mobile live inspection.
- **Out of Scope:**
  - Modifying backend telemetry thresholds / policy evaluation rules.
  - Changing web instructor monitoring UI components.

---

## 5. References & Decisions

- **Decision 1 (LiveKit Architecture):** Selected WebView-based LiveKit publication inside `MobileMediaPipeBridge` to leverage existing camera stream and `livekit-client` without custom native WebRTC rebuilds.
- **Decision 2 (Feedback Workflow):** Matched web 5-tier rating system with emoji feedback and optional comment box, submitting via `useCreateFeedbackMutation`.
- Reference Web Feedback Implementation: [page.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx)
