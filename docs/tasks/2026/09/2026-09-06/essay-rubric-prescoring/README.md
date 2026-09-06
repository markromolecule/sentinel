---
title: "Deterministic Essay Rubric Pre-Scoring Architecture"
type: task
status: completed
created: "2026-09-06"
tags: [task, grading, essay, rubric, prescoring, deterministic]
---

# Deterministic Essay Rubric Pre-Scoring Architecture

## Outcome

1. Student essay responses are deterministically pre-scored using the active multi-criterion rubric (`EXAM_OVERRIDE` -> `BASELINE` -> `LEGACY`) with **0 Gemini API tokens, 0 latency, and 100% explainable metrics**.
2. Pre-scoring triggers automatically upon exam turn-in (`complete-session`), pre-populating attempt evaluations so instructors open pre-graded attempts.
3. Instructors retain full authority in the grading workspace (`/exams/grading/[examId]/[attemptId]`), equipped with an on-demand *"Re-calculate with Rubric"* action to recalculate or reset sliders to the deterministic rubric baseline.

## Pre-planning record

### Context Specification
- Context Document: [`docs/context/September/6/essay-rubric-prescoring.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/6/essay-rubric-prescoring.md)

### Actors and goals
- **Instructor (Exam Grader):** Wants submitted essay attempts to already have initial rubric-aligned scores and feedback, with the flexibility to recalibrate sliders or re-trigger rubric pre-scoring on demand.
- **Academic Administrator:** Wants standardized, explainable essay grading following institutional baseline or exam-specific rubric criteria without external API token costs.
- **Student (Examinee):** Receives timely, consistent evaluation based on the announced rubric criteria.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Student submits blank or trivial essay (<15 words) | Exam in progress, student turns in | Evaluates to Level 0 across all rubric criteria with explanatory note ("No substantive response submitted") | Fast-path zeroing | Verified |
| SC-02 | Student submits substantive multi-paragraph essay | Exam has active rubric (override or baseline) | Pre-scores each criterion (Levels 0–4) based on depth, organization, argumentation, tone, and grammar | Gracefully falls back to baseline if override missing | Verified |
| SC-03 | Instructor opens attempt in grading workspace | Attempt has submitted essay | Rubric sliders (0–4) pre-fill with pre-scored values; live weighted score reflects rubric math | Instructor can adjust sliders and save | Verified |
| SC-04 | Instructor adjusts sliders, then clicks "Re-calculate with Rubric" | Instructor modified sliders but wants to reset to rubric baseline | Sliders reset to the deterministic pre-scored levels with a confirmation toast | Instructor can still modify or submit | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Pre-scoring Evaluation Engine | Deterministic Rubric Heuristic Engine | 0 Gemini token consumption, zero quota/rate-limit vulnerability, instant local evaluation, fully explainable. | LLM (Gemini) API dependency | `docs/context/September/6/essay-rubric-prescoring.md` |
| DEC-02 | Triggering Lifecycle | Hybrid (Auto-populate on submission + On-Demand workspace recalculate) | Pre-grades attempts automatically on turn-in while giving instructors on-demand reset/recalculate controls in the UI. | Pure submission-only or pure manual-button-only | `docs/context/September/6/essay-rubric-prescoring.md` |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01 / DEC-01 | Blank or trivial (<15 words) essay responses evaluate to Level 0 across all criteria with descriptive feedback | `packages/shared/src/exams/essay-rubric-evaluator.ts` | Unit tests in `essay-rubric.test.ts` | Completed |
| AC-02 | SC-02 / DEC-01 | Substantive essay responses are evaluated across all defined rubric criteria (0–4) based on content, structure, argumentation, tone, and mechanics | `packages/shared/src/exams/essay-rubric-evaluator.ts` | Unit tests in `essay-rubric.test.ts` | Completed |
| AC-03 | SC-02 / DEC-02 | On exam turn-in (`complete-session`), essays are automatically pre-scored using the exam's effective rubric and persisted in `_evaluations` | `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.scoring.ts` | Complete session integration test | Completed |
| AC-04 | SC-03 / DEC-02 | Grading attempt workspace loads pre-scored evaluations into sliders and computes live weighted score | `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_hooks/use-grading-attempt/index.ts` | Component & hook tests | Completed |
| AC-05 | SC-04 / DEC-02 | Instructor can click "Re-calculate with Rubric" in `GradingRubricPane` to recalculate or reset sliders to the deterministic rubric baseline | `GradingRubricPane.tsx` + `useGradingAttempt` | Component interaction test | Completed |

## Scope

- Deterministic essay evaluation algorithm in `@sentinel/shared`.
- Automatic turn-in pre-scoring in `complete-session.scoring.ts`.
- Workspace recalculation action in `GradingRubricPane.tsx` and `useGradingAttempt`.
- End-to-end automated test suites.

## Non-goals

- No external LLM (Gemini) API calls or token consumption.
- No changes to rubric creation/versioning API.
- No changes to objective question auto-grading.

## Phases

- [x] `phase-01-deterministic-evaluation-engine.md` — Phase 1: Deterministic Essay Rubric Evaluation Engine (`@sentinel/shared`)
- [x] `phase-02-complete-session-turnin-prescoring.md` — Phase 2: Exam Turn-In Auto-Scoring Pipeline (`sentinel-api`)
- [x] `phase-03-workspace-recalculation-ux.md` — Phase 3: Grading Workspace On-Demand Recalculation UX (`sentinel-web`)
