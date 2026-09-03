---
title: "Phase 1: History Score Release and Finalization Query Coalescing"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-001-grading-score-integrity-and-exam-rules/README.md"
phase: "01"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, history, grading, score-release]
---

# Phase 1: History Score Release and Finalization Query Coalescing

## Objective

Fix the history query desynchronization where finalized attempts fail to release scores and detailed reports to students when finalization occurs through lifecycle actions (`finalizeExamAttemptScore`) or bulk finalization, because the query checked only `answer_snapshot->_grading->>finalizedAt` rather than table columns `ea.finalized_at` and `ea.score_state = 'FINALIZED'`.

## Dependencies & Prerequisites

- Context Specification: [`docs/context/September/3/exam-grading-score-integrity-and-rules.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/3/exam-grading-score-integrity-and-rules.md) (Status: `ready`)

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts): Coalesce `ea.finalized_at::text` and snapshot `_grading.finalizedAt`, checking `ea.score_state = 'FINALIZED'`.
- [`app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.ts): Coalesce `ea.finalized_at::text` with snapshot metadata.
- [`app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts): Verify query selects and score release mapping when finalized via column only.
- [`app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.test.ts): Add regression tests for finalized attempt select resolution.

## Implementation Tasks

- [x] Task 1 — In `get-student-exam-history-detail.ts`, update the `attempt_finalized_at` select to:

  ```ts
  sql<string | null>`coalesce(
      ea.finalized_at::text,
      (ea.answer_snapshot->'_grading'->>'finalizedAt')::text
  )`.as('attempt_finalized_at')
  ```

- [x] Task 2 — In `build-student-attempt-selects.ts`, update the `attempt_finalized_at` subquery select to coalesce `ea.finalized_at::text` with snapshot `finalizedAt`.
- [x] Task 3 — In `get-student-exam-history-detail.test.ts` and `build-student-attempt-selects.test.ts`, add test cases verifying:
  - Attempt with `finalized_at` set on table but missing in `answer_snapshot` correctly sets `attempt_finalized_at`.
  - Manual release exam with `finalized_at` set releases score (`isHistoryScoreReleased === true`).
  - Unfinalized manual release exam keeps score hidden.

## Verification & Testing

- Command: `pnpm --filter sentinel-api test src/modules/examination/history` (PASS: 3 test files, 12 tests passed)
- Command: `pnpm --filter sentinel-api test src/modules/examination/reporting` (PASS: 7 test files, 26 tests passed)

## Risks & Rollback

- **Risk:** Coalescing may release scores prematurely if `finalized_at` was set erroneously.
- **Mitigation:** `finalized_at` is only populated upon explicit finalization by an instructor in `finalizeExamAttemptScore`, `updateGradingAttempt`, or `bulkFinalizeAttempts`.
