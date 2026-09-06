---
title: "Essay Rubric Pre-Scoring Architecture"
type: context
status: ready
created: "2026-09-06"
tags: [context, grading, essay, rubric, prescoring, deterministic, examination]
feature: "essay-rubric-prescoring"
---

# Essay Rubric Pre-Scoring Architecture Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  - In large-cohort assessments, instructors face significant grading friction when manually evaluating open-ended student essay responses without any automated baseline.
  - The platform already incorporates a standardized rubric subsystem (`app/sentinel-api/src/modules/examination/rubric`) supporting three hierarchical scopes:
    1. **Exam Override (`EXAM_OVERRIDE`):** Custom criteria and level descriptors configured specifically for a given exam.
    2. **Institution Baseline (`BASELINE`):** Institution-wide standard rubric.
    3. **System Fallback (`LEGACY`):** Default fallback rubric (`LEGACY_ESSAY_RUBRIC`).
  - Relying on external AI (Gemini) incurs API token costs per student submission, introduces quota and rate-limiting failure risks, and adds latency.
  - This feature establishes a **deterministic rubric-based pre-scoring engine** that evaluates student essay responses using the active rubric criteria, assigning Levels 0–4 with **0 external API tokens, 0 latency, and 100% explainable metrics**.

- **Business / User Value:**
  - Standardizes grading consistency across all instructors and exams according to institutional or course-specific rubric criteria.
  - Completely eliminates external API token expenditures and network dependencies during exam submissions and grading.
  - Sub-second instant evaluation with zero risk of prompt hallucination, network timeouts, or quota exhaustion.
  - Pre-populates student attempts so instructors open pre-graded evaluations while retaining 100% manual calibration and finalization authority.

- **Success Criteria:**
  - Active rubric definition is deterministically resolved (`EXAM_OVERRIDE` -> `BASELINE` -> `LEGACY`) via `RubricService.resolveEffectiveEssayRubric(dbClient, examId)`.
  - Essay text is evaluated across all active rubric criteria by a deterministic heuristic evaluation algorithm, outputting criterion scores (Levels 0–4) and analytical feedback.
  - Pre-scoring automatically triggers upon exam completion (`complete-session`), populating attempt evaluations prior to instructor review.
  - The instructor grading workspace (`/exams/grading/[examId]/[attemptId]`) displays pre-scored values with an on-demand *"Re-calculate with Rubric"* action to recalculate or reset values at will.
  - Empty or trivial responses (< 15 words) immediately receive Level 0 across all criteria with descriptive feedback.

---

## 2. Requirements & User Stories

### User Stories & Scenarios

- **US-01 (Automated Pre-Grading on Submission):**
  *As an instructor opening an exam attempt for review, I want essay questions to already have pre-calculated rubric scores based on the exam's rubric criteria, so that I don't have to evaluate each criterion from a blank slate.*
- **US-02 (Deterministic Standard Consistency):**
  *As an academic administrator, I want student essays to be pre-graded using objective, explainable metrics (length, structure, vocabulary, criteria alignment) conforming to our institutional or exam-specific rubric, without incurring AI token costs.*
- **US-03 (On-Demand Workspace Recalculation):**
  *As an instructor grading an attempt, I want a "Re-calculate with Rubric" button so that I can re-apply the standard rubric evaluation if I need to reset my adjustments or re-evaluate after checking the student's text.*

### Functional Requirements

1. **Deterministic Rubric Evaluation Engine (`@sentinel/shared` / `sentinel-api`):**
   - Implement `evaluateEssayWithRubric(studentText, prompt, rubricDefinition)`:
     - Normalizes student text (trims, splits into paragraphs, sentences, and words).
     - **Fast-Path Zeroing:** Empty, whitespace, or trivial submissions (< 15 words) receive Level 0 across all criteria with explanatory feedback.
     - **Criterion Scoring (Levels 0–4):**
       - `contentSubstance`: Content volume, vocabulary variety, key topic word density matching prompt/passage.
       - `structureOrganization`: Paragraph count, logical paragraph sizing, transition connective markers.
       - `argumentationSupport`: Elaboration depth, sentence variety, analytical phrasing markers.
       - `styleTone`: Academic register, formality, absence of colloquial shortcuts.
       - `grammarConventions`: Sentence mechanics, capitalization correctness, punctuation adherence.
       - **Custom Criteria Fallback:** For custom `EXAM_OVERRIDE` criteria not matching the standard 5 keys, evaluate based on general substance and structural completeness relative to the criterion description.
     - Returns `{ scores: Record<string, number>, feedback: string }`.

2. **Submission Lifecycle Trigger (`sentinel-api` / `complete-session`):**
   - In `complete-session.scoring.ts` / `complete-session.service.ts`:
     - When building the session scoring context, detect any questions where `type === 'ESSAY'`.
     - Resolve the effective rubric for the exam using `RubricService.resolveEffectiveEssayRubric(dbClient, examId)`.
     - Execute `evaluateEssayWithRubric` for each submitted essay response.
     - Persist the pre-scored evaluations into `_evaluations` and feed them into `buildScoreSnapshot()`.
     - Attempt's initial essay score is computed via `calculateEssayWeightedScore()`.

3. **Instructor Workspace Recalculation (`sentinel-web` / `useGradingAttempt`):**
   - Add a *"Re-calculate with Rubric"* action button in `GradingRubricPane.tsx`.
   - Clicking the button recalculates the active question's (or all essay questions') rubric scores using the deterministic engine and the active rubric definition.
   - Sliders and weighted point totals immediately update in the UI.
   - Instructors retain full ability to adjust sliders (0–4) and edit the feedback textarea before submitting/finalizing.

### Edge Cases & Failure Modes

- **Empty / White Space Submission:** Immediately scores 0 across all criteria with feedback: *"No substantive response submitted."*
- **Ultra-Short Submission (15–35 words):** Clamped to Level 0 or 1 with feedback noting insufficient development.
- **Custom Exam Override Rubric:** The evaluation engine dynamically loops through `rubricDefinition.criteria` array, computing scores for every defined criterion key.
- **Finalized Attempts:** Block re-calculation on attempts where `scoreState === 'FINALIZED'`.
- **Special Characters / Multilingual Input:** Unicode-safe word and sentence splitting to avoid crashes or miscounts.

---

## 3. Technical & Architectural Context

### Affected Domains & Packages

- **`packages/shared`:**
  - Export `evaluateEssayWithRubric(text, prompt, rubricDefinition)` in `packages/shared/src/exams/essay-rubric.ts`.
  - Add comprehensive unit tests in `essay-rubric.test.ts`.
- **`app/sentinel-api`:**
  - In `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.scoring.ts`:
    - Auto-evaluate submitted essays using `evaluateEssayWithRubric` and the resolved rubric during attempt turn-in.
    - Persist the generated evaluations into attempt answers metadata (`_evaluations`) and score snapshot.
- **`app/sentinel-web`:**
  - In `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/`:
    - `_components/grading-rubric-pane.tsx`: Add *"Re-calculate with Rubric"* action button.
    - `_hooks/use-grading-attempt/index.ts`: Expose `handleRecalculateRubric` to trigger deterministic re-scoring on the active question or all essay questions.

### Security & Authorization Boundaries

- Grading actions and score adjustments remain strictly protected by existing instructor authorization checks (`ensureExamGraderAccess`).
- Pre-scoring happens within the trusted backend server environment during turn-in.
- Client-side recalculation in the workspace is also validated upon final grade submission by the backend.

---

## 4. UI/UX & Interaction Guidelines

- **Rubric Header:** Displays the active rubric source tag (`Exam Override (vX)`, `Institution Baseline (vX)`, or `Legacy Rubric`) alongside the live weighted score.
- **Action Button:** Subtly styled outline button: `[Calculator / RotateCcw Icon] Re-calculate with Rubric`.
- **Toast Feedback:** On recalculation, displays an informative toast: *"Rubric pre-scoring applied."*
- **Slider Interactivity:** Instructors can immediately calibrate any slider (0 to 4) after pre-scoring.

---

## 5. Scope & Boundaries

### In Scope
- Implementing the deterministic essay evaluation algorithm in `@sentinel/shared`.
- Integrating automatic pre-scoring into the exam completion turn-in pipeline (`complete-session`).
- Exposing on-demand re-calculation in the instructor grading workspace (`GradingRubricPane`).
- Comprehensive unit and integration testing across shared, API, and web packages.

### Out of Scope / Non-Goals
- Any integration with Gemini, OpenAI, or external LLMs (strictly 0 tokens).
- Modifying rubric CRUD administration or authoring UI.
- Modifying auto-grading logic for objective question types (multiple choice, true/false, etc.).

---

## 6. Resolved Decisions Ledger

| Decision ID | Question | Decision | Rationale |
|---|---|---|---|
| DEC-01 | Pre-Scoring Evaluation Engine | Deterministic Rubric Heuristic Engine (Option 2) | 0 Gemini token consumption, zero quota/rate-limit vulnerability, instant local evaluation, fully explainable. |
| DEC-02 | Triggering Lifecycle | Hybrid (Option C): Auto-populate on submission + On-Demand "Re-calculate with Rubric" in workspace | Provides pre-graded attempts out-of-the-box on turn-in while giving instructors instant on-demand recalculation control in the grading UI. |
