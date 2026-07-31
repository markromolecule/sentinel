# Implementation Plan - Exam Flow Component Fixes

Summary: Fix the student lobby, attempt passage panel, result/turn-in summary, and instructor exam-rule surfaces so exam entry state, reconnect counts, passage-only reading content, and score-release behavior are clear and consistent.

## Status Update

- Updated on `2026-07-01` after implementation work.
- Completed items are checked below.
- Remaining unchecked items are still pending, blocked, or not yet verified.
- Current blocker: `app/sentinel-api/src/modules/examination/configuration/configuration.service.test.ts` still depends on external DB connectivity.

---

## Pre-Planning Checklist

- [x] Read and summarize the task input in one sentence.
- [x] Scan relevant source files to understand existing patterns in student lobby, student attempt, student result, instructor lobby, exam builder, configuration, reporting, and flow completion paths.
- [x] Identify all touched files, services, and DB tables:
      `exam_configurations`, `exam_lobby_admissions`, `exam_attempts`, `exams`, `students`, and `user_profiles`.
- [x] Determine if a Prisma migration is needed.
      **Migration required:** No - `exam_configurations.release_score_mode`, `exam_configurations.lobby_admission_mode`, `exam_lobby_admissions`, and `exam_attempts.reconnect_attempt_count` already exist in `packages/db/prisma/schema.prisma`.

---

## 1-3-1 Rule

### Viable Options

#### Option 1: Focused component and contract fixes (Recommended)

- Update the existing student lobby, attempt passage, result page, builder sidebar/config toggles, and lobby API/query behavior in place with focused tests.
- _Tradeoff:_ Some duplicated `sentinel-web` and `sentinel-core` exam-builder metadata remains, but the implementation stays low-risk and aligned with current app boundaries.

#### Option 2: Shared exam-flow presentation refactor

- Extract shared lobby/result/passage display helpers and builder rule metadata into shared packages, then consume them from `sentinel-web` and `sentinel-core`.
- _Tradeoff:_ Reduces future drift, but expands the scope beyond the requested fixes and risks regressions in preview, reporting, and grading surfaces.

#### Option 3: Backend-first enforcement with minimal UI changes

- Enforce score-release and lobby admission strictly through API responses, while only making small frontend copy and disabled-state adjustments.
- _Tradeoff:_ Stronger server guarantees, but underdelivers on the requested UX improvements and leaves the result page visually dated.

### Best Option

**Option 1** is the best fit. The required schema and services mostly exist, the reported problems are concentrated in app-level components and query behavior, and targeted changes can satisfy the request without introducing new dependencies or a broad shared-component migration.

### Concrete Next Steps

1. Tighten lobby count refresh and admission approval state in the student and instructor lobby paths.
2. Remove provenance metadata from the student attempt passage panel while preserving passage rendering and other contexts that still need source details.
3. Redesign the student result/turn-in page around score-release mode so hidden scores remain hidden until instructor finalization.
4. Add the score-release toggle to the instructor exam-builder sidebar in both `sentinel-web` and `sentinel-core`, and ensure the existing full configuration form remains correct.
5. Add focused Vitest coverage for hooks, components, service contracts, and backend score-release/lobby behavior.

---

## Phase 1: Lobby Count Freshness and Admission Gating

**Goal:** Make lobby count and admission state feel immediate while keeping `Continue to Attempt` disabled until runtime access is actually approved.

- [x] Modify `packages/hooks/src/query/exams/use-exam-lobby-count-query.ts` to reduce stale lobby count behavior by setting `staleTime: 0`, enabling `refetchOnMount`, and exposing a predictable short refetch cadence that can be invalidated immediately after lobby check-in.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx` to call `refetch` from `useExamLobbyCountQuery(examId)` after `useLobbyState` reports a successful check-in or approval refresh, and keep `presenceCount` only as a fallback when the API count fails.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts` to expose the latest admission status and an `onAdmissionSynced` callback hook point so the page can invalidate the lobby count without duplicating API calls.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx` to keep the primary button disabled when `runtimeAccess.state === 'lobby_waiting'`, including the `LOBBY_REJECTED` and `LOBBY_WAITING` reason-code cases, even if local readiness is complete.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-header.tsx` and `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-status-info.tsx` to always display reconnect used, remaining, and total counts when `runtimeAccess.totalReconnectAttempts` and `runtimeAccess.reconnectAttemptsRemaining` are present.
- [x] Modify `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts` to optimistically move approved/rejected students between columns after `updateExamLobbyAdmissions`, then reconcile with `refreshLobbyAdmissions()`.
- [x] Modify `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts` with the same optimistic update and reconcile behavior.
- [ ] Review `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.ts` to confirm it counts `WAITING` and `APPROVED` students without active `IN_PROGRESS` attempts, and adjust only if the UI requirement needs approved students excluded.
- [ ] Extend `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.test.ts` to cover the intended count semantics for waiting, approved, rejected, and active-attempt admissions.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.test.tsx` to verify approved admission triggers `refetchExam`, waiting admission leaves `canEnterExam` false, and reconnect totals are preserved.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` to verify lobby count fallback, count refetch behavior, disabled button while waiting, and enabled button after `runtimeAccess.canStart`.
- [x] Create or extend tests for `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts` and `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts` to cover optimistic admission updates.
      **Migration required:** No - uses existing `exam_lobby_admissions` and `exam_attempts.reconnect_attempt_count`.

---

## Phase 2: Student Attempt Passage-Only Panel

**Goal:** Show only the passage content during a student attempt and remove file name, source, reference page, and provenance notes from that runtime panel.

- [x] Modify `app/sentinel-web/src/features/exams/_components/engine/utils.ts` by adding a dedicated exported helper such as `getRuntimePassageDetails()` that returns title `Passage`, an empty or minimal description, and rendered passage HTML from `passageContent` only.
- [ ] Preserve `getExamContextDetails()` in `app/sentinel-web/src/features/exams/_components/engine/utils.ts` for preview/reporting contexts that still need source evidence or exam-description fallbacks.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts` to use the new runtime helper with `currentQuestion.passageContent` and `currentQuestion.passageType`, without passing `sourceEvidence`, `sourceFileName`, or `sourcePageNumber`.
- [x] Modify `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-passage.tsx` to remove the `Source` and `Notes` footer grid, and render only the passage title plus body or a compact no-passage empty state.
- [ ] Review `app/sentinel-web/src/features/exams/export/exam-print-export.tsx` and `app/sentinel-web/src/features/exams/reports/_components/attempt-report-question-card.tsx` to ensure provenance remains available outside the live student attempt surface.
- [x] Add or extend tests in `app/sentinel-web/src/features/exams/_components/engine/utils.test.ts` for the new runtime helper, including plain passage, HTML passage, source evidence ignored, and empty passage behavior.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` to verify the runtime passage panel shows passage text and does not render source file name, page number, or source labels.
- [ ] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` to verify `currentContext` is passage-only for AI PDF questions.
      **Migration required:** No - display-only changes using existing question passage fields.

---

## Phase 3: Result Page UX and Score Release Enforcement

**Goal:** Redesign the result/turn-in page so it is cleaner and never exposes score values when `releaseScoreMode` is `MANUAL_RELEASE` until the instructor finalizes scores.

- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts` to accept `releaseScoreMode` from the effective exam configuration and store a redacted preview when scores are not auto-released.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage.ts` so `StoredExamTurnInPreview` includes `releaseScoreMode`, `scoreVisible`, and a summary shape that can omit `score`, `totalScore`, and `percentage` while retaining answered/manual-review counts.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` to split the page into small local components such as `ResultHero`, `ResultMetricGrid`, `ResultReleaseNotice`, and `ResultFooterActions` without exporting them unless needed by tests.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` to show a hidden-score state when `preview.scoreVisible === false`, with no numeric score, grade, or percentage rendered.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` to keep important non-score details visible: answered count, manual-review count, submission readiness, and instructor-finalization status.
- [x] Modify `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` to keep the `completeExamSession()` payload unchanged and rely on the server to store actual scoring.
- [ ] Review `app/sentinel-api/src/modules/examination/flow/services/complete-session.service.ts` to ensure the response shape does not become the source of post-submit score leakage in the immediate student redirect flow.
- [ ] Extend `app/sentinel-api/src/modules/examination/reporting/services/get-attempt-report.test.ts` to keep coverage for `MANUAL_RELEASE` attempts blocked until `grading.finalizedAt`.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.test.tsx` to cover auto-release score display, manual-release hidden-score display, manual-review copy, missing preview state, and successful turn-in redirect.
- [x] Add or extend tests for `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage.ts` to validate backward-compatible reads of old previews and redacted preview persistence.
      **Migration required:** No - uses existing `exam_configurations.release_score_mode` and client storage changes only.

---

## Phase 4: Exam Builder Score-Release Rule Surface

**Goal:** Make the exam builder clearly expose whether student scores are released immediately after the exam or only after instructor finalization.

- [x] Modify `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store/constants.ts` to include `releaseScoreMode: 'AUTO_RELEASE'` in `DEFAULT_EXAM_CONFIGURATION` if it is not already hydrated through defaults.
- [x] Modify `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/_constants/index.ts` so `ExamRuleToggleOption` supports `configuration.releaseScoreMode`, adds an `Auto Release Scores` toggle, maps checked to `AUTO_RELEASE`, and unchecked to `MANUAL_RELEASE`.
- [x] Modify `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/use-builder-workspace-actions.ts` to add `handleToggleReleaseScoreMode(checked: boolean)` and call `updateConfiguration('releaseScoreMode', checked ? 'AUTO_RELEASE' : 'MANUAL_RELEASE')`.
- [x] Modify `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/_types.ts` and `exam-builder-sidebar.tsx` to pass and use the release-score toggle handler.
- [x] Modify `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/_constants/index.ts` `getSystemConfigurationRows()` to show `Score Release` as either `Immediately after submit` or `After instructor finalization`.
- [x] Mirror the same changes in `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/_constants/index.ts`, `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/use-builder-workspace-actions.ts`, `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/_types.ts`, and `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-sidebar.tsx`.
- [x] Review `app/sentinel-web/src/features/exams/config/_components/exam-rules-section.tsx` and `app/sentinel-core/src/features/exams/config/_components/exam-rules-section.tsx` to ensure the full configuration form already stores `configuration.releaseScoreMode` correctly and the label/copy matches builder terminology.
- [x] Extend `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/_constants/index.test.ts` and `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/_constants/index.test.ts` for release-score toggle state, apply handler routing, and summary row rendering.
- [x] Extend `app/sentinel-web/src/features/exams/config/_components/exam-rules-section.test.tsx` and `app/sentinel-core/src/features/exams/config/_components/exam-rules-section.test.tsx` to verify toggling `Auto-release student scores` writes `AUTO_RELEASE` and `MANUAL_RELEASE`.
- [ ] Extend `app/sentinel-api/src/modules/examination/configuration/configuration.service.test.ts` to verify saving and fetching `configuration.releaseScoreMode` through `ConfigurationService.updateExamConfiguration()`.
      **Migration required:** No - `release_score_mode` is already persisted on `exam_configurations`.

---

## Phase 5: API Contract and Runtime Access Regression

**Goal:** Ensure lobby runtime access, reconnect counts, and score-release contracts stay consistent between API, services, hooks, and UI consumers.

- [ ] Review `packages/shared/src/schema/exams/assessment-schema.ts` and `packages/shared/src/types/exams/exam.ts` to confirm `releaseScoreMode` remains typed as `'AUTO_RELEASE' | 'MANUAL_RELEASE'` and `lobbyAdmissionMode` remains `'AUTOMATIC' | 'INSTRUCTOR_GATED'`.
- [ ] Review `packages/services/src/api/exams/types.ts` to confirm `ExamConfigurationState`, `StartExamSessionResult`, and runtime access types expose `releaseScoreMode`, `reconnectAttemptCount`, `maxReconnectAttempts`, `totalReconnectAttempts`, and `reconnectAttemptsRemaining` as needed by the UI.
- [ ] Modify `packages/services/src/api/exams/lobby.ts` only if the UI needs a richer count/admission response, and avoid breaking the existing `{ count: number }` contract unless tests show it is necessary.
- [ ] Extend `app/sentinel-api/src/modules/examination/access/services/resolve-lobby-runtime-access.ts` tests or create `resolve-lobby-runtime-access.test.ts` to cover waiting, rejected, approved, and resumable attempt states.
- [ ] Extend `app/sentinel-api/src/modules/examination/access/access.test.ts` or `evaluate-student-exam-eligibility` coverage to confirm `INSTRUCTOR_GATED` students cannot start until `APPROVED`.
- [ ] Extend `app/sentinel-api/src/modules/examination/flow/flow.test.ts` to confirm `startSessionService` returns reconnect counts on resumed attempts and respects max reconnect attempts.
- [ ] Extend `packages/services/src/api/exams/lobby.test.ts` if a test harness exists; otherwise create one next to `packages/services/src/api/exams/lobby.ts` to cover `getExamLobbyCount`, `getExamLobbyAdmissionStatus`, and `updateExamLobbyAdmissions` request paths.
      **Migration required:** No - contract and access regression tests only.

---

## Phase 6: Validation and Manual QA

**Goal:** Verify the fixes with focused automated tests and a short browser pass across student and instructor exam flows.

- [ ] Run `pnpm --dir app/sentinel-api test` or focused suites for lobby, access, flow, configuration, and reporting services.
- [x] Run `pnpm --dir app/sentinel-web test` or focused suites for student lobby, attempt page, result page, exam builder sidebar, and exam config rule components.
- [x] Run `pnpm --dir app/sentinel-core test` or focused suites for exam builder sidebar and exam config rule components.
- [ ] Run `pnpm --dir packages/services test` if service API client tests are added.
- [ ] Run `pnpm --dir packages/shared test` if shared schema/type helper tests are changed.
- [ ] Manually verify a student in an instructor-gated exam sees `Continue to Attempt` disabled while waiting and enabled after instructor approval.
- [ ] Manually verify lobby count updates within the expected short interval after check-in, approval, rejection, and entry into an active attempt.
- [ ] Manually verify reconnect display shows used, remaining, and total attempts for first attempt and resumed attempt states.
- [ ] Manually verify the live attempt passage panel shows only passage content and no source file, reference page, or notes.
- [ ] Manually verify the result page displays scores for `AUTO_RELEASE` and hides scores for `MANUAL_RELEASE` before finalization.
- [ ] Manually verify instructor builder and full configuration form save `AUTO_RELEASE` and `MANUAL_RELEASE` correctly in both `sentinel-web` and `sentinel-core`.
- [ ] Confirm no new `.env` variables are required.
- [x] Confirm no breaking API changes are introduced for existing consumers.
      **Migration required:** No - verification only.

---

## Done Criteria

- [ ] Every implementation task references a concrete file, function, component, or test target.
- [ ] Each phase includes at least one test task.
- [ ] Migration decision is explicit and remains `No` unless implementation discovers a missing deployed column.
- [x] Student lobby entry remains gated by backend `runtimeAccess.canStart` or `runtimeAccess.canResume`.
- [x] Student attempt passage panel does not show source file names, reference pages, or source labels.
- [x] Manual score-release mode does not expose score, total score, percentage, or grade on the student result page before finalization.
- [x] Instructor builder surfaces score-release mode in both `sentinel-web` and `sentinel-core`.
- [x] JSDoc is added for any new exported function or helper.
- [ ] Inline comments are added only where the logic is not self-explanatory.

---

## Additional Considerations

- Breaking API changes: Avoid changing existing lobby or flow response shapes unless absolutely necessary. If a richer response is needed, add fields in a backward-compatible way.
- New `.env` variables: None expected.
- Migration rollback note: Not applicable because no Prisma schema or SQL migration is planned.
- Accessibility: Preserve button disabled semantics and ensure hidden-score copy is readable without relying on color alone.
- Security: Do not trust client-side redaction as the only source of truth. Keep `getAttemptReport()` server-side blocking for `MANUAL_RELEASE` and unfinalized essay/manual-review attempts.
- UI consistency: Keep the result page aligned with the existing system theme and avoid marketing-style hero layouts; this is an operational student workflow screen.
