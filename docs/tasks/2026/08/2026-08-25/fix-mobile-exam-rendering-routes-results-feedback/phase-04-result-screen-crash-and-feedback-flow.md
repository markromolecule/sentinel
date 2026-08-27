---
title: "Phase 4: Result Screen Crash Fix & Feedback Flow"
type: phase
parent: "fix-mobile-exam-rendering-routes-results-feedback"
phase: "4"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, result-screen, feedback, crash-fix]
---

# Phase 4: Result Screen Crash Fix & Feedback Flow

## Objective

Fix the `TypeError: questions.map is not a function` crash on the Result screen caused by `adaptExamForMobile` mapping `exam.questions` to a number. Ensure that scores and section breakdowns calculate safely, and verify that clicking "Turn In" on the Result Screen navigates to the post-exam feedback and rating screen.

## Dependencies & Prerequisites

- Phases 1, 2, and 3 completed.

## Impacted Files & Components

- `app/sentinel-mobile/features/exam/hooks/use-exam-result.ts`: Expose `questions: rawExam?.questions ?? []` alongside `exam`.
- `app/sentinel-mobile/features/exam/components/detail/result-view.tsx`: Pass array of questions into `buildExamAttemptQuestionReports` and normalize with `Array.isArray(questions) ? questions : []`.
- `app/sentinel-mobile/app/exam/[id]/result/index.tsx`: Pass `questions` to `ResultView` and verify `handleTurnIn` transitions to `/exam/[id]/feedback?attemptId=${sessionId}`.

## Implementation Tasks

- [x] In `use-exam-result.ts`, extract `questions: rawExam?.questions ?? []` and return `questions` in the hook output.
- [x] In `result/index.tsx`, pass `questions` into `<ResultView />`.
- [x] In `result-view.tsx`, update prop types and `buildExamAttemptQuestionReports` invocation:
  ```ts
  const questionList = Array.isArray(questions) ? questions : (Array.isArray(exam.questions) ? exam.questions : []);
  const reports = buildExamAttemptQuestionReports({
      questions: questionList,
      answers: answers as any,
  });
  ```
- [x] Ensure `use-exam-result.ts` `handleTurnIn` successfully calls `router.replace({ pathname: '/exam/[id]/feedback', params: { id, attemptId: sessionId } })`.

## Verification & Testing

- Run unit test suite:
  ```bash
  pnpm --filter sentinel-mobile test features/exam/hooks/use-exam-result.test.ts features/exam/components/detail/result-view.test.tsx
  ```
  - Result: Passed 5/5 tests (AC-5 & AC-6 verified).
- Run full monorepo test suite for mobile:
  ```bash
  pnpm --filter sentinel-mobile test
  ```
  - Result: 31/31 files passed, 154/154 tests passed in 1.44s.

## Risks & Rollback

- Revert question mapping if shared report signatures change.
