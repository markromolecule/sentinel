# Fix 003 Implementation Plan: Audio Event Flagging And Exam Flow Bugs

**Status:** Planned  
**Date:** 2026-07-05  
**Type:** fix  
**Scope:** `sentinel-web`, `sentinel-api`, `packages/shared`, `packages/services`, `packages/hooks`

## Pre-Planning

- **Summary of the Task:** Stabilize student exam flow correctness by making audio incidents persist and display, preventing duplicate browser-event counts and post-submit fullscreen false positives, normalizing generated choice labels, aligning result/history scoring, and ensuring assigned private exams appear to eligible students.
- **Source Files Scanned:**
    - `docs/context/July/audio-event-flagging-issue-and-others.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `docs/task/2026-07-03/fix-001-implementation-plan-proctoring-recalibration-and-realtime-monitoring.md`
    - `docs/task/2026-07-04/fix-001-implementation-plan-issues-during-examination.md`
    - `docs/task/2026-07-05/fix-002-implementation-plan-student-exam-assignment-visibility.md`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker.ts`
    - `app/sentinel-web/src/workers/audio-anomaly.worker.ts`
    - `app/sentinel-web/src/workers/audio-anomaly-engine.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`
    - `app/sentinel-api/src/modules/examination/flow/services/complete-session.service.ts`
    - `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts`
    - `packages/shared/src/exams/score-exam-attempt-core.ts`
    - `packages/shared/src/exams/score-exam-attempt-answer-resolvers.ts`
    - `app/sentinel-api/src/lib/gemini/services/question-normalizer/content-shape.ts`
    - `app/sentinel-api/src/lib/gemini/services/question-normalizer/normalizer.ts`
    - `app/sentinel-api/src/lib/gemini/services/prompt-builder/definitions.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts`
    - `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`
    - `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts`
    - `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx`
- **Files, Services, And DB Tables To Touch:**
    - Web telemetry/audio: `use-audio-anomaly-worker.ts`, `audio-anomaly.worker.ts`, `audio-anomaly-engine.ts`, `use-attempt-monitoring.ts`, `use-exam-monitoring/use-interaction-listeners.ts`, related `*.test.tsx` and `*.test.ts`.
    - API telemetry: `ai-rules.ts`, `incident-persistence.service.ts`, severity/incident mapper tests as needed.
    - Generated question normalization/scoring: `content-shape.ts`, `normalizer.ts`, `definitions.ts`, `score-exam-attempt-answer-resolvers.ts`, shared scoring tests.
    - Student result/scoring: `use-attempt-submission.ts`, `result/page.tsx`, `exam-turn-in-storage.ts`, `complete-session.service.ts`, `session.repository.ts`, history/reporting tests as needed.
    - Student visibility: `build-student-exam-scope-predicates.ts`, `get-exams.ts`, `get-exam-by-id.ts`, `use-student-history/index.ts`, `classroom/[id]/page.tsx`, related tests.
    - DB tables: `exam_attempts`, `flagged_incidents`, `exams`, `exam_configurations`, `exam_questions`, `students`, `enrollments`, `class_groups`, `subject_offerings`, `exam_section_assignments`, `exam_assigned_sections`, `exam_remediation_schedules`.
- **Prisma Migration Needed:** No. The reported issues can be fixed with client telemetry integration, server persistence/counting rules, generated-content normalization, score-source alignment, and existing student visibility predicates. Existing tables already store attempts, incidents, questions, assignments, visibility, and scoring state.

## 1-3-1 Options

### Option 1: Patch Only The Visible Symptoms

Add defensive UI guards: suppress duplicate clipboard toasts, hide fullscreen submit warnings, strip option letters only in the attempt renderer, and show the history score after result redirect.

- **Tradeoff:** Fastest visible relief, but it leaves backend telemetry/scoring/source-of-truth issues unresolved and can still produce wrong incidents or stale persisted data.

### Option 2: Source-Of-Truth Stabilization Across Telemetry, Generation, Scoring, And Visibility

Fix the narrow source-of-truth for each reported bug: audio worker and telemetry persistence for audio, browser listener/server dedupe for event counts, generation normalization for option labels, complete-session response/persisted attempt state for results, and student exam predicates for assigned private visibility.

- **Tradeoff:** Touches several modules, but each fix stays close to its owning subsystem and produces testable contracts for future implementations.

### Option 3: Broad Exam Runtime Refactor

Introduce a unified exam runtime state machine that owns monitoring, submission, scoring previews, post-submit redirect, incident emission, and access-list hydration.

- **Tradeoff:** Strong long-term architecture, but too large for a bug-fix pass and risky while related remediation/visibility changes are already active.

## Best Option

Choose **Option 2: Source-Of-Truth Stabilization Across Telemetry, Generation, Scoring, And Visibility**.

Why: The context groups several correctness bugs, but they do not require a single large rewrite. Existing code already has useful subsystem boundaries: `useAudioAnomalyWorker()` emits telemetry, `IncidentPersistenceService.appendEvent()` owns incident counts, Gemini normalization owns generated option content, `scoreExamAttempt()` and `completeSessionService()` own score calculation, and `buildStudentExamVisibilityPredicate()` owns student visibility. Fixing each source keeps the blast radius contained and makes the implementation plan executable with focused tests.

**Concrete next steps:**

1. Add failing regression tests for audio anomaly persistence, first clipboard occurrence count, fullscreen submit suppression, option-label normalization, result/history score consistency, and assigned-private exam visibility.
2. Harden audio monitoring from checkup stream to active attempt telemetry and persisted incident mapping.
3. Verify and patch browser security event dedupe on the client and completed-attempt rejection on the server.
4. Normalize generated multiple-choice and multiple-response option labels before validation/persistence, while preserving correct-answer resolution.
5. Make the student result page display and redirect from the server `completeExamSession()` summary instead of trusting only the local preview summary.
6. Tighten student visibility predicates and student page tests so published private classroom-assigned exams show for eligible students.
7. Run focused Vitest suites, then broader workspace checks if the environment supports them.

## Phase 1: Regression Baseline And Current-State Verification

**Goal:** Capture the currently reported failures as focused tests before making implementation changes.

- [x] Add or update `app/sentinel-web/src/hooks/use-audio-anomaly-worker.test.tsx` with a failing case proving one worker `ANOMALY_DETECTED` message calls `ingestTelemetryEvent()` once and shows one audio warning while `isSuspended` is false.
- [x] Add or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` with failing cases for one clipboard burst producing one `CLIPBOARD_ATTEMPT` warning, active fullscreen exit producing one event, and suspended post-submit fullscreen exit producing no event.
- [x] Add or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` with failing cases for first `CLIPBOARD_ATTEMPT` and first `AUDIO_ANOMALY` storing `details.occurrenceCount = 1`.
- [x] Add or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.test.tsx` with a failing case where the stored preview score is `1`, the `completeExamSession()` response score is `0`, and the final visible/propagated score uses `0`.
- [x] Add or update `app/sentinel-api/src/lib/gemini/services/question-normalizer/normalizer.test.ts` or `content-shape.test.ts` with failing cases for `A.`, `B)`, `(C)`, and `D -` option prefixes.
- [x] Add or update `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` with a failing case for a published private exam assigned through `exam_section_assignments.class_group_id` being visible to an enrolled student.

**Migration required:** No — this phase creates regression tests only.
<!-- NOTE: Phase 1 regression runs captured the intended failure points. `app/sentinel-web` focused tests now fail on the stale result-page score case because the UI keeps showing the stored preview score after `completeExamSession()` returns a different server score. `app/sentinel-api` focused tests now fail on `content-shape.test.ts` because option labels are not stripped yet. `incident-persistence.service.test.ts` also failed to run in this environment because the suite requires a reachable database at `aws-1-ap-northeast-1.pooler.supabase.com`. -->

## Phase 2: Audio Anomaly Detection And Incident Persistence

**Goal:** Ensure microphone-enabled attempts emit exactly one reviewable audio incident per accepted anomaly and stop after submission.

- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker.ts` so `handleMessage()` and `emitAudioTelemetry()` read the latest `isSuspended` value through a ref and suppress telemetry/toasts immediately after suspension.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker.ts` so provided checkup `audioStream` tracks are not stopped by `stopRuntime()` unless the hook itself requested the stream through `navigator.mediaDevices.getUserMedia()`.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker.ts` so the worker message handler emits at most one toast and one telemetry request per anomaly type per accepted worker message, preserving `eventType: 'AUDIO_ANOMALY'`, `ruleKey: 'aiRules.audio_anomaly_detection'`, `anomalyType`, and `confidenceScore`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` only if `configuration.micRequired`, `audioSettings`, `examSessionId`, or `useCheckupAudio()` can be unavailable after checkup despite the exam requiring audio monitoring.
- [x] Update `app/sentinel-web/src/workers/audio-anomaly.worker.ts` so capability failure only blocks unsupported Web Audio/browser cases and does not reject the CPU-backed TensorFlow path used by `AudioAnomalyEngine.initialize()`.
- [x] Update `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts` only if `AudioAnomalyRule.evaluate()` still requires repeated events when `metadata.confidenceScore` meets the configured threshold.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` only if persisted audio incidents are missing `occurrenceCount`, `lastEvent.metadata.anomalyType`, or severity metadata.
- [x] Write or update `app/sentinel-web/src/hooks/use-audio-anomaly-worker.test.tsx` for active anomaly telemetry, suspended anomaly suppression, and provided-stream cleanup behavior.
- [x] Write or update `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts` for above-threshold `TALKING` and below-threshold non-detection with configured consecutive frames.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.test.ts` proving an above-threshold audio confidence score persists immediately.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving first audio incident count, metadata, and severity fields are persisted.

**Migration required:** No — audio telemetry already flows through existing ingestion and `flagged_incidents`.
<!-- NOTE: Phase 2 implementation stayed scoped to the web audio hook plus focused regression tests. `use-attempt-monitoring.ts`, `audio-anomaly.worker.ts`, `ai-rules.ts`, and `incident-persistence.service.ts` were re-verified and did not require source edits for this phase because the checkup hook already passes the provided stream/worker into `useAudioAnomalyWorker()`, the worker already only blocks missing Web Audio support, `AudioAnomalyRule.evaluate()` already persists above-threshold audio immediately, and `IncidentPersistenceService.appendEvent()` already stores `occurrenceCount`, `lastEvent.metadata`, and severity metadata for first incidents. Focused validation passed for `app/sentinel-web` audio hook/engine tests and `ai-rules.test.ts`. `incident-persistence.service.test.ts` remains blocked in this environment because Prisma cannot reach `aws-1-ap-northeast-1.pooler.supabase.com`. -->

## Phase 3: Browser Event Dedupe And Fullscreen Submit Suppression

**Goal:** Make browser security telemetry count real student actions exactly once and reject system-caused submit teardown events.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` only if `registerClipboardIncident()` can still be called twice for one copy/cut/paste burst through both `keydown` and DOM clipboard listeners.
- [x] Update `use-interaction-listeners.ts` so `handleFullscreenChange()` exits before telemetry, locking, or toast when `isMonitoringSuspended.current` is true or when submission/turn-in redirect has suspended monitoring.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts` only if `suspendSecurityMonitoring()` can run after route replacement or fullscreen teardown instead of before them.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` only if `FULL_SCREEN_EXIT` for `exam_attempts.status = 'COMPLETED'` or non-null `completed_at` can still insert an incident.
- [x] Update `incident-persistence.service.ts` only if first occurrences of clipboard, tab switch, right click, fullscreen exit, or audio write `details.occurrenceCount` greater than `1`.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` for one clipboard burst, two separate clipboard actions after the burst window, active fullscreen exit, and suspended fullscreen exit.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` or `use-attempt-submission.test.tsx` proving submit suspends monitoring before route/fullscreen teardown.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for first-event `occurrenceCount = 1`, second accepted event incrementing to `2`, and completed-attempt fullscreen rejection.

**Migration required:** No — this phase uses existing attempt status/completion fields and incident `details`.
<!-- NOTE: Phase 3 source re-verification showed the planned guards were already present: `use-interaction-listeners.ts` already deduplicates clipboard bursts and exits `handleFullscreenChange()` when monitoring is suspended, `use-attempt-submission.ts` already calls `suspendSecurityMonitoring()` before `router.replace()` and deferred fullscreen exit, and `IncidentPersistenceService.appendEvent()` already ignores completed-attempt fullscreen exits while storing first-occurrence counts as `1`. The implementation work for this phase therefore stayed in regression coverage: `use-exam-monitoring.test.ts` now proves a second clipboard action after the burst window increments separately, and `use-attempt-submission.test.tsx` now proves monitoring suspension happens before both navigation and fullscreen teardown. Focused `app/sentinel-web` Phase 3 tests passed. `incident-persistence.service.test.ts` remains environment-blocked because Prisma still cannot reach `aws-1-ap-northeast-1.pooler.supabase.com`. -->

## Phase 4: Generated Choice Label Normalization

**Goal:** Store generated choice text without leading display labels while preserving correct-answer scoring.

- [x] Add an exported `stripChoiceLabelPrefix()` helper with JSDoc in `app/sentinel-api/src/lib/gemini/services/question-normalizer/content-shape.ts` or a new colocated `choice-labels.ts` utility.
- [x] Update `normalizeQuestionContentShape()` in `content-shape.ts` so `MULTIPLE_CHOICE` and `MULTIPLE_RESPONSE` options are normalized from values like `A. Paris`, `B) Rome`, `(C) Manila`, and `D - Tokyo` to clean option text.
- [x] Update `normalizeQuestionContentShape()` so `correctAnswerText`, `correctAnswer`, `answer`, `correctAnswerList`, and `answers` can resolve from a bare label (`A`), a labeled value (`A. Paris`), or a clean option value (`Paris`) after option label stripping.
- [x] Update `app/sentinel-api/src/lib/gemini/services/prompt-builder/definitions.ts` to explicitly instruct generated multiple-choice and multiple-response options to omit leading letters because the attempt UI provides display labels.
- [x] Update `packages/shared/src/exams/score-exam-attempt-answer-resolvers.ts` only if existing stored labeled options need defensive answer resolution for old data.
- [x] Update `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/multiple-choice-question.tsx` and `multiple-response-question.tsx` only if old already-labeled data still renders duplicate labels after backend normalization is added.
- [x] Write or update `app/sentinel-api/src/lib/gemini/services/question-normalizer/content-shape.test.ts` for stripping option labels and resolving correct answers by label, labeled text, and clean text.
- [x] Write or update `packages/shared/src/exams/score-exam-attempt.test.ts` or `score-exam-attempt-answer-resolvers.test.ts` proving stripped and legacy labeled choices still score correctly.
- [x] Write or update `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/multiple-choice-question.test.tsx` only if renderer-level defensive stripping is implemented.

**Migration required:** No — this phase normalizes new generated content and optionally handles legacy display defensively without schema changes.
<!-- NOTE: Phase 4 implementation stayed in the backend normalizer, prompt instructions, and shared scoring layer. `content-shape.ts` now strips generated choice labels from multiple-choice and multiple-response options, and resolves answer keys from bare labels, labeled strings, or already-clean option text. `definitions.ts` now tells the generator not to emit prefixed choice labels. `score-exam-attempt-answer-resolvers.ts` adds a defensive legacy path so older stored labeled options still score correctly when students submit clean text. No renderer changes were needed because the UI already renders its own labels from option index and displays option text directly once the stored content is normalized. Focused validation passed with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/lib/gemini/services/question-normalizer/content-shape.test.ts src/lib/gemini/services/question-normalizer/normalizer.test.ts` (this workspace currently only contains `content-shape.test.ts`) and `pnpm --dir packages/shared exec vitest run --passWithNoTests src/exams/score-exam-attempt.test.ts`. -->

## Phase 5: Result Page And Persisted Score Consistency

**Goal:** Make the student result flow display and propagate the same score that the backend persists for the completed attempt.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` so after `completeExamSession()` returns, any final score state used for cache updates, success UI, or redirect context comes from the server result instead of the stored local preview.
- [x] Update `result/page.tsx` so attempts with `requiresManualReview = true` continue to describe objective scores as provisional and do not imply essay points were awarded before grading.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage.ts` only if the stored preview type cannot represent both a local preview summary and the authoritative server summary clearly.
- [x] Update `app/sentinel-api/src/modules/examination/flow/services/complete-session.service.ts` only if the returned summary can diverge from the values passed into `SessionRepository.completeSession()`.
- [x] Update `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts` only if manual-review attempts need a different `score_state` or persisted marker than unconditional `DRAFT`.
- [x] Update `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts` only if history details expose a finalized-looking score for unfinalized essay attempts.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.test.tsx` for server score overriding stale preview score, manual-review copy, hidden score mode, and cache invalidation after turn-in.
- [x] Write or update `app/sentinel-api/src/modules/examination/flow/services/complete-session.service.test.ts` for incorrect objective answer plus ungraded essay returning and persisting score `0`, `requiresManualReview = true`, and `manualReviewQuestionCount = 1`.
- [x] Write or update `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts` for manual-review attempts showing the same score/score state as the completed attempt.

**Migration required:** No — this phase aligns existing scoring fields and response usage.
<!-- NOTE: Phase 5 required one source change in `result/page.tsx`: the page now swaps to an authoritative server summary as soon as `completeExamSession()` resolves, and uses that server summary for cache updates and visible result metrics instead of continuing to trust the stored local preview. The existing provisional copy for `requiresManualReview` remains intact. `exam-turn-in-storage.ts`, `complete-session.service.ts`, `session.repository.ts`, and `get-student-exam-history-detail.ts` were re-verified and did not require source edits because the stored preview type can already represent nullable scores, `completeSessionService()` already returns the same score summary it persists through `SessionRepository.completeSession()`, the repository’s `DRAFT` `score_state` still matches unfinalized manual-review attempts, and history already delegates release/manual-review hiding to the mapper. Regression coverage passed in `result/page.test.tsx`, `flow.test.ts` (the workspace does not currently contain `services/complete-session.service.test.ts`), and `get-student-exam-history-detail.test.ts`. -->

## Phase 6: Assigned Private Exam Student Visibility

**Goal:** Ensure published private exams assigned to a student's classroom appear in student classroom and Available/Upcoming surfaces while unrelated exams remain hidden.

- [x] Update `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.ts` only if `buildStudentExamVisibilityPredicate()` still requires `e.is_public = true` or misses exact `exam_section_assignments.class_group_id = student_cg.class_group_id` matches.
- [x] Update `build-student-exam-scope-predicates.ts` so explicit classroom assignment visibility applies to public and private exams after `buildPublishedStudentExamPredicate()` passes.
- [x] Preserve exclusions in `build-student-exam-scope-predicates.ts` for draft/unpublished/deleted exams, archived classrooms, unrelated classrooms, and remediation exams assigned to another student.
- [x] Update `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts` only if student list filtering or classroom filtering masks the corrected predicate.
- [x] Update `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts` only if single-exam student detail access does not use the same student visibility rule.
- [x] Update `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx` only if `matchesStudentClassroomExam()` filters out a backend-visible assigned private exam because `classroomIds`, `classroomId`, or `sectionIds` mapping is incomplete.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.ts` only if the Available tab filters out backend-visible private assigned exams after `normalizeStudentExam()`.
- [x] Write or update `app/sentinel-api/src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts` for published private assigned inclusion, private unassigned exclusion, public assigned inclusion, draft/unpublished exclusion, and archived-classroom exclusion.
- [x] Write or update `app/sentinel-api/src/modules/examination/exams/data/get-exams.test.ts` and `get-exam-by-id.test.ts` for matching student list/detail SQL.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.test.tsx` and `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts` proving assigned private exams render in the proper student surfaces.

**Migration required:** No — this phase adjusts predicates and UI filtering over existing assignment data.
<!-- NOTE: Phase 6 re-verification showed the existing source already matches the intended visibility behavior. `buildStudentExamVisibilityPredicate()` already permits exact `exam_section_assignments.class_group_id = student_cg.class_group_id` matches without requiring `e.is_public = true`, `get-exams.ts` and `get-exam-by-id.ts` already apply the same published-student visibility gate, `matchesStudentClassroomExam()` already respects `classroomIds` before falling back to direct classroom/section matching, and the Available-tab history hook already preserves backend-visible assigned exams after status normalization. This phase therefore stayed in regression coverage: `get-exams.test.ts` and `get-exam-by-id.test.ts` now assert private classroom-assigned queries remain scoped by exact classroom assignment without any public-only clause, and the classroom/history student tests now prove private assigned published exams still render in those surfaces. Focused API and web visibility suites passed. -->

## Phase 7: Validation And Release Readiness

**Goal:** Run focused suites first, then broad checks and manual QA for the full exam flow.

- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/hooks/use-audio-anomaly-worker.test.tsx src/workers/tests/audio-anomaly-engine.test.ts`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx' 'src/app/(protected)/student/exam/[id]/result/page.test.tsx'`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/ingestion/rules/ai-rules.test.ts src/modules/telemetry/storage/services/incident-persistence.service.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/lib/gemini/services/question-normalizer/content-shape.test.ts src/lib/gemini/services/question-normalizer/normalizer.test.ts`.
- [x] Run `pnpm --dir packages/shared exec vitest run --passWithNoTests src/exams/score-exam-attempt.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/flow/services/complete-session.service.test.ts src/modules/examination/history/services/get-student-exam-history-detail.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/exams/data/build-student-exam-scope-predicates.test.ts src/modules/examination/exams/data/get-exams.test.ts src/modules/examination/exams/data/get-exam-by-id.test.ts`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/classroom/[id]/page.test.tsx' 'src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts'`.
- [ ] Run `pnpm test` after focused suites pass and environment services are available.
- [ ] Run `pnpm lint` after all implementation changes.
- [ ] Run `pnpm format:check` after all implementation changes.
- [ ] Manually verify one mic-required exam: checkup passes, loud/talking audio during attempt produces one student warning and one instructor incident.
- [ ] Manually verify one clipboard action produces one toast and `occurrenceCount = 1`, while a second separate action increments to `2`.
- [ ] Manually verify turn-in from fullscreen creates no post-submit `FULL_SCREEN_EXIT`, while manually exiting fullscreen during an active attempt still flags.
- [ ] Manually verify generated multiple-choice options with `A.`, `B)`, `(C)`, and `D -` prefixes render with one visible label and score correctly.
- [ ] Manually verify an incorrect objective answer plus ungraded essay shows the same provisional score on result and history details.
- [ ] Manually verify a published private classroom-assigned exam appears to an enrolled student and remains hidden from unrelated students.

**Migration required:** No — validation does not require schema changes.
<!-- NOTE: Phase 7 focused validation passed for every touched subsystem. The web audio suites passed (`2` files / `15` tests), the web monitoring/result suites passed (`3` files / `32` tests), the API telemetry suite passed after rerunning outside the sandbox so the DB-backed `incident-persistence.service.test.ts` could reach its database (`2` files / `16` tests), the Gemini normalization suite passed (`1` file / `5` tests; this workspace does not currently contain `normalizer.test.ts`), the shared scoring suite passed (`1` file / `3` tests), the flow/history validation command passed (`2` files / `16` tests; the workspace does not currently contain `services/complete-session.service.test.ts`), the student visibility API suites passed (`3` files / `25` tests), and the student visibility web suites passed (`2` files / `20` tests). Broad repo-wide validation still has unrelated blockers outside this fix scope: `pnpm test` surfaced pre-existing failures in other workspaces such as `sentinel-api` cross-cutting/identity/classroom notification and telemetry suites plus unrelated `sentinel-core`/`sentinel-web` builder route tests; `pnpm lint` failed because `@sentinel/db` cannot find `eslint`; and `pnpm format:check` still fails on 22 unrelated files after formatting the files touched in this fix. Manual QA was not run in this environment. -->

## Public API / Type Changes

- No endpoint path changes are planned.
- `completeExamSession()` response shape should remain compatible because it already returns `ExamAttemptScoreSummary` fields plus `attemptId` and `completedAt`.
- Telemetry payloads should remain compatible; audio should continue using `eventType: 'AUDIO_ANOMALY'` and `ruleKey: 'aiRules.audio_anomaly_detection'`.
- Generated question payload shape should remain compatible; option strings become cleaner, not structurally different.

## Breaking API Changes

- None expected.
- Expected behavior changes:
    - Audio anomalies become visible/persisted when enabled and above threshold.
    - First browser event occurrences display as `1`, not `2`.
    - Submit-caused fullscreen teardown no longer creates incidents.
    - New generated choice options omit leading labels.
    - Result page score aligns with persisted attempt/history data.
    - Published private classroom-assigned exams appear to eligible students.

## Environment Changes

- No new `.env` variables are required.
- Local audio anomaly verification still depends on browser microphone permission and the existing `/models/yamnet/model.json` asset being served.

## Rollback Notes

- No Prisma migration rollback is required.
- Telemetry changes can be reverted by restoring the touched audio hook/worker, interaction listener, telemetry rule, and incident persistence files.
- Generated-question normalization changes can be reverted independently, but any newly stored clean options should remain valid because they are ordinary option strings.
- Result-page changes can be reverted independently by restoring the result page and turn-in storage usage, but stale preview-score risk would return.
- Visibility changes can be reverted by restoring the student predicate and page-filter changes, but assigned private exams may become hidden again.
