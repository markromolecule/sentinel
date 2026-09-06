---
title: "Phase 1: Essay Rubric Pre-Scoring Integration in prepareSessionService"
type: phase
parent: "fix-lobby-reentry-result-score-student-progress"
phase: "01"
status: completed
created: "2026-09-06"
tags: [task, phase, scoring, prepare-session, essay, rubric]
---

# Phase 1: Essay Rubric Pre-Scoring Integration in prepareSessionService

## Objective

Ensure that `prepareSessionService` calculates essay question rubric pre-scores identically to `completeSessionService`, eliminating the jarring score jump from `2/8` to `5/8` on the student `/result` page when clicking "Turn In".

## Dependencies & Prerequisites

- Context Specification: [`docs/context/September/6/fix-lobby-reentry-result-score-student-progress.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/6/fix-lobby-reentry-result-score-student-progress.md).
- Pure evaluation engine in `@sentinel/shared`: `evaluateEssayWithRubric` and `calculateEssayWeightedScore`.

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.ts): Add essay rubric evaluation to build `essayEvaluations` and pass to `buildScoreSnapshot()`.
- [`app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.test.ts): New test suite verifying essay scoring in `prepareSessionService`.

## Implementation Tasks

- [x] **Task 1.1 (Essay Pre-Scoring in `prepareSessionService`):**
  - In `prepare-session.service.ts`:
  - Import `calculateEssayWeightedScore` and `evaluateEssayWithRubric` from `@sentinel/shared`.
  - Filter `normalizedQuestions` for `type === 'ESSAY'`.
  - If essay questions exist, iterate through each question and compute:

    ```ts
    const studentAnswer = typeof body.answers[question.id] === 'string'
        ? (body.answers[question.id] as string)
        : null;
    const prompt = question.content && typeof (question.content as any).prompt === 'string'
        ? (question.content as any).prompt
        : '';
    const evaluation = evaluateEssayWithRubric(studentAnswer, prompt, rubric.definition);
    const essayScore = calculateEssayWeightedScore(
        evaluation.scores,
        question.points,
        rubric.definition,
    );
    essayEvaluations[question.id] = {
        scores: evaluation.scores,
        score: essayScore,
        feedback: evaluation.feedback,
    };
    ```

  - Pass `evaluations: essayEvaluations` into `buildScoreSnapshot({ ... })`.

- [x] **Task 1.2 (Score Snapshot Parity Unit Tests):**
  - Create `prepare-session.service.test.ts` to assert:
    1. For an exam attempt with objective + essay items, `prepareSessionService` awards appropriate rubric score to the essay.
    2. The resulting `score`, `totalScore`, and `percentage` match `completeSessionService` for identical submitted answers.
    3. Blank / empty essay answers receive 0 points without errors.

## Verification & Testing

- Run test suite:

  ```bash
  pnpm --dir app/sentinel-api test src/modules/examination/flow/services/prepare-session.service.test.ts
  pnpm --dir app/sentinel-api test src/modules/examination/flow
  ```

## Risks & Rollback

- **Risk:** Minimal; `evaluateEssayWithRubric` is pure TypeScript with no network dependencies and sub-millisecond execution time.
- **Rollback:** Revert changes to `prepare-session.service.ts` to omit `evaluations`.
