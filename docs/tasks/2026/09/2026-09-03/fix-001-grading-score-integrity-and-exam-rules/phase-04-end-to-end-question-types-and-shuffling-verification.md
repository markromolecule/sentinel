---
title: "Phase 4: End-to-End Question Types and Shuffling Verification Suite"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-001-grading-score-integrity-and-exam-rules/README.md"
phase: "04"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, testing, verification, question-types, shuffle, randomization, reports]
---

# Phase 4: End-to-End Question Types and Shuffling Verification Suite

## Objective

Build comprehensive automated regression tests verifying that all 8 question types (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `FILL_BLANK`, `MATCHING`, `ENUMERATION`, `ESSAY`) score accurately and display their exact submitted answers and correct answers in detailed reports across all combinations of `shuffleQuestions` and `randomizeChoices`.

## Dependencies & Prerequisites

- Phases 1, 2, and 3 completed.

## Impacted Files & Components

- [`packages/shared/src/exams/score-exam-attempt.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/shared/src/exams/score-exam-attempt.test.ts): Add exhaustive tests covering all 8 question types with shuffling and randomization.
- [`app/sentinel-api/src/modules/examination/grading/services/grading-detail.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/services/grading-detail.test.ts): Verify that attempt reports retain exact student answers and correct answers across overrides and finalization.
- [`app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx): Verify that `AttemptReportTable` renders formatted student answers and correct answers for all 8 question types.

## Implementation Tasks

- [x] Task 1 — In `packages/shared/src/exams/score-exam-attempt.test.ts`, add a comprehensive end-to-end test suite:
  - Construct an exam with all 8 question types:
    1. `MULTIPLE_CHOICE` (randomized choices with tokens)
    2. `MULTIPLE_RESPONSE` (randomized choices with tokens)
    3. `TRUE_FALSE` (boolean true/false)
    4. `IDENTIFICATION` (case-sensitive & case-insensitive)
    5. `FILL_BLANK` (multiple blanks)
    6. `MATCHING` (prompt-to-match key-value pairs)
    7. `ENUMERATION` (order-independent set match)
    8. `ESSAY` (rubric-evaluated score)
  - Execute scoring with:
    - Normal order vs Shuffled order (`shuffleQuestions: true`)
    - Standard choices vs Randomized choices (`randomizeChoices: true`)
  - Assert that:
    - Correct score is awarded for each question type.
    - `buildExamAttemptQuestionReports` accurately produces `answer` (display text), `submittedAnswer`, and `correctAnswer`.
    - No student answer is swapped or misattributed to another question.
- [x] Task 2 — In `sentinel-web`, test `AttemptReportTable` rendering for all 8 question types, verifying that each question card displays:
  - Correct question prompt.
  - Formatted student answer string (e.g. `'Paris'`, `'true'`, `'key: val'`, `'blank1, blank2'`).
  - Formatted correct answer key string.
  - Awarded points vs maximum points badge.
- [x] Task 3 — Run full verification suites across `@sentinel/shared`, `sentinel-api`, and `sentinel-web`.

## Verification & Testing

- Command: `pnpm --filter @sentinel/shared test` (PASS: 30 test files, 204 tests passed)
- Command: `pnpm --filter sentinel-api test src/modules/examination/grading src/modules/examination/history src/modules/examination/reporting` (PASS: 18 test files, 76 tests passed)
- Command: `pnpm --filter sentinel-web test src/features/exams/reports` (PASS: 3 test files, 11 tests passed)

## Risks & Rollback

- **Risk:** High test execution time.
- **Mitigation:** Tests are purely unit/integration with Vitest in-memory fixtures, executing in under 5 seconds.
