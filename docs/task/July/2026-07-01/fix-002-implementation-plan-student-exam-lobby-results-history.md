# Fix 002 Implementation Plan: Student Exam Lobby, Result, and History Detail Flow

## Task Summary

Fix the second-pass student exam flow issues: lobby count/reconnect/action states must reflect real runtime access, result/history scores must agree with score-release rules, and history details should present the attempt report table inside a dialog with clearer provisional-copy.

## Source Scan Summary

- Student lobby UI lives in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx`, `_hooks/use-lobby-state.ts`, `_hooks/use-lobby-actions.ts`, `_components/lobby-header.tsx`, `_components/lobby-status-info.tsx`, and `_components/lobby-footer-actions.tsx`.
- Lobby count data comes from `packages/hooks/src/query/exams/use-exam-lobby-count-query.ts`, `packages/services/src/api/exams/lobby.ts`, and `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.ts`.
- Runtime access and session start safety are enforced by `app/sentinel-api/src/modules/examination/access/services/verify-student-exam-eligibility.service.ts`, `app/sentinel-api/src/modules/examination/access/services/resolve-lobby-runtime-access.ts`, and `app/sentinel-api/src/modules/examination/flow/services/start-session.service.ts`.
- Result preview and turn-in live in `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` and use local preview data from `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage.ts`.
- History list/detail APIs live in `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history.ts`, `get-student-exam-history-detail.ts`, `app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.ts`, and `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.service.ts`.
- History detail UI lives in `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx`, `_hooks/use-exam-details/index.ts`, and the existing attempt report components under `app/sentinel-web/src/features/exams/reports`.
- The report endpoint already blocks student access to unfinalized essay/manual-release reports in `app/sentinel-api/src/modules/examination/reporting/services/get-attempt-report.ts`.

## Files, Services, and DB Tables Touched

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-header.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-status-info.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx`
- `packages/hooks/src/query/exams/use-exam-lobby-count-query.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.test.ts`
- `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts`
- `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts`
- `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.service.ts`
- `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/history/details/page.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.ts`
- `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.test.tsx`
- `app/sentinel-web/src/features/exams/reports/attempt-report-view.tsx`
- `app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx`
- DB tables read only: `exam_lobby_admissions`, `exam_attempts`, `exam_configurations`, `exam_questions`, `students`, `exams`, `subjects`, `rooms`, and `flagged_incidents`.

## Prisma Migration Decision

Migration required: No — the required data already exists in `exam_attempts.answer_snapshot`, `exam_configurations.release_score_mode`, `exam_questions.question_type`, `exam_lobby_admissions`, and `exam_attempts`; this task should only align queries, mapping, and UI behavior.

## Three Viable Options

### Option 1: Frontend Guardrails Only

Use the existing API contracts and fix the student web UI to hide placeholder reconnect values, show the best known lobby count immediately, disable the continue button unless `runtimeAccess.canStart` or `runtimeAccess.canResume` is true, hide provisional scores, and wrap the report table in a dialog.

Tradeoff: Fastest and lowest backend risk, but it does not fix the history detail API parity gap that can still produce mismatched score data.

### Option 2: Backend Contract Parity Plus Targeted UI Hardening

Align history detail API fields with history list score-release logic, verify lobby count/query behavior, and harden student web UI against stale lobby access and placeholder reconnect data; then add the report dialog and copy updates.

Tradeoff: Best balance of correctness and scope because it fixes the data source mismatch while keeping schema and endpoint shapes stable.

### Option 3: New Student Exam Flow State Contract

Introduce a richer unified student exam-flow endpoint that returns lobby count, admission status, runtime access, reconnect policy, result visibility, and report availability in one request, then refactor lobby/result/history pages to consume it.

Tradeoff: Most robust long term, but too broad for a bugfix pass and likely to touch multiple API/client contracts unnecessarily.

## Best Option

Choose Option 2.

Why: It addresses the actual mismatch between history list and detail score-release logic, keeps existing query/service boundaries intact, avoids a Prisma migration, and limits frontend changes to the affected student lobby/result/history pages. It also fits the existing Vitest coverage style: focused tests next to services, hooks, and page components.

## Concrete Next Steps

1. Verify current behavior with focused tests before code changes where fixtures already exist.
2. Align history detail API selection with the fields already used by `mapExamHistorySummaryResponse()`.
3. Harden lobby count/reconnect/continue states in the student web lobby.
4. Keep provisional scores hidden consistently between result preview, history list, and history detail.
5. Move the history detail report table behind a dialog while preserving the existing `AttemptReportView` for instructor and editable flows.
6. Run targeted API and web tests, then run broader lint/test commands if time permits.

## Phase 1: History Detail Score-Release Parity

**Goal:** Make `/history/:attemptId` return the same released/hidden score semantics as the history list.

- [x] Update `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts` to select `ec.release_score_mode` by joining `exam_configurations as ec`.
- [x] Update `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts` to select `essay_question_count` with the same `exam_questions.question_type = 'ESSAY'` subquery used by `app/sentinel-api/src/modules/examination/exams/data/get-exams.ts`.
- [x] Update `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.ts` to select `attempt_finalized_at` from `(ea.answer_snapshot->'_grading'->>'finalizedAt')::text`, matching `app/sentinel-api/src/modules/examination/history/data/build-student-attempt-selects.ts`.
- [x] Confirm `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.service.ts` uses one shared helper for score-release visibility in `mapExamHistorySummaryResponse()` and `mapExamHistoryDetailResponse()`.
- [x] Add JSDoc to any new exported helper in `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.service.ts`.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.test.ts` for manual-release unfinalized attempts returning `score: null`, `totalScore: null`, `percentage: null`, and `result: null`.
- [x] Write tests in `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.test.ts` for finalized manual-release attempts returning the stored score and result.
- [x] Write tests in `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts` verifying the detail query maps `release_score_mode`, `essay_question_count`, and `attempt_finalized_at` into `mapExamHistoryDetailResponse()`.

**Migration required:** No — this phase only reads existing columns and JSON fields.

<!-- NOTE: No new exported helper was introduced in this phase; the shared score-release helper is private, so no new JSDoc was required. The package-script test commands `pnpm --dir app/sentinel-api test -- ...` ran the unrelated full API suite and failed on pre-existing DB/Redis/module-resolution issues. Focused Phase 1 validation passed with `pnpm exec vitest run src/modules/examination/exams/services/map-exam-response.test.ts src/modules/examination/history/services/get-student-exam-history-detail.test.ts` from `app/sentinel-api`. -->

## Phase 2: Student Result Page Consistency

**Goal:** Prevent the result preview from presenting provisional `0` or hidden scores as final student scores.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` so `ResultMetricGrid()` labels hidden score and grade states consistently with history, using copy such as `Pending Review` instead of numeric `0` when `scoreVisible` is false or `summary.score` is null.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` so `ResultReleaseNotice()` replaces final-sounding language with provisional language for manual-review or hidden-score attempts.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` so the visible-score branch distinguishes auto-graded preview from finalized instructor grading when `summary.requiresManualReview` is true.
- [x] Verify `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage.ts` preserves `scoreVisible`, `releaseScoreMode`, and summary nullability without coercing missing scores to `0`.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.test.tsx` for hidden scores showing pending labels and no numeric `0`.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.test.tsx` for manual-review attempts showing provisional copy.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage.test.ts` if storage normalization changes are needed.

**Migration required:** No — this phase only changes client rendering and local preview normalization.

<!-- NOTE: Phase 2 validation passed with `pnpm exec vitest run src/app/\(protected\)/student/exam/\[id\]/result/page.test.tsx src/app/\(protected\)/student/exam/\[id\]/_lib/exam-turn-in-storage.test.ts` from `app/sentinel-web`. -->

## Phase 3: Lobby Count and Reconnect Display

**Goal:** Show the lobby count quickly and avoid misleading `0 used`, `0 left`, or `0 of 0` reconnect text when runtime data is not trustworthy yet.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx` to derive `displayCount` from API count, then positive presence count, then a loading-friendly label such as `Syncing`, instead of showing a long-lived `--` while the initial query is pending.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx` to pass lobby count query loading state into `LobbyHeader()` if needed for explicit display text.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-header.tsx` to render reconnect policy as unavailable/syncing when `runtimeAccess.totalReconnectAttempts` and `runtimeAccess.reconnectAttemptsRemaining` are both zero but the configured `maxReconnectAttempts` is greater than zero.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-status-info.tsx` with the same reconnect display helper used by `LobbyHeader()` to avoid duplicate inconsistent logic.
- [x] Add a non-exported helper or an exported `resolveReconnectDisplay()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.ts` if both components need the same logic; add JSDoc if exported.
- [x] Verify `packages/hooks/src/query/exams/use-exam-lobby-count-query.ts` still uses `staleTime: 0`, `refetchOnMount: true`, and a short `refetchInterval`, and only adjust interval/enabled behavior if tests prove delayed first render comes from query settings.
- [x] Verify `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.ts` intentionally counts waiting/approved lobby admissions without active in-progress attempts; adjust only if the expected lobby count should include approved students with active attempts.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` for initial API-loading state using presence count immediately.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` for fallback text when neither API nor presence count is available.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` or a new co-located component test for reconnect policy not showing `0 used • 0 left` when configured attempts are nonzero.
- [x] Write tests in `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.test.ts` only if backend count inclusion rules change.

**Migration required:** No — this phase only changes query/display behavior over existing lobby rows.

<!-- NOTE: Passing lobby count loading state into `LobbyHeader()` was not needed because `page.tsx` now resolves the explicit `Syncing`/`Unavailable` display string before rendering the header. No backend lobby count behavior changed, so no backend lobby-count tests were added. Phase 3 validation passed with `pnpm exec vitest run src/app/\(protected\)/student/exam/\[id\]/lobby/page.test.tsx` from `app/sentinel-web`. -->

## Phase 4: Instructor-Gated Continue Button Safety

**Goal:** Ensure `Continue to Attempt` cannot start unless the latest runtime access state is approved or resumable.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts` so instructor-gated students remain unable to enter while `admissionStatus` is `WAITING`, `REJECTED`, or while an approved-status `refetchExam()` is still pending.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts` to derive `canEnterExam` from both `runtimeAccess.canStart || runtimeAccess.canResume` and instructor-gated admission freshness when `configuration.lobbyAdmissionMode === 'INSTRUCTOR_GATED'`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx` so primary labels never fall back to `Continue to Attempt` for `lobby_waiting`, `LOBBY_REJECTED`, or pending approval-refresh states.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts` to optionally re-check or respect a passed `canEnterExam` guard immediately before `startExamSession()`; surface `runtimeAccess.message` when denied.
- [x] Verify `app/sentinel-api/src/modules/examination/flow/flow.test.ts` still covers the backend safety net where `SessionManagerService.startSession()` does not create a session for `LOBBY_WAITING`.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.test.tsx` for instructor-gated `APPROVED` status waiting for `refetchExam()` before `canEnterExam` becomes true.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` for a stale `runtimeAccess.canStart: true` with `admissionStatus: WAITING` keeping the primary button disabled.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.test.tsx` for `handleEnterExam()` not calling `startExamSession()` when `canEnterExam` is false.

**Migration required:** No — this phase only changes runtime gating logic.

<!-- NOTE: Phase 4 verified the existing backend safety-net test at `app/sentinel-api/src/modules/examination/flow/flow.test.ts:441`. Focused web validation passed with `pnpm exec vitest run src/app/\(protected\)/student/exam/\[id\]/lobby/_hooks/use-lobby-state.test.tsx src/app/\(protected\)/student/exam/\[id\]/lobby/_hooks/use-lobby-actions.test.tsx src/app/\(protected\)/student/exam/\[id\]/lobby/page.test.tsx` from `app/sentinel-web`. -->

## Phase 5: History Detail Report Dialog UX

**Goal:** Replace the always-inline report table in history details with a dialog that opens the table on demand and uses copy that does not imply finalization before finalization.

- [x] Update `app/sentinel-web/src/features/exams/reports/attempt-report-view.tsx` to support a read-only compact mode if needed, where summary cards can stay inline and the question table can be rendered by a caller inside a dialog.
- [x] Export or reuse `AttemptReportTable` from `app/sentinel-web/src/features/exams/reports/_components/attempt-report-table.tsx` only if `HistoryDetailsPage` needs direct table composition; add JSDoc if a new exported component/helper is introduced.
- [x] Add a new co-located component `app/sentinel-web/src/app/(protected)/student/history/details/_components/attempt-report-dialog.tsx` that renders `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, and a scrollable `AttemptReportTable`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx` to replace inline `AttemptReportView` table rendering with a `View Detailed Report` button that opens `AttemptReportDialog`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx` copy from `Finalized Report Ready` to clearer non-final wording such as `Detailed Report Available` and describe it as the currently released report rather than the final score when grading is not finalized.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx` to keep `Report In Review` for `grading_in_progress` and avoid showing score/result language from `historyItem` when `historyItem.score` and `historyItem.percentage` are null.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/history/details/page.test.tsx` verifying the page shows the new report-available copy and no longer renders `Attempt Report View` inline.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/history/details/page.test.tsx` or `app/sentinel-web/src/app/(protected)/student/history/details/_components/attempt-report-dialog.test.tsx` verifying the dialog opens with the report table after clicking `View Detailed Report`.
- [x] Write tests in `app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx` if read-only compact rendering changes are made.

<!-- NOTE: Phase 5 reuses `AttemptReportView` with table-only display controls instead of exporting `AttemptReportTable` directly, preserving the existing report composition boundary. -->
<!-- NOTE: Phase 5 validation passed with `pnpm exec vitest run src/app/\(protected\)/student/history/details/page.test.tsx src/app/\(protected\)/student/history/details/_components/attempt-report-dialog.test.tsx src/features/exams/reports/attempt-report-view.test.tsx` from `app/sentinel-web` (3 files, 7 tests). Migration applied: No — UI composition only. Breaking changes: No. -->

**Migration required:** No — this phase only changes UI composition.

## Phase 6: Query Hook and Report Availability Cleanup

**Goal:** Keep student detail loading/report states predictable while avoiding unnecessary report requests.

- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.ts` so `useAttemptReportQuery(attemptId)` is not effectively required for loading when no `attemptId` exists.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.ts` to expose enough state for the page to distinguish `available`, `grading_in_progress`, `unavailable`, and `loading_report` if the UI needs separate loading copy.
- [x] Verify `packages/hooks/src/query/exams/use-attempt-report-query.ts` has an `enabled: Boolean(attemptId)` guard; add or test the guard if missing.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.test.tsx` for report availability on `409`, successful report, no attempt id, and report-loading cases.

<!-- NOTE: Phase 6 verified `packages/hooks/src/query/exams/use-attempt-report-query.ts` already gates report fetches with `enabled: isAuthenticatedQueryEnabled && Boolean(attemptId)`, so no package hook change was required. -->
<!-- NOTE: Phase 6 validation passed with `pnpm exec vitest run src/app/\(protected\)/student/history/details/_hooks/use-exam-details/index.test.tsx` from `app/sentinel-web` (1 file, 4 tests). Migration applied: No — hook state derivation only. Breaking changes: No. -->

**Migration required:** No — this phase only changes hook state derivation.

## Phase 7: Validation and Regression Pass

**Goal:** Prove the fixed flows work in focused tests and do not regress adjacent exam behavior.

- [x] Run `pnpm --dir app/sentinel-api test -- get-lobby-count`.
- [x] Run `pnpm --dir app/sentinel-api test -- get-student-exam-history-detail`.
- [x] Run `pnpm --dir app/sentinel-api test -- map-exam-response`.
- [x] Run `pnpm --dir app/sentinel-api test -- flow`.
- [x] Run `pnpm --dir app/sentinel-web test -- app/(protected)/student/exam/[id]/lobby`.
- [x] Run `pnpm --dir app/sentinel-web test -- app/(protected)/student/exam/[id]/result`.
- [x] Run `pnpm --dir app/sentinel-web test -- app/(protected)/student/history/details`.
- [x] Run `pnpm --dir app/sentinel-web test -- features/exams/reports`.
- [x] Run `pnpm lint` after focused tests pass.
- [ ] Manually verify in browser: instructor-gated lobby count appears quickly, reconnect text does not show `0 of 0` unless the policy is truly zero, waiting students cannot continue, approved students can continue after refetch, hidden/provisional scores do not show as `0`, and history detail opens the report table in a dialog.

<!-- NOTE: Phase 7 package-level API commands were executed as written, but each expanded into the broad API suite and failed on unrelated environment/repo issues including unreachable Supabase database `aws-1-ap-northeast-1.pooler.supabase.com`, Redis `EPERM 127.0.0.1:6379`, and unrelated access-control import/mock failures. Focused API validation passed with `pnpm exec vitest run src/modules/examination/lobby/services/get-lobby-count.test.ts src/modules/examination/history/services/get-student-exam-history-detail.test.ts src/modules/examination/exams/services/map-exam-response.test.ts src/modules/examination/flow/flow.test.ts` from `app/sentinel-api` (4 files, 22 tests). -->
<!-- NOTE: Phase 7 package-level web commands were executed as written, but the path filters expanded into unrelated suites; two runs were interrupted after hanging in unrelated instructor question-bank tests, and one surfaced unrelated announcement component failures. Focused web validation passed with `pnpm exec vitest run src/app/\(protected\)/student/exam/\[id\]/lobby/page.test.tsx src/app/\(protected\)/student/exam/\[id\]/lobby/_hooks/use-lobby-state.test.tsx src/app/\(protected\)/student/exam/\[id\]/lobby/_hooks/use-lobby-actions.test.tsx src/app/\(protected\)/student/exam/\[id\]/result/page.test.tsx src/app/\(protected\)/student/history/details/page.test.tsx src/app/\(protected\)/student/history/details/_hooks/use-exam-details/index.test.tsx src/app/\(protected\)/student/history/details/_components/attempt-report-dialog.test.tsx src/features/exams/reports/attempt-report-view.test.tsx src/features/exams/reports/_components/attempt-report-actions.test.tsx src/features/exams/reports/_components/attempt-report-summary-cards.test.tsx` from `app/sentinel-web` (10 files, 32 tests). -->
<!-- NOTE: Phase 7 lint was executed with `pnpm lint` and failed before checking touched files because `@sentinel/db` could not find the `eslint` binary (`sh: eslint: command not found`; `pnpm exec eslint --version` also reports `Command "eslint" not found`). -->
<!-- NOTE: Targeted lint for Phase 5/6 touched web files now passes with `pnpm --dir app/sentinel-web exec eslint src/app/\(protected\)/student/history/details/_hooks/use-exam-details/index.test.tsx src/app/\(protected\)/student/history/details/_components/attempt-report-dialog.test.tsx src/features/exams/reports/attempt-report-view.test.tsx src/app/\(protected\)/student/history/details/page.test.tsx src/app/\(protected\)/student/history/details/page.tsx src/app/\(protected\)/student/history/details/_components/attempt-report-dialog.tsx src/app/\(protected\)/student/history/details/_hooks/use-exam-details/index.ts src/app/\(protected\)/student/history/details/_hooks/use-exam-details/_types.ts`; the same files also pass `pnpm exec vitest run src/app/\(protected\)/student/history/details/page.test.tsx src/app/\(protected\)/student/history/details/_hooks/use-exam-details/index.test.tsx src/app/\(protected\)/student/history/details/_components/attempt-report-dialog.test.tsx src/features/exams/reports/attempt-report-view.test.tsx` from `app/sentinel-web` (4 files, 11 tests). -->
<!-- NOTE: Phase 7 browser verification was attempted by starting `pnpm --dir app/sentinel-web dev` at `http://localhost:3000` and opening `/student/history/details?attemptId=manual-check`; the protected route redirected to `/auth/login`. Manual verification remains blocked until a signed-in browser session with matching instructor/student exam data is available. -->

**Migration required:** No — validation only.

## Breaking API Changes

- None planned. Existing endpoints and response keys should remain stable.
- If the history detail response begins returning `null` for score fields where it previously returned provisional values, treat this as a bugfix alignment with existing history list release semantics, not a public contract expansion.

## New Environment Variables

- None.

## Migration Rollback Note

- No Prisma migration is planned. Rollback is a code revert only.

## Done Criteria

- [x] Lobby count renders a useful immediate value from API or presence and does not sit on an unhelpful placeholder during normal loading.
- [x] Reconnect summary never shows `0 used`, `0 left`, or `0 of 0` unless the actual configured reconnect policy is zero.
- [x] Instructor-gated students cannot start from the lobby until approval and runtime-access refresh agree.
- [x] Result preview, history list, and history detail all apply the same hidden/provisional score semantics.
- [x] History detail no longer says `Finalized Report Ready` for report states that are merely released/available.
- [x] History detail opens the report table in a dialog instead of rendering the full table inline.
- [x] Every new exported function has JSDoc.
- [x] Every changed service, hook, and component behavior has focused Vitest coverage.
- [x] Prisma migration decision remains explicitly `No`.
