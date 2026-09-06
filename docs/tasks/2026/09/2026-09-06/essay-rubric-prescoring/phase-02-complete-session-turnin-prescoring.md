---
title: "Phase 2: Exam Turn-In Auto-Scoring Pipeline (sentinel-api)"
type: phase
parent: "essay-rubric-prescoring"
phase: "02"
status: completed
created: "2026-09-06"
tags: [task, phase, api, grading, essay, turnin]
---

# Phase 2: Exam Turn-In Auto-Scoring Pipeline (sentinel-api)

## Objective

Integrate the deterministic essay evaluation engine into the exam turn-in completion flow (`complete-session.scoring.ts`), automatically evaluating essay questions using the resolved rubric (`EXAM_OVERRIDE` -> `BASELINE` -> `LEGACY`) and persisting the pre-scored evaluations into the attempt answers metadata (`_evaluations`) and score snapshot.

## Dependencies & Prerequisites

- Phase 1 completed (`evaluateEssayWithRubric` available in `@sentinel/shared`).
- Existing `RubricService.resolveEffectiveEssayRubric` in `app/sentinel-api/src/modules/examination/rubric/services/rubric.service.ts`.

## Impacted Files & Components

- `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.scoring.ts`: Injects deterministic essay evaluations for essay questions into the session scoring context.
- `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.types.ts`: Added `evaluations` property to `CompleteSessionScoringContext` and `PersistCompleteSessionArgs`.
- `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.service.ts`: Passes pre-scored evaluations to persistence.
- `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.persistence.ts`: Persists pre-scored evaluations into `_evaluations` within the attempt's answer snapshot.
- `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.scoring.test.ts` (NEW): Test suite verifying deterministic essay pre-scoring on turn-in.

## Implementation Tasks

- [x] **Task 2.1: Detect Essay Questions & Resolve Active Rubric:**
  - In `buildCompleteSessionScoringContext`: inspect normalized questions for any item where `type === 'ESSAY'`.
  - Resolve the exam's effective rubric using `resolveAssessmentSnapshotRubric(assessmentSnapshot)`.
- [x] **Task 2.2: Evaluate Submitted Essays:**
  - For each essay question with a submitted answer string, run `evaluateEssayWithRubric(answer, question.content.prompt, rubric.definition)`.
  - Format the result as `{ scores: evaluation.scores, score: essayScore, feedback: evaluation.feedback }`.
  - Pass the generated evaluations into `buildScoreSnapshot()`.
- [x] **Task 2.3: Persist Pre-Scored Evaluations:**
  - In the session completion transaction, store the pre-scored evaluations in `attempt.answer_snapshot._evaluations`.
  - Total score accounts for the pre-evaluated essay score.
- [x] **Task 2.4: Integration Tests:**
  - Written unit tests in `complete-session.scoring.test.ts` verifying that an attempt with essay questions has its essay pre-scored and evaluations included in the score snapshot and question reports.

## Verification & Testing

- `vitest run src/modules/examination/flow/services/complete-session/complete-session.scoring.test.ts`: PASS (2/2 tests passed).
- `vitest run src/modules/examination/flow/services/complete-session/complete-session.persistence.test.ts`: PASS (5/5 tests passed).
- `vitest run src/modules/examination/grading/`: PASS (8/8 test files, 38/38 tests passed).

## Risks & Rollback

- **Low Risk:** Non-breaking enhancement to scoring context; falls back to default empty evaluations if no essay questions exist.
- **Rollback:** Disable the essay evaluation loop in `buildCompleteSessionScoringContext`.
