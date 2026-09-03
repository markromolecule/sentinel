---
title: "Exam Grading, Score Integrity, Question Types, and Attempt Rules Verification"
type: context
status: ready
created: "2026-09-03"
tags: [context, grill, examination, grading, scoring, question-types, shuffle, randomization, history]
feature: "exam-grading-score-integrity-and-rules"
---

# Exam Grading, Score Integrity, Question Types, and Attempt Rules Verification Context Specification

## 1. Overview & Objective

### Problem Statement

In an online examination and proctoring platform, students and instructors rely on exact score calculations, accurate question-to-answer associations, and consistent enforcement of exam rules (`shuffleQuestions`, `randomizeChoices`, and `autoReleaseScores`). Specific concerns and test anomalies have been identified:

1. **Multiple Choice & True/False Answer Mix-Ups on "Some" Students:**
   - During live testing, some students experienced answers mixed up or misattributed between questions, specifically on Multiple Choice and True/False questions.
   - Root cause investigation identified three intersecting mechanisms that caused this intermittently:
     - **Stale Pre-Attempt Cache & Seed Mismatch:** When students transitioned from the lobby to the attempt view, `useExamQuery` was not invalidated. The lobby-cached questions (which were generated prior to attempt creation using fallback pseudo-seed `${studentUserId}-${id}` without cryptographic `optionTokens`) remained in TanStack Query's cache. Students selected numeric indices from the stale lobby options list, while the backend scored their submission against the authoritative `assessment_snapshot` (which was seeded with `attemptId`).
     - **Initial-Render Sort Order Flash in `use-student-exam-data.ts`:** While `useExamConfigurationQuery` was resolving, `effectiveSettings.shuffleQuestions` defaulted to `false`, causing questions to sort by `orderIndex` on first render before abruptly re-ordering into shuffled order once configuration loaded. Any student interacting during this window answered questions at the wrong position.
     - **Un-keyed Native Radio Inputs:** `<ExamQuestionRenderer>` lacked `key={currentQuestion.id}`, and `TrueFalseQuestion` used a static key `[true, false]`. When navigating between consecutive True/False or Multiple Choice questions, browser DOM engines reused the existing `<input type="radio">` nodes with mutated `name` attributes, leading to browser-level radio button state bleeding.
     - **Loose Boolean Type Reconciliation:** `TrueFalseQuestion` compared `value === option` strictly; if an answer draft or sync payload serialized the boolean as a string `"true"` or `"false"`, the UI failed to show the student's selected choice.
2. **History Score Release Desynchronization:**
   - In `get-student-exam-history-detail.ts:L71` and `build-student-attempt-selects.ts:L132`, `attempt_finalized_at` was queried exclusively from JSON metadata `(ea.answer_snapshot->'_grading'->>'finalizedAt')::text`.
   - When an instructor finalized an attempt via `finalizeExamAttemptScore` or when `score_state = 'FINALIZED'`, `ea.finalized_at` was set on the table, but `ea.answer_snapshot` was not modified. Consequently, `isHistoryScoreReleased()` returned `false`, keeping scores and detailed reports hidden from students even after instructor finalization.
3. **End-to-End Question Type and Detailed Report Integrity:**
   - Across all 8 question types (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `FILL_BLANK`, `MATCHING`, `ENUMERATION`, `ESSAY`), verify that student answers and answer keys are accurately mapped, scored, and displayed without question or answer mismatch in `AttemptReportTable`.

### Business & User Value

- **Students** receive fair, mathematically verifiable grading that preserves their exact submitted responses across shuffled and randomized question presentations, with timely access to scores once released.
- **Instructors** gain trustworthy attempt reviews, reliable rubric evaluation and score overriding, and clear visibility of student answers versus answer keys.
- **Institutions** maintain academic auditability and eliminate risk of answer desynchronization or misgrading.

### Measurable Success Criteria

- **Zero Question-Answer Desynchronization:** 100% of student answers are mapped and scored against their corresponding question IDs across all 8 question types, regardless of deterministic question order shuffling or option choice randomization.
- **Hermetic Attempt Snapshot Isolation:** 100% of questions and choices displayed in the student attempt runtime are derived strictly from the active attempt's `assessment_snapshot`, with `optionTokens` bound to every Multiple Choice/Response choice.
- **No Un-keyed DOM Input Bleed:** Switching between questions of the same type guarantees a clean React unmount and mount cycle for all form inputs.
- **Consistent Score Snapshot Integrity:** Scores computed during `/flow/prepare`, persisted during `/flow/complete`, and reviewed during `/grading` or `/reporting` match identically, verified through the SHA-256 `answerChecksum` and item-level `questionReports`.
- **Accurate Score Release & Finalization Flow:**
  - Auto-release exams with all-objective questions release scores and reports immediately upon turn-in.
  - Manual-release exams and exams with essay questions protect unfinalized scores, releasing immediately once finalized (via either `updateGradingAttempt`, `finalizeExamAttemptScore`, or `bulkFinalizeAttempts`).
- **Faithful Detailed Report Display:** The student detailed history dialog displays the human-readable string representation of the student's actual selected/typed response and the correct answer key for every question type.

---

## 2. Requirements & Guardrails

### User Stories

- **As a student**, I want my answers to be accurately scored against the exact questions I was presented with, even when question order is shuffled and choices are randomized.
- **As a student**, I want to see my actual submitted answers and the instructor answer keys in my detailed attempt report when scores are released, so that I can learn from my mistakes.
- **As an instructor**, I want to review, override, and finalize student scores with criteria-level rubric feedback without fear that student answers will be corrupted or mismatched with other questions.
- **As an academic administrator**, I want deterministic auditability across all attempts, ensuring that question seeds, answer hashes, and score snapshots are permanently linked.

### Guardrails Checklist

- [ ] **Guardrail G-1 (Frontend Cache Invalidation & Session Binding):**
  - Invalidate `EXAM_QUERY_KEYS.details(examId)` immediately when `startExamSession` succeeds in `use-lobby-actions.ts` and `use-exam-session.ts`, ensuring the attempt page only mounts with the authoritative `assessment_snapshot`.
- [ ] **Guardrail G-2 (Stable Questions Loading & No Flash Sort):**
  - Prevent the `sortQuestions` flash in `use-student-exam-data.ts` by holding question presentation stable while configuration is resolving, and prioritizing `exam.settings` over delayed configuration queries.
- [ ] **Guardrail G-3 (Component Keying & Radio Group Isolation):**
  - Add `key={currentQuestion.id}` to `ExamQuestionRenderer` in `exam-attempt-runtime-question.tsx`.
  - Use `key={`${question.id}-${option ? 'true' : 'false'}`}` in `TrueFalseQuestion`.
  - Guarantee 100% clean unmount/mount of native radio inputs between question transitions.
- [ ] **Guardrail G-4 (Robust True/False Coercion):**
  - Support boolean or string representation in `TrueFalseQuestion` using `toBoolean(value) === option`.
- [ ] **Guardrail G-5 (Backend Snapshot Verification Guard):**
  - Ensure `get-exam-detail.service.ts` checks for the active session's snapshot and attaches `optionTokens` whenever randomizing choices.
- [ ] **Guardrail G-6 (History Score Release Query Coalescing):**
  - In `getStudentExamHistoryDetail` and `build-student-attempt-selects`, coalesce `ea.finalized_at` with `ea.answer_snapshot->'_grading'->>'finalizedAt'` and check `ea.score_state = 'FINALIZED'` so that attempts finalized via lifecycle actions properly trigger `isHistoryScoreReleased()`.
- [ ] **Guardrail G-7 (End-to-End Verification Across All 8 Question Types):**
  - `MULTIPLE_CHOICE`: Tokenized options map back to original choice values; correctness and display text verified.
  - `MULTIPLE_RESPONSE`: Token sets and multi-string arrays evaluate all-or-nothing correctness; display text joined cleanly.
  - `TRUE_FALSE`: Strict boolean parsing and matching; displays as True / False.
  - `IDENTIFICATION`: Case-sensitivity rules applied; compares against single string or accepted answer arrays.
  - `FILL_BLANK`: Multi-blank array positional evaluation; blanks sanitized during attempt and resolved during scoring.
  - `MATCHING`: Left-right key-value pairing; answers preserved as key-value objects and formatted cleanly in reports.
  - `ENUMERATION`: Order-independent set matching of non-empty responses against accepted answer lists.
  - `ESSAY`: Rubric evaluation (5 criteria, 0-4 points); marks attempt as requiring manual review until instructor finalized.

---

## 3. Technical & Architectural Context

### Affected Domains & Layers

- **Shared Library (`packages/shared`):**
  - `score-exam-attempt-answer-resolvers.ts` (All 8 question type correctness & display resolvers)
  - `score-exam-attempt-reports.ts` (`buildExamAttemptQuestionReports`)
  - `shuffle-exam.ts` (`shuffleExamQuestions`, `randomizeQuestionChoices`)
- **Backend API (`app/sentinel-api`):**
  - `attempt-snapshot.service.ts` (`buildPresentedQuestions`, `buildScoreSnapshot`, `buildAssessmentSnapshot`)
  - `complete-session.scoring.ts`, `complete-session.persistence.ts`
  - `get-exam-detail.service.ts` (Active snapshot verification and optionToken consistency)
  - `get-grading-attempt-detail.service.ts`, `update-grading-attempt.service.ts`
  - `finalize-exam-attempt-score.ts`, `bulk-finalize-attempts.service.ts`
  - `get-student-exam-history-detail.ts`, `build-student-attempt-selects.ts`
  - `get-attempt-report.ts`
- **Frontend Client (`app/sentinel-web`):**
  - `app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts` (Cache invalidation upon session start)
  - `app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts` (Prevent sort flash while config is loading)
  - `features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-question.tsx` (Add `key={currentQuestion.id}`)
  - `features/exams/_components/engine/question-renderer/_components/true-false-question.tsx` (Per-question keys and boolean coercion)
  - `features/exams/_components/engine/question-renderer/_components/multiple-choice-question.tsx` (Per-question input isolation)
  - `features/exams/reports/` (`AttemptReportView`, `AttemptReportTable`, `useAttemptReport`)
  - `app/(protected)/student/history/details/` (`history-details-content.tsx`, `attempt-report-dialog.tsx`)

---

## 4. Scope & Boundaries

### In Scope

- End-to-end verification and regression testing for all 8 question types.
- Verifying deterministic behavior of `shuffleQuestions` and `randomizeChoices`.
- Fixing the client-side cache staleness and input reconciliation bugs causing Multiple Choice and True/False mix-ups.
- Fixing the score release desynchronization bug where `finalized_at` is set in the database table but not reflected in student history queries.
- Ensuring the student detailed history report renders exact submitted answers and correct answers.

### Non-Goals

- Changing the rubric criteria definitions or essay scoring formulas.
- Altering the exam creation or question bank authoring UI.

---

## 5. Decision Ledger

| ID | Decision Question | Selected Option | Rationale |
| --- | --- | --- | --- |
| D-01 | How should student history determine if an attempt is finalized? | Coalesce table column `ea.finalized_at` and `ea.score_state = 'FINALIZED'` with `(ea.answer_snapshot->'_grading'->>'finalizedAt')`. | Ensures finalization is recognized whether the instructor saved via grading override form, lifecycle finalize button, or bulk finalize. |
| D-02 | How should questions with randomized choices display student answers in the report? | Always resolve option tokens to their human-readable option text using `resolveQuestionAnswerForDisplay`. | Prevents exposing raw crypto tokens or misleading indices to instructors and students. |
| D-03 | How should the client ensure questions on the attempt view match the newly created snapshot? | Invalidate `EXAM_QUERY_KEYS.details(examId)` immediately when `startExamSession` returns, and prevent question sorting flash in `useStudentExamData`. | Guarantees the attempt view never renders stale pre-attempt question order or mismatched choice tokens. |
| D-04 | How should form inputs be isolated across question transitions in the runtime? | Mount `<ExamQuestionRenderer key={currentQuestion.id}>` with explicit per-question keys on radio options. | Completely avoids browser DOM radio-group state bleeding and stale checked attribute retention. |
