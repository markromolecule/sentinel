---
title: "Phase 3: Backend Snapshot Consistency and Option Tokens"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-001-grading-score-integrity-and-exam-rules/README.md"
phase: "03"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, snapshot, option-tokens, multiple-choice]
---

# Phase 3: Backend Snapshot Consistency and Option Tokens

## Objective

Ensure that the backend API guarantees option token consistency for all Multiple Choice and Multiple Response questions served to students, preventing choice desynchronization between presented choices and the scored snapshot.

## Dependencies & Prerequisites

- Phase 1 and Phase 2 completed.

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts): Attach `optionTokens` when choices are randomized in fallback student view, ensuring parity with `buildPresentedQuestions`.
- [`app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts): Confirm option token generation and index remapping invariants across Multiple Choice and Multiple Response questions.
- Unit tests in `sentinel-api` for `get-exam-detail` and `attempt-snapshot`.

## Implementation Tasks

- [x] Task 1 — In `get-exam-detail.service.ts`, when preparing `finalQuestions` for student view where `persistedSnapshot` is not present, ensure `optionTokens` are generated if `randomizeChoices` is true:
  ```ts
  if (configurationState.settings.randomizeChoices) {
      finalQuestions = finalQuestions.map((q) => {
          const randomized = randomizeQuestionChoices(q, `${seed}-${q.id}`);
          if ((randomized.type === 'MULTIPLE_CHOICE' || randomized.type === 'MULTIPLE_RESPONSE') && Array.isArray(randomized.content.options)) {
              return {
                  ...randomized,
                  content: {
                      ...randomized.content,
                      optionTokens: buildOptionTokens(seed, randomized.id, randomized.content.options),
                  },
              };
          }
          return randomized;
      });
  }
  ```
- [x] Task 2 — In `attempt-snapshot.service.test.ts`, add test cases validating that `buildPresentedQuestions` and `buildScoreSnapshot` properly handle option tokens and correctly resolve single and multiple choice answers without index drift.

## Verification & Testing

- Command: `pnpm --filter sentinel-api test src/modules/examination/exams src/modules/examination/flow` (PASS: 30 test files, 182 tests passed)

## Risks & Rollback

- **Risk:** Option tokens change if seed changes.
- **Mitigation:** Seed is strictly deterministic (`attemptId` for active attempts), ensuring identical tokens across all reads of the same attempt.
