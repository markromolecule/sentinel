---
title: "Phase 1: Choice Randomization & Scoring Integrity"
type: phase
parent: "docs/tasks/2026/08/2026-08-28/fix-exam-system-production-issues/README.md"
phase: "1"
status: completed
created: "2026-08-28"
tags: [task, phase, scoring, randomization, integrity]
---

# Phase 1: Choice Randomization & Scoring Integrity (ISSUE-01)

## Objective

Guarantee 100% deterministic grading accuracy on randomized exams by stripping hardcoded choice label prefixes prior to shuffling, ensuring choice evaluation resolves by deterministic option token/sanitized text before array index fallback, and aligning preflight snapshot seeds.

## Dependencies & Prerequisites

- Audited context specification in [`docs/context/August/28/exam-system-production-issues-remediation.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/28/exam-system-production-issues-remediation.md).

## Impacted Files & Components

- **Modified:**
  - `packages/shared/src/exams/shuffle-exam.ts`: Strip choice label prefixes (e.g. `(A)`, `B.`, `1-`) during deterministic choice randomization and maintain mapped correct answers.
  - `packages/shared/src/exams/score-exam-attempt-answer-resolvers.ts`: Ensure choice matching checks option tokens and sanitized text content before relying on regex letter-to-index mapping.
  - `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`: Verify questions served to students strictly use the persisted `assessment_snapshot` when present.
- **Tests:**
  - `packages/shared/src/exams/score-exam-attempt.test.ts`: Add test cases for questions with baked-in prefix labels and randomized choice orders.
  - `app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.test.ts`: Add tests verifying snapshot choice consistency across multiple student seeds.

## Implementation Tasks

- [x] Task 1.1 — Update `packages/shared/src/exams/shuffle-exam.ts` `randomizeQuestionChoices`:
  - Strip prefix letters matching `/^\s*\(?([A-Z0-9])\)?(?:\s*[\.\):-]|\s+-)\s*/i` from raw option strings before shuffling so options are pure content.
  - Update `oldToNewMapping` to map `correctAnswer` indices accurately to new shuffled positions.
- [x] Task 1.2 — Update `packages/shared/src/exams/score-exam-attempt-answer-resolvers.ts`:
  - Enhance `resolveOptionToText` and `isCorrectMultipleChoice` to match by exact option text / option token before evaluating label regexes.
  - Prevent misplaced letter-prefix parsing when options have been reordered.
- [x] Task 1.3 — Audit `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`:
  - Confirm that student views load questions from the immutable `persistedSnapshot` if an active attempt exists, preventing preflight seed divergence.
- [x] Task 1.4 — Write comprehensive unit and regression tests in `score-exam-attempt.test.ts` verifying that option order variation yields identical accurate scores.

## Verification & Testing

- Run shared scoring test suite:

  ```bash
  pnpm --filter @sentinel/shared test score-exam-attempt
  # PASS: 11/11 tests passed
  ```

- Run API attempt snapshot test suite:

  ```bash
  pnpm --filter sentinel-api test attempt-snapshot
  # PASS: 4/4 tests passed
  ```

- Typecheck packages and API:

  ```bash
  pnpm --filter @sentinel/shared build
  pnpm --filter sentinel-api typecheck
  ```

## Risks & Rollback

- **Risk:** Existing exams with legacy raw index submissions might misalign if option text matching is overly strict.
- **Mitigation:** Retain multi-tier fallback: (1) option token matching, (2) sanitized text equality, (3) normalized stripped text, (4) bounded index fallback.
