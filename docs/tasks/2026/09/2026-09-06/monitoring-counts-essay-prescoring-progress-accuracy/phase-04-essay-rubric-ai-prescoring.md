---
title: "Phase 4: Essay Rubric AI Pre-Scoring & Calibration Workspace"
type: phase
parent: "monitoring-counts-essay-prescoring-progress-accuracy"
phase: "04"
status: planned
created: "2026-09-06"
tags: [task, phase, grading, essay, rubric, gemini, ai]
---

# Phase 4: Essay Rubric AI Pre-Scoring & Calibration Workspace

## Objective

Implement an AI-assisted pre-scoring workflow using Google Gemini and the exam's active `EssayRubricDefinition` (criteria, weights, level 0–4 expectations) to generate draft scores and analytical feedback for student essay responses, empowering instructors to review and calibrate rather than grading from scratch.

## Dependencies & Prerequisites

- Gemini API credentials in `sentinel-api` (`process.env.GEMINI_API_KEY`).
- Existing `RubricService.resolveEffectiveEssayRubric` and `updateGradingAttempt` endpoints.

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/grading/services/essay-prescoring.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/services/essay-prescoring.service.ts): New service to prompt Gemini with question, rubric criteria, levels 0–4, and student text.
- [`app/sentinel-api/src/modules/examination/grading/grading.routes.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/grading.routes.ts): New endpoint `POST /examination/grading/attempts/:attemptId/prescore`.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_components/grading-rubric-pane.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_components/grading-rubric-pane.tsx): Add "AI Pre-Score" trigger button, AI justification badges, and slider overrides.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_hooks/use-grading-attempt/index.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_hooks/use-grading-attempt/index.ts): Integrate pre-scoring mutation and initial draft hydration.

## Implementation Tasks

- [ ] **Task 4.1 (Gemini Essay Rubric Evaluation Prompt & Service):**
  - Build `EssayPreScoringService` in `sentinel-api`.
  - Prompt structure:
    - Instruct Gemini to act as an objective academic evaluator.
    - Feed:
      1. Question prompt & passage (if any).
      2. Student's submitted essay response.
      3. Active rubric criteria (`key`, `name`, `weight`, `description`).
      4. Exact level descriptors for Levels 0, 1, 2, 3, 4 from the effective rubric.
    - JSON Schema response:

      ```json
      {
        "scores": {
          "criterion_key_1": 3,
          "criterion_key_2": 4
        },
        "rationale": {
          "criterion_key_1": "Explanation matching Level 3 descriptors...",
          "criterion_key_2": "Explanation matching Level 4 descriptors..."
        },
        "overallFeedback": "Summary feedback for the student..."
      }
      ```

  - Validation: Sanitize output so scores are integers between 0 and 4 matching valid rubric keys.
- [ ] **Task 4.2 (API Pre-scoring Endpoint):**
  - Route: `POST /examination/grading/attempts/:attemptId/prescore`.
  - Permissions: Instructor / Assessment Staff for the exam.
  - Loads attempt detail, resolves effective rubric, runs `EssayPreScoringService` for all essay questions in the attempt, and saves draft evaluations with `isAiGenerated: true`.
- [ ] **Task 4.3 (Frontend Grading Workspace UX):**
  - In `GradingRubricPane`:
    - Add "Auto-Evaluate with AI Rubric" action button with loading spinner.
    - When evaluations are AI-generated, display an "AI-Suggested Draft" badge.
    - Show criterion-specific rationale beneath each slider so the instructor understands why the level was proposed.
    - Retain full slider interactivity so the instructor can instantly override any level (0–4) or adjust comments.
  - In `useGradingAttempt`:
    - Support populating evaluations from the pre-scoring response.
    - Submitting / finalizing preserves the instructor's calibrated values.

## Verification & Testing

- Unit tests for `EssayPreScoringService` mocking Gemini responses:
  - Test valid rubric evaluation.
  - Test empty student answer (scores 0).
  - Test score clamping (ensures values stay 0-4).
- Integration test for `POST /examination/grading/attempts/:attemptId/prescore`.
- Frontend component test verifying sliders reflect AI suggestions and allow manual overrides.

## Risks & Rollback

- **Medium Risk (AI Reliability / Rate Limits):** Handled by graceful fallback: if Gemini fails or times out, the instructor can grade manually as they do currently. No blocking dependencies.
- **Rollback:** Disable the pre-score endpoint and hide the UI action button.
