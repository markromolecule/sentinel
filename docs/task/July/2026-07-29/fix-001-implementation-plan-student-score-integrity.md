# Student Score and Shuffled-Answer Integrity — Implementation Plan

## Status

- **Status:** In progress as of July 29, 2026
- **Issue Type:** Score integrity, attempt grading, randomized choices, and reporting consistency
- **Affected Workspaces:** `app/sentinel-api`, `app/sentinel-web`, `packages/shared`,
  `packages/services`, and `packages/db`
- **Implementation State:** Phase 1 complete, Phase 2 complete, Phase 3 complete,
  Phase 4 complete, Phase 5 complete, Phase 6 complete, Phase 7 complete, Phase 8 implementation complete with broader validation blockers
- **Source Evidence:** The reported attempt displayed `0/5` on the pre-turn-in result page,
  `3/5` in student history, and `1/5` in the detailed question report.

## Current Progress

- **Completed on July 29, 2026**
    - Replaced browser-side score calculation with a server-authoritative prepare-submission flow.
    - Added `assessment_snapshot`, `score_snapshot`, and `scoring_version` to
      `exam_attempts`.
    - Added shared versioned snapshot schemas for persisted attempt and score records.
    - Persisted one frozen assessment snapshot per attempt and one score snapshot per submission.
    - Updated completion flow to score against the persisted assessment snapshot, not current
      exam questions.
    - Updated grading detail to prefer persisted assessment and score snapshots over report-time
      reconstruction.
    - Updated grading saves to write refreshed score snapshots while preserving
      `initial_score`.
    - Updated student exam detail retrieval to prefer persisted attempt snapshots when present.
    - Updated student history/detail mapping to carry and prefer persisted `score_snapshot`
      aggregates over stale attempt columns when available.
    - Added a history/report integrity warning when persisted `score_snapshot` aggregates do not
      match legacy attempt aggregate columns.
    - Added attempt-specific opaque option tokens for shuffled multiple-choice and
      multiple-response questions.
    - Updated token-aware scoring and report-answer display helpers so persisted attempts can be
      scored and displayed independent of option position.
    - Added one shared answer-value schema and tightened the flow DTO contracts to validate
      supported tokenized and legacy answer shapes instead of unrestricted `any`.
    - Added focused shared and web tests for token-backed submission, rerender persistence, and
      invalid-token handling.
    - Finalized Phase 3 token hardening with duplicate-label-safe token scoring, attempt-isolated
      token generation tests, shuffled token scoring coverage, and cross-attempt token reuse
      protection.
    - Enriched persisted score snapshots with answer-payload checksums and item-level scoring
      metadata for submitted answer, display answer, objective award, manual-review state, and
      scoring version.
    - Updated prepare and complete submission flows to derive and reuse an explicit answer-payload
      checksum.
    - Recorded `SUBMITTED` lifecycle events with scoring-version and checksum metadata, without
      storing answer keys in event metadata.
    - Hardened completion writes so only still-in-progress, not-yet-completed attempts are
      finalized by the completion mutation.
    - Finalized Phase 4 submission hardening with transactional completion, idempotent same-checksum
      repeat-submit handling, and stale preparation-token rejection.
    - Added a cross-surface consistency test asserting that prepared score, submitted baseline,
      history baseline, and persisted objective award sums stay aligned.
    - Updated exam reporting queries and analytics aggregates to prefer persisted
      `score_snapshot` score, total, and percentage values before falling back to legacy attempt
      columns.
    - Updated report summary mapping to respect persisted percentage values even when legacy
      aggregate columns drift.
    - Hardened question-content validation to reject duplicate multiple-choice options and
      duplicate multiple-response answer keys.
    - Added an exam-structure guard that rejects question sets whose total score is not positive.
    - Fixed the instructor exam edit form to preserve resolved inherited defaults and explicit
      zero-valued passing scores instead of replacing them with hardcoded fallbacks.
    - Updated the instructor exam rules settings UI to label effective values as inherited or
      exam-specific overrides when institution defaults are available.
    - Added a dry-run-first attempt snapshot audit script that classifies legacy completed
      attempts into safe backfills, unresolved unfinalized attempts, and finalized review cases.
    - Extended the audit script with resumable cursor-based batching and batch summary metadata for
      safe backfill counts, unresolved attempts, and finalized review cases.
    - Added an aggregate multi-batch audit runner with optional JSON report-file output for
      pre-deployment review and handoff.
    - Added shared structured score-integrity observability checks at prepare, commit, history,
      report, and instructor-grading boundaries.
    - Added rollout-only dual-read mismatch telemetry for unfinalized grading/report reads while
      continuing to keep persisted snapshots as the only user-facing source of truth.
    - Added script coverage for exact-match dry runs, apply-mode revision marking, and finalized
      no-op handling.
    - Added targeted API and web test coverage for the new prepare/submit and grading flow.
    - Passed the focused score-integrity regression suite across flow, history, reporting,
      grading, and history mapping surfaces.
    - Passed `packages/shared` and `packages/services` Vitest suites after the Phase 8 changes.
- **Open as of July 29, 2026**
    - Repository-wide validation still has pre-existing blockers outside the score-integrity
      change set, including database-dependent failures in `packages/db` and `app/sentinel-api`
      plus unrelated failing/hanging specs in `app/sentinel-web`.
    - Manual rollout verification and production backfill execution still need operator follow-through.
    - Validation follow-up is tracked separately in
      `docs/task/2026-07-29/fix-002-validation-follow-up-student-score-integrity.md`.

## Goal

Make one server-authoritative, attempt-specific scoring record the source of truth for the
pre-turn-in review, submitted attempt, student history, detailed report, instructor grading,
exports, and analytics. Question shuffling, choice randomization, inherited settings, reconnects,
and later exam edits must not change the meaning or awarded score of an answer that a student
already submitted.

Before instructor finalization, the automatically graded baseline must already be accurate and
immutable. Instructor actions may add essay scores, bonuses, or explicit item overrides, but must
not silently recalculate objective answers against a different question or choice arrangement.

## Pre-Planning Summary

- **Student review path:** The browser calculates a score from sanitized questions in
  `use-attempt-submission.ts`.
- **Submission path:** `completeSessionService()` fetches current questions and effective
  settings, rebuilds the shuffle from the attempt ID, calculates the score, and writes
  `exam_attempts.score`.
- **History path:** Student history reads the stored `exam_attempts.score` and `total_score`.
- **Detailed-report path:** `getGradingAttemptDetail()` rebuilds question reports from current
  exam questions and the raw `exam_configurations.randomize_choices` value.
- **Instructor grading path:** `updateGradingAttempt()` rebuilds question reports and can replace
  the stored score before finalization.
- **Answer representation:** Multiple-choice and multiple-response answers are persisted as
  indexes into the presented option array.
- **Migration Required:** Yes. An attempt-time assessment snapshot and persisted scoring snapshot
  are required to guarantee historical integrity.

## Confirmed Findings

### 1. The pre-turn-in score is calculated without answer keys

`app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`
calls `scoreExamAttempt()` with the questions returned to the student.

`app/sentinel-api/src/modules/examination/exams/services/student-question-sanitizer.service.ts`
correctly removes `correctAnswer`, `correctBoolean`, and `acceptedAnswers`, and obfuscates matching
and fill-in answers before those questions reach the browser. Consequently, the browser cannot
grade those questions accurately. The reported `0/5` is consistent with this behavior.

### 2. History displays the server submission score

`app/sentinel-api/src/modules/examination/flow/services/complete-session.service.ts` performs a
second score calculation with unsanitized server questions. It writes the aggregate score through
`completeAttempt()`.

`app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts`
then reads `ea.score` and `ea.total_score`. This explains why history can show a different result
from the pre-turn-in page.

### 3. Detailed reports recalculate instead of reading submitted item results

`app/sentinel-api/src/modules/examination/grading/services/get-grading-attempt-detail.service.ts`
loads the current exam questions, conditionally randomizes them, and calls
`buildExamAttemptQuestionReports()`.

This recalculation does not use a persisted attempt-time question snapshot. It also reads only the
raw `exam_configurations.randomize_choices` field instead of the effective setting resolved from
global defaults. If the exam inherits `randomizeChoices: true` through a nullable override, the
attempt can be randomized during submission but treated as unrandomized in the report.

### 4. The presentation seed is not guaranteed at first question retrieval

`getExamDetail()` uses `resolvedExam.attempt_id` as its preferred shuffle seed but falls back to
`${studentUserId}-${examId}` when an attempt is not yet visible to that query. Submission always
prefers the created attempt ID.

The lobby starts the session and then navigates to the attempt route without binding the returned
attempt ID to a dedicated question-presentation request. A stale or early exam query can therefore
show one permutation while submission grades another.

### 5. Numeric option indexes are presentation-dependent

The multiple-choice and multiple-response renderers submit option indexes. An index such as `0`
means only “the first displayed option”; it does not identify the underlying canonical choice.
The answer becomes ambiguous if any consumer rebuilds a different option order.

### 6. Instructor saves can alter the automatic baseline

`updateGradingAttempt()` rebuilds question reports from current question data and writes the
resulting total to `exam_attempts.score`, even for a non-finalizing save. `initial_score` is
captured only on the first instructor save instead of at submission time.

This means the supposedly automatic baseline can be replaced before finalization by a
recalculation that does not necessarily represent the student's presented examination.

## Score Integrity Invariants

The implementation must enforce these invariants:

```text
prepared submission score
    = submitted initial_score
    = student history baseline
    = sum(persisted objective item awards)
    = instructor grading objective baseline
```

After submission:

```text
current score
    = immutable objective baseline
    + essay awards
    + explicit item override deltas
```

Additional invariants:

- One attempt always reuses the same resolved settings, question order, and option order.
- A submitted answer identifies a canonical option, not a visual array position.
- Reports never determine historical correctness from current exam configuration or question data.
- `total_score` is captured from the attempt snapshot and is immutable after submission.
- Finalized attempts cannot be silently regraded or repaired.
- Every instructor adjustment records actor, timestamp, reason, previous award, and new award.

## Options — 1-3-1 Rule

### Option A — Patch the Three Screens

- Remove the local preview score.
- Make the report use `getExamConfigurationState()` rather than the raw configuration field.
- Keep rebuilding scores from current questions.

**Tradeoff:** This is the smallest and fastest patch, but question edits, seed races, legacy
numeric answers, and future configuration changes can still alter reports and instructor grading.
It fixes the visible case without fully guaranteeing grade integrity.

### Option B — Attempt Snapshot and Persisted Score Record

- Freeze effective settings, question content, points, answer keys, question order, and choice
  order when the attempt starts.
- Replace client grading with a server-side prepared-submission flow.
- Persist item-level scoring results at submission.
- Make history, detailed reports, and instructor grading consume the persisted record.
- Introduce stable attempt-specific option tokens.

**Tradeoff:** Requires coordinated API, database, shared-contract, and frontend changes plus a
controlled historical backfill. It provides a durable and auditable grading boundary.

### Option C — Fully Relational Assessment Ledger

- Introduce dedicated attempt-question, presented-choice, submitted-answer, item-award, and score
  revision tables.
- Store every scoring and override event as an append-only ledger.

**Tradeoff:** This provides the strongest audit model and relational queryability, but it is a
large schema and reporting rewrite. It is disproportionate for the immediate issue and carries a
much larger migration risk.

## Recommendation

**Choose Option B.**

It fixes the current inconsistency while establishing an immutable attempt boundary. JSON-based
snapshots fit the repository's existing `answer_snapshot` approach and avoid the full rewrite of
Option C. Unlike Option A, it protects scores from mid-attempt edits, inherited-setting
differences, reconnects, and reporting recalculation.

## Phase 1: Remove Non-Authoritative Browser Grading

**Goal:** Stop showing scores calculated from sanitized student questions.

- [x] In
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`,
      remove the `scoreExamAttempt()` call and stop creating a locally graded
      `StoredExamTurnInPreviewSummary`.
- [x] Retain only non-sensitive local review data such as answered count, unanswered count,
      elapsed time, and whether the submission is being prepared.
- [x] Add a server-side prepare-submission operation under
      `app/sentinel-api/src/modules/examination/flow` that accepts `sessionId`, answers, and elapsed
      time; validates ownership and lifecycle state; calculates the authoritative preview; and
      returns an opaque preparation token.
- [x] Add the prepare-submission request and response schemas to
      `app/sentinel-api/src/modules/examination/flow/flow.dto.ts`.
- [x] Add the matching service client to `packages/services/src/api/exams`.
- [x] Update
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` to render the
      server-returned prepared summary and commit its preparation token when Turn In is selected.
- [x] Make preparation idempotent for the same attempt, answer payload hash, and lifecycle state.
- [x] Decide and document the back-navigation behavior: returning to the attempt invalidates the
      preparation token and requires a new preparation request after answers change.
- [ ] Extend `use-attempt-submission.test.tsx` to prove sanitized questions are never graded in
      the browser.
- [ ] Extend `result/page.test.tsx` for prepare success, prepare failure, commit success,
      idempotent retry, invalidated preparation, and hidden-score release modes.

**Migration required:** No for the temporary endpoint contract. Phase 2 supplies durable snapshot
storage before the prepared flow is released to production.

## Phase 2: Persist an Attempt-Time Assessment Snapshot

**Goal:** Freeze exactly what was presented and exactly how it must be graded.

- [x] Add nullable JSON fields to `exam_attempts` in `packages/db/prisma/schema.prisma`:
    - `assessment_snapshot`
    - `score_snapshot`
- [x] Add a nullable `scoring_version` string field to `exam_attempts`.
- [x] Create a Prisma migration under `packages/db/prisma/migrations` with comments describing
      the immutability and server-only nature of the snapshot columns.
- [ ] Extend generated database types through the repository's normal database type-generation
      process.
- [x] Add versioned shared internal snapshot schemas under
      `packages/shared/src/schema/exams`, including:
    - resolved effective settings;
    - attempt shuffle seed;
    - ordered question IDs;
    - attempt-time question type, points, and content;
    - canonical answer key or equivalent frozen graded question content;
    - presented choice order;
    - source question/version metadata when available.
- [x] Create an API helper under
      `app/sentinel-api/src/modules/examination/flow/services` that builds an assessment snapshot
      only from unsanitized server data.
- [x] Update `startSessionService()` and session creation so a fresh attempt persists its
      assessment snapshot immediately after session creation. A follow-up hardening pass should
      make this one transaction.
- [x] Return sanitized presented questions derived from the persisted snapshot as part of the
      session-start response or through an attempt-bound endpoint requiring the returned
      `attemptId`.
- [x] Ensure resumed attempts return the existing persisted snapshot and never rebuild their
      order from current exam settings when a snapshot exists.
- [x] Prevent student-facing DTOs, logs, telemetry, and client caches from receiving the
      canonical answer key or token-to-answer mapping.
- [ ] Add API tests for fresh attempts, resumes, inherited settings, explicit overrides, and an
      exam/configuration edit after the attempt has started.
- [ ] Add a security contract test proving student session responses contain no answer-key fields.

**Migration required:** Yes.

**Rollback:** Remove application reads first, then drop `assessment_snapshot`, `score_snapshot`,
and `scoring_version`. Do not drop the columns while any deployed API version requires them.

## Phase 3: Introduce Stable Attempt-Specific Choice Tokens

**Goal:** Make submitted choices independent of their visual position.

- [x] Status: Complete
- [x] Extend the presented-question contract with opaque option tokens that are stable for the
      lifetime of one attempt and do not disclose the original option index.
- [x] Store the token-to-canonical-choice mapping only inside the server assessment snapshot.
- [x] Update
      `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/multiple-choice-question.tsx`
      to submit one option token instead of an array index.
- [x] Update
      `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/multiple-response-question.tsx`
      to submit a set of option tokens instead of indexes.
- [x] Update `ExamAnswerValue`, `ExamAttemptAnswerValue`, and the flow DTO schemas without
      weakening validation to unrestricted `any`.
- [x] Add a compatibility resolver for legacy numeric-index attempts. Limit it to historical
      attempts that do not have a versioned assessment snapshot.
- [x] Update answer display helpers so reports show the submitted option text, not a raw token or
      numeric index.
- [x] Add shared tests for shuffled multiple choice, shuffled multiple response, duplicate option
      labels, labeled legacy choices, invalid tokens, and token reuse across attempts.
- [x] Add renderer tests proving a selected token remains selected after rerender and resume.

**Migration required:** No additional migration beyond Phase 2; the mapping is stored in the
assessment snapshot.

## Phase 4: Persist One Item-Level Score Snapshot at Submission

**Goal:** Create the immutable automatic baseline used by every score consumer.

- [x] Extend `packages/shared/src/exams/score-exam-attempt*` with a versioned server-oriented
      scoring result that includes an item result for every attempt question:
    - question ID and type;
    - submitted canonical answer;
    - display-safe submitted answer;
    - correctness;
    - awarded objective points;
    - maximum points;
    - manual-review state;
    - scoring version.
- [x] Update prepare-submission to score only against `assessment_snapshot`.
- [x] Hash the prepared answer payload and store its authoritative item and aggregate results in
      `score_snapshot`.
- [x] Update commit submission to verify the preparation token and payload hash, then write in one
      transaction:
    - `answer_snapshot`;
    - `score_snapshot`;
    - `initial_score`;
    - `score`;
    - `total_score`;
    - answered count;
    - completion and lifecycle fields.
- [x] Make `initial_score`, the automatic portion of `score_snapshot`, and `total_score`
      write-once after successful submission.
- [x] Change `completeAttempt()` to update only an owned `IN_PROGRESS` attempt with the expected
      preparation version; treat zero updated rows as an idempotent completion or lifecycle
      conflict.
- [x] Record a `SUBMITTED` lifecycle event containing the scoring version and snapshot checksum
      without recording answer keys.
- [x] Keep score-release policy separate from score correctness: hidden scores are still
      calculated and persisted but omitted from student responses until released.
- [x] Add API tests for double-click submission, concurrent commits, stale preparation tokens,
      answer changes after preparation, manual-release mode, essay questions, and zero-point
      invalid examinations.

**Migration required:** Uses the Phase 2 migration.

## Phase 5: Make History, Reports, and Grading Projections

**Goal:** Ensure every downstream surface projects the same persisted result.

- [x] Update student history services to continue reading aggregate `score` and `total_score`,
      but add an integrity assertion comparing them with `score_snapshot` for submitted attempts.
- [x] Update student history services to prefer persisted `score_snapshot` aggregates for
      submitted attempts when the snapshot is present.
- [x] Refactor
      `app/sentinel-api/src/modules/examination/grading/services/get-grading-attempt-detail.service.ts`
      to build detailed rows from the persisted assessment and score snapshots.
- [x] Remove its direct read of `exam_configurations.randomize_choices` and its report-time
      randomization.
- [x] Update `getAttemptReport()` so student and instructor detailed reports consume the same
      persisted item results.
- [x] Update report components to display display-safe submitted answers from the score snapshot,
      never raw numeric indexes or option tokens.
- [x] Refactor `updateGradingAttempt()` so it begins with the immutable objective awards from
      `score_snapshot` and applies only essay evaluations or explicit item overrides.
- [x] Prevent a feedback-only or draft save from recalculating objective correctness against
      current mutable exam data.
- [x] Persist override metadata with previous score, new score, reason, actor, and timestamp.
- [x] Keep `initial_score` unchanged on all instructor saves and finalization.
- [x] Update exports, analytics, and question-performance statistics to consume stored aggregate
      or item results instead of independently scoring current questions.
- [x] Add consistency tests asserting that the prepared score, submitted `initial_score`,
      history baseline, detailed-report objective award sum, and instructor objective baseline
      are equal.

**Migration required:** No additional migration beyond Phase 2.

## Phase 6: Solidify Question and Settings Validation

**Goal:** Ensure settings and answer keys are valid before any attempt snapshot is created.

- [x] Use `getExamConfigurationState()` or one shared effective-settings resolver in every
      student presentation, submission, reporting, and grading path.
- [x] In instructor settings UI, distinguish an inherited global value from an explicit exam
      override while showing the effective value that new attempts will receive.
- [x] Add publish-time validation for:
    - multiple-choice questions with at least two choices;
    - correct answers that reference an existing choice;
    - multiple-response keys containing valid unique choices;
    - duplicate or empty options according to the finalized product policy;
    - non-negative point values and a positive examination total;
    - required answer keys for all auto-gradable question types.
- [x] Warn instructors that editing questions or randomization settings affects only attempts
      started after the change.
- [x] Ensure active and submitted attempts keep their stored snapshot even if the exam is
      unpublished, republished, edited, or receives new global defaults.
- [x] Add configuration tests for explicit `true`, explicit `false`, nullable/inherited values,
      missing configuration rows, and global-default changes after attempt creation.
- [x] Add builder tests for invalid answer indexes and invalid multiple-response keys.

**Migration required:** No.

## Phase 7: Audit and Backfill Existing Attempts

**Goal:** Introduce the new source of truth without silently corrupting historical grades.

- [x] Create an audit command under `app/sentinel-api/src/scripts` that scans completed attempts
      without score snapshots.
- [x] For each attempt, reconstruct a candidate item result using the attempt ID, current question
      data, and effective settings.
- [x] Automatically backfill an unfinalized attempt only when the candidate item-award sum and
      total exactly equal the stored `score` and `total_score`.
- [x] If reconstruction does not match, do not alter the score. Emit an audit record containing:
    - attempt ID and exam ID;
    - stored aggregate;
    - reconstructed aggregate;
    - explicit and effective randomization settings;
    - reconstruction strategy;
    - mismatch reason.
- [x] Mark unresolved unfinalized attempts as `REVISION_REQUIRED` for instructor review.
- [x] Never change a finalized attempt automatically. Escalate finalized mismatches to an
      explicit administrative revision workflow.
- [x] Make the backfill resumable, batched, dry-run by default, and idempotent.
- [x] Add script tests covering matching reconstruction, inherited randomization, mismatches,
      finalized attempts, missing questions, and repeated execution.
- [x] Produce pre-deployment counts of safe backfills, unresolved attempts, and finalized
      mismatches.

**Migration required:** No additional schema migration. This phase backfills the Phase 2 columns.

## Phase 8: Observability, Rollout, and Verification

**Goal:** Detect disagreements before they reach instructors and release the change safely.

- [x] Add a structured integrity check at prepare, commit, history, report, and instructor-grading
      boundaries.
- [x] Emit a metric and structured log when aggregate score differs from the item-award sum,
      including attempt ID and scoring version but excluding answers and answer keys.
- [x] Add a temporary dual-read comparison mode for unfinalized attempts during rollout:
      persisted snapshot result versus the legacy report reconstruction.
- [x] Do not expose legacy recomputation to users; use it only for telemetry during the rollout.
- [x] Roll out in this order:
    1. schema migration;
    2. snapshot writes for new attempts;
    3. server prepare/commit scoring;
    4. student review UI;
    5. report and grading reads;
    6. historical audit/backfill;
    7. removal of legacy reconstruction.
- [x] Run focused shared scoring and schema tests.
- [ ] Run `pnpm --dir app/sentinel-api test`. Blocked by unrelated existing failures, including
      database connectivity to `aws-1-ap-northeast-1.pooler.supabase.com` and non-score-integrity
      test instability in other modules.
- [ ] Run `pnpm --dir app/sentinel-web test`. Blocked by unrelated existing failing specs outside
      the score-integrity work and a non-clean test-process exit after reporting those failures.
- [ ] Run relevant `packages/services` and `packages/db` tests. `packages/services` passed;
      `packages/db` is blocked by existing database connectivity failures to
      `aws-1-ap-northeast-1.pooler.supabase.com`.
- [ ] Run `pnpm lint`, `pnpm format:check`, and `pnpm build`.
- [ ] Manually validate the complete matrix:
    - shuffle questions on/off;
    - randomize choices on/off;
    - inherited randomization on/off;
    - new and resumed attempts;
    - multiple choice and multiple response;
    - manual-release and auto-release;
    - essay/manual-review examinations;
    - instructor bonuses and item overrides;
    - question/settings edits after attempt start.

### Phase 8 Validation Notes — July 29, 2026

- Passed focused regression validation:
    - `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/flow/flow.test.ts src/modules/examination/history/services/get-student-exam-history-detail.test.ts src/modules/examination/reporting/services/get-attempt-report.test.ts src/modules/examination/grading/services/update-grading-attempt.test.ts src/modules/examination/grading/services/grading-detail.test.ts src/modules/examination/exams/services/map-exam-response.test.ts`
    - Result: 6 files passed, 55 tests passed.
- Passed package-level suites:
    - `pnpm --dir packages/shared exec vitest run` → 29 files passed, 175 tests passed.
    - `pnpm --dir packages/services exec vitest run` → 17 files passed, 39 tests passed.
- Blocked repository-wide suites:
    - `pnpm --dir app/sentinel-api test` reported unrelated existing failures, including database
      connectivity and non-score-integrity test instability in other modules.
    - `pnpm --dir packages/db exec vitest run` failed on existing Prisma connectivity to
      `aws-1-ap-northeast-1.pooler.supabase.com`.
    - `pnpm --dir app/sentinel-web test` reported unrelated existing failing specs outside the
      score-integrity scope and did not reach a clean exit afterward.
- `git diff --check` passed after the score-integrity implementation updates.

**Migration required:** No.

## Acceptance Criteria

- [ ] A correct objective answer receives the same awarded points on the pre-turn-in review,
      submission response, history page, detailed report, and instructor grading page.
- [ ] Question and choice shuffling do not change correctness or the displayed submitted answer.
- [ ] Inherited randomization settings behave the same as explicit exam settings.
- [ ] A reconnect preserves question order, option order, selected answers, and score meaning.
- [ ] Editing questions or settings after an attempt starts does not alter that attempt.
- [ ] Student-facing payloads never contain answer keys or a reversible canonical-choice mapping.
- [ ] `initial_score` is populated at submission and never changed by instructor saves.
- [ ] Bonuses, essays, and overrides are the only operations that can change the post-submission
      score.
- [ ] The detailed-report item-award sum always matches the stored score appropriate to the
      attempt's grading state.
- [ ] Finalized attempts cannot be automatically regraded or backfilled with a different score.
- [ ] Concurrent or repeated Turn In operations produce one committed result.
- [ ] Every score mutation has an audit trail.

## Breaking API Changes

- The student attempt question contract changes from positional choice answers to opaque option
  tokens.
- Session start or an attempt-bound presentation endpoint must return the attempt-specific
  presented questions.
- The result flow gains prepare and commit operations or equivalent two-phase submission
  semantics.
- API, shared schemas, service clients, and the web app must ship in a coordinated release.

## New Environment Variables

- None expected.

## Data and Security Considerations

- `assessment_snapshot` contains answer keys and must never be returned through student-facing
  queries.
- Logs, analytics events, lifecycle metadata, and error responses must not include full snapshot
  content.
- Snapshot access must use the same institution and role authorization boundaries as grading.
- Snapshot and scoring schema versions must be validated before use; unknown versions must fail
  closed and require support review.
- Historical audit output must contain identifiers and score metadata only, not student answer
  text unless an explicitly secured administrative workflow requires it.

## Migration Rollback Note

- Deploying code that reads the new columns must happen only after the additive migration is
  applied.
- Rollback should first restore readers to the legacy paths while continuing to preserve any
  snapshots already written.
- The additive columns should not be dropped during an operational rollback. Drop them only in a
  later migration after confirming no deployed version reads or writes them and after preserving
  any required audit evidence.

## Done Criteria

- [ ] Every fresh attempt persists one versioned assessment snapshot.
- [ ] Every submitted attempt persists one versioned item-level score snapshot.
- [ ] The browser does not grade sanitized questions.
- [ ] All score consumers use the submitted snapshot as their objective baseline.
- [ ] Multiple-choice and multiple-response answers use stable attempt-specific option tokens.
- [ ] Effective settings are resolved once and frozen for the attempt.
- [ ] Existing attempts are safely backfilled or explicitly flagged without silent score changes.
- [ ] Migration, rollback, security, and release notes are documented.
- [ ] Focused and full validation commands pass, or unrelated pre-existing failures are recorded.
- [ ] Manual verification confirms the acceptance matrix across student and instructor surfaces.
