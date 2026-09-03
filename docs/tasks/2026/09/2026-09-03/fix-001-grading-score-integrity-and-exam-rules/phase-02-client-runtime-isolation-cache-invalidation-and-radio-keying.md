---
title: "Phase 2: Client Runtime Isolation, Cache Invalidation, and Radio Keying"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-001-grading-score-integrity-and-exam-rules/README.md"
phase: "02"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, runtime, cache, radio-buttons, multiple-choice, true-false]
---

# Phase 2: Client Runtime Isolation, Cache Invalidation, and Radio Keying

## Objective

Prevent the Multiple Choice and True/False answer mix-up on students by invalidating stale lobby queries when an attempt session starts, eliminating the first-render question sort flash in `useStudentExamData`, and strictly isolating question form inputs by adding explicit per-question React keys to `<ExamQuestionRenderer>` and `<TrueFalseQuestion>`.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts): Invalidate `EXAM_QUERY_KEYS.details(examId)` immediately when `startExamSession` returns so the attempt view does not load stale lobby options.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts): Hold question presentation stable while configuration query is loading to avoid sorting flash.
- [`app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-question.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-question.tsx): Add `key={currentQuestion.id}` to `<ExamQuestionRenderer>` to force clean unmount/mount of native radio inputs between question transitions.
- [`app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/true-false-question.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/true-false-question.tsx): Use `key={`${question.id}-${option ? 'true' : 'false'}`}` and coerce boolean value with `toBoolean(value) === option`.
- Unit tests for lobby actions, student exam data, and question renderer.

## Implementation Tasks

- [x] Task 1 — In `use-lobby-actions.ts`, import `useQueryClient` and `EXAM_QUERY_KEYS`. After `startExamSession` resolves successfully, call:
  ```ts
  await queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.details(examId) });
  ```
- [x] Task 2 — In `use-student-exam-data.ts`, update `sortQuestions` and `effectiveSettings`:
  - When `configuration` is still loading, do not prematurely sort by `orderIndex` if `exam?.settings?.shuffleQuestions` is true or if `configuration` is pending.
- [x] Task 3 — In `exam-attempt-runtime-question.tsx`, add `key={currentQuestion.id}` to `<ExamQuestionRenderer>`:
  ```tsx
  <ExamQuestionRenderer
      key={currentQuestion.id}
      mode="runtime"
      question={currentQuestion}
      ...
  />
  ```
- [x] Task 4 — In `true-false-question.tsx`:
  - Update container key from `key={option ? 'true' : 'false'}` to `key={`${question.id}-${option ? 'true' : 'false'}`}`.
  - Update `isSelected` to support boolean and string values:
    ```ts
    const resolvedValue = typeof value === 'string' ? value.toLowerCase() === 'true' : value;
    const isSelected = resolvedValue === option;
    ```
- [x] Task 5 — Update unit tests in `use-lobby-actions.test.tsx`, `use-student-exam-data.test.tsx`, and `question-renderer.test.tsx`.

## Verification & Testing

- Command: `pnpm --filter sentinel-web test src/features/exams/_components/engine/question-renderer 'src/app/(protected)/student/exam/[id]/lobby/_hooks'` (PASS: 5 test files, 32 tests passed)
- Command: `pnpm --filter sentinel-web test 'src/app/(protected)/student/exam/[id]/_hooks'` (PASS: 14 test files, 110 tests passed)

## Risks & Rollback

- **Risk:** Adding `key={currentQuestion.id}` forces React to unmount the renderer on question change.
- **Mitigation:** The active question's answer is already stored in `selectedAnswers[question.id]` in the parent hook, so remounting reads the clean value without losing state.
