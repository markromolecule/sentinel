---
title: "Phase 3: Grading Workspace On-Demand Recalculation UX (sentinel-web)"
type: phase
parent: "essay-rubric-prescoring"
phase: "03"
status: completed
created: "2026-09-06"
tags: [task, phase, web, grading, rubric, ux]
---

# Phase 3: Grading Workspace On-Demand Recalculation UX (sentinel-web)

## Objective

Enhance the instructor essay grading workspace (`/exams/grading/[examId]/[attemptId]`) with an on-demand *"Re-calculate with Rubric"* action button in `GradingRubricPane.tsx`, allowing instructors to recalculate or reset slider scores to the deterministic rubric baseline at any time with instant UI updates and toast feedback.

## Dependencies & Prerequisites

- Phase 1 completed (`evaluateEssayWithRubric` available in `@sentinel/shared`).
- Phase 2 completed (attempts submitted with pre-scored evaluations).

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_components/grading-rubric-pane.tsx`:
  - Add *"Re-calculate with Rubric"* action button.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_components/_types.ts`:
  - Add `onRecalculateRubric?: () => void` prop to `GradingRubricPaneProps`.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_hooks/use-grading-attempt/_types.ts`:
  - Add `handleRecalculateRubric: () => void` to `UseGradingAttemptReturn`.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_hooks/use-grading-attempt/index.ts`:
  - Implement `handleRecalculateRubric`: runs `evaluateEssayWithRubric` client-side using the active question's student answer, prompt, and rubric definition, updating state immediately.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/page.tsx`:
  - Pass `onRecalculateRubric` to `GradingRubricPane`.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_components/grading-rubric-pane.test.tsx`:
  - Unit tests for the recalculate button and handler invocation.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_hooks/use-grading-attempt/index.test.tsx`:
  - Test verifying `handleRecalculateRubric` recomputes scores and feedback.

## Implementation Tasks

- [x] **Task 3.1: Add Hook Recalculation Handler:**
  - In `useGradingAttempt`:
    - Define `handleRecalculateRubric()`.
    - If `activeQuestion` and `attemptDetail?.attempt.answers` exist, evaluate the essay text with `evaluateEssayWithRubric(answerText, activeQuestion.content.prompt, effectiveRubric)`.
    - Update `evaluations[activeQuestionId]` with the calculated scores and feedback.
    - Show `toast.success("Rubric pre-scoring applied.")`.
- [x] **Task 3.2: Add Recalculate Button to Rubric Pane:**
  - In `GradingRubricPane.tsx`:
    - Add an outline action button: `[RotateCcw icon] Re-calculate with Rubric`.
    - Tooltip / styling: Subtle, non-intrusive button placed beside the rubric version badge and weighted score header.
- [x] **Task 3.3: Component & Hook Tests:**
  - Test clicking "Re-calculate with Rubric" invokes `onRecalculateRubric`.
  - Test `handleRecalculateRubric` updates slider scores and triggers toast.

## Verification & Testing

- Command: `./node_modules/.bin/vitest run src/app/(protected)/(instructor)/exams/grading/` (PASS: 9/9 test files, 27/27 tests passed)
- Command: `tsc --noEmit` on grading modules (PASS: 0 errors)
- Manual inspection: Workspace renders the `Re-calculate with Rubric` button beside rubric badges; clicking resets active slider values and recalculates live weighted score with toast confirmation.

## Risks & Rollback

- **Low Risk:** Purely additive client action; doesn't alter data unless instructor explicitly submits.
- **Rollback:** Remove the button from `GradingRubricPane.tsx`.
