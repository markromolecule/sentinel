---
title: "Phase 3: Mobile Post-Exam Feedback Screen"
type: phase
parent: "Fix Mobile Exam Questions, Evidence Upload, Feedback Screen, and LiveKit Streaming"
phase: "3"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, feedback]
---

# Phase 3: Mobile Post-Exam Feedback Screen

## Objective

Provide a post-submission feedback and rating screen on mobile mirroring `sentinel-web`, allowing students to rate their experience (1–5 emoji rating) and submit feedback or skip to the dashboard.

---

## Dependencies & Prerequisites

- Phase 1 and 2 completed.

---

## Impacted Files & Components

- [`app/sentinel-mobile/app/exam/[id]/feedback/index.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/feedback/index.tsx) (New)
- [`app/sentinel-mobile/app/exam/[id]/feedback/thank-you.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/feedback/thank-you.tsx) (New)
- [`app/sentinel-mobile/app/exam/[id]/_layout.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/_layout.tsx)
- [`app/sentinel-mobile/features/exam/hooks/use-exam-result.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-result.ts)
- [`app/sentinel-mobile/features/exam/hooks/use-exam-result.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-result.test.ts) (New)

---

## Implementation Tasks

- [x] Create `app/exam/[id]/feedback/index.tsx`:
  - 5-point rating selector (1: Bad 😔, 2: Poor 😕, 3: Fair 😐, 4: Good 🙂, 5: Excellent ❤️).
  - Selected rating label and description text card.
  - Multiline text input for experience details (up to 2000 chars) with character counter.
  - "Submit Feedback" button leveraging `useCreateFeedbackMutation` from `@sentinel/hooks`.
  - "Skip for now" navigation button to route back to `/(tabs)/exam`.
- [x] Create `app/exam/[id]/feedback/thank-you.tsx`:
  - Thank-you message and icon.
  - "Return to Dashboard" action button.
- [x] Update `useExamResult.ts` (`handleTurnIn`) to navigate to `/exam/${id}/feedback?attemptId=${preview.sessionId}` upon turn-in.
- [x] Add unit tests for the feedback screen and submission hooks (`use-exam-result.test.ts`).

---

## Verification & Testing

- Run test suite:
  ```bash
  pnpm --filter sentinel-mobile test
  ```

  - **Result**: 31/31 test files passed (149 tests passed).
  - `use-exam-result.test.ts` passed turn-in and feedback navigation validation.

---

## Risks & Rollback

- **Risk**: Missing `attemptId` param in feedback screen if student navigated directly.
- **Mitigation**: Handle missing attemptId gracefully with fallback to exam dashboard.
