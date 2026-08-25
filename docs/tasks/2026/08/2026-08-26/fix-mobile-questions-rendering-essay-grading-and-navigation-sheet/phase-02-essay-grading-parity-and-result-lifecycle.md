---
title: "Phase 2: Essay Grading Parity, Pending Review Banner, and Turn-in Hook Cleanup"
type: phase
parent: "fix-mobile-questions-rendering-essay-grading-and-navigation-sheet"
phase: "02"
status: planned
created: "2026-08-26"
tags: [task, phase, mobile, essay-grading, result-parity]
---

# Phase 2: Essay Grading Parity, Pending Review Banner, and Turn-in Hook Cleanup

## Objective

Align mobile exam result handling with the Sentinel Web essay grading lifecycle by checking `summary.requiresManualReview`, displaying a clear "Pending Review" banner for exams awaiting instructor grading instead of evaluating false fails, and removing redundant double `completeExamSession` API invocations during turn-in.

## Dependencies & Prerequisites

- Phase 1: Question Rendering Fallbacks and Empty State Card

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/components/detail/result-view.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/detail/result-view.tsx): Update status header card, score metric card, and notice section to handle provisional manual review states.
- [`app/sentinel-mobile/features/exam/hooks/use-exam-result.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-result.ts): Prevent duplicate submission mutations; streamline transition to feedback.
- [`app/sentinel-mobile/features/exam/components/detail/result-view.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/detail/result-view.test.tsx): Add test coverage for pending review state.
- [`app/sentinel-mobile/features/exam/hooks/use-exam-result.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-result.test.ts): Update hook test suite for clean turn-in navigation.

## Implementation Tasks

- [ ] In `result-view.tsx`:
  - Inspect `summary.requiresManualReview` or `summary.manualReviewQuestionCount > 0`.
  - When manual review is required:
    - Render status banner with an amber accent (`#f59e0b` / `rgba(245, 158, 11, 0.1)`), an hourglass/timer icon, and label `"PENDING REVIEW"`.
    - Display Score as `"Pending Review"` and Percentage as `"--"` (or auto-graded points with provisional label).
    - Render turn-in notice: `"Your exam includes essay questions that require instructor grading. Your final grade will be updated once your instructor finishes reviewing."`
    - In Performance Breakdown, display essay sections as "Pending Review".
- [ ] In `use-exam-result.ts`:
  - In `handleTurnIn`, avoid re-invoking `completeExamSession` if `preview.summary` already exists from session submission; safely clear storage and navigate to `/exam/[id]/feedback?attemptId=${sessionId}`.
- [ ] In `result-view.test.tsx`:
  - Add test case verifying that an attempt with `requiresManualReview: true` renders the "PENDING REVIEW" header instead of "DID NOT PASS".

## Verification & Testing

- Run test command:

  ```bash
  pnpm --filter sentinel-mobile test features/exam/components/detail/result-view.test.tsx features/exam/hooks/use-exam-result.test.ts
  ```

## Risks & Rollback

- **Risk:** Stale score display on exams without essay questions.
- **Mitigation:** Ensure standard pass/fail calculation is preserved when `requiresManualReview` is false.
- **Rollback:** Revert changes in `result-view.tsx` and `use-exam-result.ts`.
