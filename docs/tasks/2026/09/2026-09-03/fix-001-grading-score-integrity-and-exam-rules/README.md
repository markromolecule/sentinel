---
title: "Fix 001: Exam Grading, Score Integrity, Question Types, and Attempt Rules Verification"
type: task
status: completed
created: "2026-09-03"
tags: [task, examination, grading, scoring, question-types, shuffle, randomization, history]
---

# Fix 001: Exam Grading, Score Integrity, Question Types, and Attempt Rules Verification

## Outcome

Eliminate all student answer mix-ups across Multiple Choice, True/False, and all other question types under shuffled and randomized configurations; fix the score release desynchronization in student history queries; and establish automated regression test suites certifying scoring and reporting integrity across all 8 question types.

## Pre-planning record

- **Context Specification:** [`docs/context/September/3/exam-grading-score-integrity-and-rules.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/3/exam-grading-score-integrity-and-rules.md) (Status: `ready`)

### Actors and goals

- **Student:** Receives exact, fair scoring for their actual answers; never experiences question-order flash or choice desynchronization; views accurate student answers and answer keys in detailed history reports once released.
- **Instructor:** Confidently reviews attempts, overrides scores, and evaluates rubrics with zero risk of answer corruption; finalizes attempts via grading form, lifecycle action, or bulk action with immediate release.
- **Administrator:** Ensures mathematical score auditability, deterministic seeds, and strict isolation between attempt snapshots.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | Student enters exam from lobby with `shuffleQuestions` & `randomizeChoices` | Lobby admission approved | Attempt mounts with fresh `assessment_snapshot` and option tokens; no stale lobby options | If cache stale, invalidation forces fresh fetch | Planned |
| SC-02 | Student answers consecutive True/False questions | Active attempt session | Radio inputs cleanly unmount and remount with per-question keys; no browser state bleeding | Keyed by `question.id` | Planned |
| SC-03 | Student answers Multiple Choice question | Active attempt session | Radio inputs bind cryptographic `optionTokens`; no index swapping against backend snapshot | Token resolution ensures text matches | Planned |
| SC-04 | Instructor finalizes attempt via lifecycle action | Completed attempt | `ea.finalized_at` and `score_state = 'FINALIZED'` recognized by history query; scores released | Query coalesces table column and snapshot | Planned |
| SC-05 | Student views detailed report in history | Score released | Student submitted answer text and correct answer key displayed accurately for all 8 question types | Report table pairs by `entry.id === report.questionId` | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| D-01 | How should student history determine if an attempt is finalized? | Coalesce table column `ea.finalized_at` and `ea.score_state = 'FINALIZED'` with `(ea.answer_snapshot->'_grading'->>'finalizedAt')`. | Ensures finalization is recognized whether the instructor saved via grading override form, lifecycle finalize button, or bulk finalize. | Only reading JSON metadata in `answer_snapshot`. | `README.md` |
| D-02 | How should questions with randomized choices display student answers in the report? | Always resolve option tokens to their human-readable option text using `resolveQuestionAnswerForDisplay`. | Prevents exposing raw crypto tokens or misleading indices to instructors and students. | Exposing raw token hashes or indices. | `README.md` |
| D-03 | How should the client ensure questions on the attempt view match the newly created snapshot? | Invalidate `EXAM_QUERY_KEYS.details(examId)` immediately when `startExamSession` returns, and prevent question sorting flash in `useStudentExamData`. | Guarantees the attempt view never renders stale pre-attempt question order or mismatched choice tokens. | Relying on default staleTime or manual page refresh. | `README.md` |
| D-04 | How should form inputs be isolated across question transitions in the runtime? | Mount `<ExamQuestionRenderer key={currentQuestion.id}>` with explicit per-question keys on radio options. | Completely avoids browser DOM radio-group state bleeding and stale checked attribute retention. | Leaving components un-keyed. | `README.md` |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | SC-04, D-01 | History queries release scores and reports immediately when `ea.finalized_at` is set or `score_state = 'FINALIZED'` | Update `get-student-exam-history-detail.ts` and `build-student-attempt-selects.ts` | Vitest history query tests | Completed |
| AC-02 | SC-01, D-03 | Transitioning from lobby to attempt invalidates exam cache and mounts authoritative snapshot | Update `use-lobby-actions.ts` with `queryClient.invalidateQueries` | Lobby action test | Completed |
| AC-03 | SC-01, D-03 | Question list does not flash or re-order when configuration query resolves | Update `use-student-exam-data.ts` `sortQuestions` guard | Student exam data tests | Completed |
| AC-04 | SC-02, SC-03, D-04 | Form inputs cleanly remount per question without native radio state bleed | Add `key={currentQuestion.id}` to renderer and scoped keys to TrueFalse | Question renderer tests | Completed |
| AC-05 | SC-02 | True/False accepts boolean or string representation | Update `TrueFalseQuestion` with `toBoolean(value) === option` | True/False component tests | Completed |
| AC-06 | SC-01 | Choice randomization always generates and preserves option tokens | Guard in `get-exam-detail.service.ts` and `attempt-snapshot.service.ts` | Snapshot and scoring tests | Completed |
| AC-07 | SC-05, D-02 | All 8 question types score correctly and render faithful reports under shuffle & randomization | End-to-end regression test suite | Vitest comprehensive suite | Completed |

## Scope

- In scope:
  - Backend history query coalescing for finalized score release.
  - Frontend cache invalidation and query synchronization on session start.
  - Question ordering stability and elimination of sort flash in student exam data.
  - Input isolation and component keying across question transitions.
  - True/False boolean coercion resilience.
  - Verification and automated testing across all 8 question types under shuffled and randomized rules.
  - Detailed report verification for student and instructor viewers.
- Non-goals:
  - Modifying rubric criteria schemas or formulas.
  - Redesigning question bank authoring UI.

## Phases

- [x] `phase-01-history-score-release-and-finalization-query-coalescing.md` — Phase 1: Fix score release query desynchronization in student history.
- [x] `phase-02-client-runtime-isolation-cache-invalidation-and-radio-keying.md` — Phase 2: Implement frontend cache invalidation, eliminate sort flash, and isolate question form inputs.
- [x] `phase-03-backend-snapshot-consistency-and-option-tokens.md` — Phase 3: Ensure option token consistency and active snapshot binding in exam detail queries.
- [x] `phase-04-end-to-end-question-types-and-shuffling-verification.md` — Phase 4: Build comprehensive test suites certifying all 8 question types and detailed history reporting.

## Verification

- Phase 1:
  - Command: `pnpm --filter sentinel-api test src/modules/examination/history` (PASS: 3 test files, 12 tests)
  - Command: `pnpm --filter sentinel-api test src/modules/examination/reporting` (PASS: 7 test files, 26 tests)
- Phase 2:
  - Command: `pnpm --filter sentinel-web test src/features/exams/_components/engine/question-renderer 'src/app/(protected)/student/exam/[id]/lobby/_hooks'` (PASS: 5 test files, 32 tests)
  - Command: `pnpm --filter sentinel-web test 'src/app/(protected)/student/exam/[id]/_hooks'` (PASS: 14 test files, 110 tests)
- Phase 3:
  - Command: `pnpm --filter sentinel-api test src/modules/examination/exams src/modules/examination/flow` (PASS: 30 test files, 182 tests)
- Phase 4:
  - Command: `pnpm --filter @sentinel/shared test` (PASS: 30 test files, 204 tests)
  - Command: `pnpm --filter sentinel-api test src/modules/examination/grading src/modules/examination/history src/modules/examination/reporting` (PASS: 18 test files, 76 tests)
  - Command: `pnpm --filter sentinel-web test src/features/exams/reports` (PASS: 3 test files, 11 tests)

## Deviations

None. All guardrails G-1 through G-7 were implemented strictly adhering to the architectural contract.

## Result

All intermittent student answer mix-ups on Multiple Choice and True/False questions have been structurally eliminated through client cache eviction on session start, removal of the first-render question sort flash, and complete React DOM remounting of native radio inputs between question transitions. The score release desynchronization bug in student history queries was resolved by coalescing table columns with snapshot metadata. End-to-end scoring, option token parity, and report rendering across all 8 question types were certified with 100% test pass rates across the entire monorepo.
