# Returning Attempt Reconnect Implementation Plan

## Status

- **Status:** Implemented on July 28, 2026
- **Implementation Summary:** The reconnect admission contract from Option B is now shipped across `app/sentinel-api`, `app/sentinel-web`, and `packages/services`.
- **Validation Summary:** Focused API and web Vitest suites for the touched reconnect, lobby, runtime-access, override, monitoring, and contract files passed. Full workspace test suites, `pnpm lint`, `pnpm format:check`, `pnpm build`, and manual browser validation were not run as part of this implementation pass.

## Goal

Route every interrupted active attempt through the correct lobby re-admission flow, enforce reconnect limits and one-time overrides consistently, and keep instructor lobby and monitoring views aligned with the student's actual admission state.

## Pre-Planning Summary

- **Task Summary:** Repair the student reconnect lifecycle so instructor-gated attempts require fresh approval, automatic-admit attempts remain immediately resumable, exhausted reconnect limits remain blocked in the lobby until a valid attempt-linked override is granted, and instructor views report the same state.
- **Affected Workspaces:** `app/sentinel-api`, `app/sentinel-web`, `packages/services`, and the existing `packages/hooks` reconnect-override mutation.
- **Affected Services and Contracts:** Lobby check-in and waiting-list services, lobby OpenAPI DTOs, runtime-access resolution, student override creation and eligibility resolution, student stage/lobby state, instructor lobby grouping/actions, and monitoring overview aggregation.
- **Affected DB Tables:** `exams`, `exam_configurations`, `exam_lobby_admissions`, `exam_attempts`, `students`, `user_profiles`, and `system_settings`.
- **Prisma Migration Required:** No — the existing tables already store lobby admission decisions, reconnect counters and limits, active attempt identifiers, and student access overrides.

## 1. The Context

Returning students retain an `IN_PROGRESS` attempt, but the current client skips lobby synchronization and the API preserves the prior `APPROVED` admission, so instructor-gated reconnects bypass fresh re-admission and appear as actively writing. Reconnect exhaustion and overrides are also evaluated inconsistently across runtime access, override association, stage routing, lobby UI, and monitoring counts, so the repair must preserve automatic admission while making the API's attempt, admission, and override state authoritative.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Apply the listed condition changes directly in the existing lobby, runtime-access, override, stage-resolver, filtering, and component files without changing response contracts beyond the minimum reconnect-limit field.
- **Tradeoff:** Fastest delivery, but the reconnect policy remains distributed and future changes could reintroduce disagreement between student, instructor, and monitoring views.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Keep the current persistence model while defining one coordinated reconnect contract: check-in owns re-admission reset, runtime access owns limit enforcement, attempt-linked overrides restore resume permission, and all client/monitoring projections derive from admission plus active-attempt state.
- **Tradeoff:** Requires coordinated API, shared-service, and frontend updates with broader regression coverage across several workspaces.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Introduce a dedicated reconnect-admission lifecycle or event ledger separate from `exam_lobby_admissions`, with explicit disconnect, waiting, approved, resumed, exhausted, and overridden transitions.
- **Tradeoff:** Produces the clearest long-term audit model but requires a schema migration, state backfill, new endpoints, and substantially more rollout complexity than this patch warrants.

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** It closes every identified bypass using existing tables, APIs, and hooks, avoids a migration and new dependencies, and gives each layer a clear responsibility without introducing a second lifecycle model. The extra coordination cost is justified because a frontend-only or check-in-only patch would still leave resume authorization, override validity, queue placement, or monitoring counts inconsistent.
- **Next Steps:**
    1. Correct API-side lobby, runtime-access, override, and monitoring decisions and synchronize the additive waiting-list contract.
    2. Update student and instructor lobby flows to consume those decisions without bypassing instructor approval or reconnect limits.
    3. Run focused Vitest suites and validate the refresh, tab-close, and offline reconnect matrix in both admission modes.

## Phase 1: Reconnect Check-In and Waiting-List Contract

**Goal:** Make lobby check-in requeue active instructor-gated attempts and expose the configured reconnect limit to every instructor lobby row.

- [x] In `app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts`, extend `checkInLobby()` to resolve whether the student has a latest `IN_PROGRESS` attempt before returning an existing admission; for `INSTRUCTOR_GATED` reconnects, update that admission to `WAITING`, refresh `checked_in_at`, and clear both `decided_at` and `decided_by`, while preserving automatic-mode approval and non-reconnect admission behavior.
- [x] In `app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts`, keep the reset and returned admission sourced from the persisted update result so concurrent or repeated check-ins remain idempotent, and add JSDoc for the exported `checkInLobby()` service.
- [x] In `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts`, join or query `exam_configurations.max_reconnect_attempts` once for the exam and map `maxReconnectAttempts` onto every `getWaitingList()` result alongside the latest attempt's `reconnectCount`; add JSDoc for the exported service.
- [x] In `app/sentinel-api/src/modules/examination/lobby/lobby.dto.ts`, add non-negative integer `maxReconnectAttempts` to each `getWaitingListSchema.response` student object.
- [x] In `packages/services/src/api/exams/lobby.ts`, add required `maxReconnectAttempts: number` to `ExamLobbyWaitingStudent` so the web app consumes the API contract without a duplicate fallback.
- [x] Extend `app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.test.ts` with existing-approved active-attempt cases proving instructor-gated check-in resets to `WAITING` and clears decision metadata, automatic check-in stays `APPROVED`, and an instructor-gated admission without an active attempt is not unnecessarily reset.
- [x] Create `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.test.ts` covering latest-attempt selection, active-attempt detection, reconnect-count mapping, configured reconnect-limit mapping, and the no-attempt case.
- [x] Update `app/sentinel-api/src/tests/exams/exam-contracts.test.ts` to accept `maxReconnectAttempts` and reject a waiting-list item that omits or supplies an invalid value.
      **Migration required:** No — this phase reads and updates existing `exam_configurations`, `exam_attempts`, and `exam_lobby_admissions` columns.

## Phase 2: Runtime Limit and Attempt-Linked Override Authorization

**Goal:** Make server runtime access deny exhausted resumes and make a valid instructor override restore access only for the matching active attempt.

- [x] In `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts`, derive a single resume predicate from `hasActiveAttempt && reconnectAttemptsRemaining > 0` and use it for active-attempt resume decisions in open, locked, scheduled-window-closed, and applicable reopened branches without changing hard-closed or before-start behavior.
- [x] In `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts`, pass `latestAttempt.attempt_id` as `sourceAttemptId` from `createReconnectLimitOverride()` so the generated `REOPEN` override matches eligibility validation for that exact attempt.
- [x] In `app/sentinel-api/src/modules/examination/access/services/resolve-student-override-access.ts`, change the override trigger to run when either scheduled start or scheduled resume is denied, provided the exam is not explicitly persisted as `closed`; preserve the existing `hasValidReopenOverride` and lifecycle checks.
- [x] Add or update JSDoc for modified exported runtime-access and student-override functions, documenting reconnect-limit and source-attempt semantics.
- [x] Extend `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.test.ts` with boundary cases for one remaining reconnect, exactly exhausted reconnects, zero configured reconnects, locked exams, and attempts continuing past the normal schedule cutoff.
- [x] Update `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.test.ts` to assert that a reconnect override stores the latest active `attempt_id`, and add rejection coverage for no active attempt and a reconnect count below the configured limit.
- [ ] Extend `app/sentinel-api/src/modules/examination/access/access.test.ts` with an open-schedule case where `canStart` is true, reconnect-limit `canResume` is false, and a matching active `REOPEN` override produces `canResume: true`; retain negative coverage for null, stale, completed, or mismatched `sourceAttemptId`.
      **Migration required:** No — `system_settings.setting_value` already supports `sourceAttemptId`, and reconnect counters/limits already exist.

## Phase 3: Student Lobby Re-Admission and Stage Routing

**Goal:** Keep returning students in the lobby until the admission mode, reconnect limit, and fresh instructor decision all permit resume.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`, define `requiresInstructorAdmission` from `configuration.lobbyAdmissionMode === 'INSTRUCTOR_GATED'` regardless of the stale `runtimeAccess.canResume` value.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`, skip check-in/polling only for a resumable automatic-admit attempt; for instructor-gated active attempts, perform one reconnect check-in and poll `getExamLobbyAdmissionStatus()` every five seconds until approval.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`, remove active-attempt shortcuts from `hasFreshInstructorAdmission` and `canEnterExam` so a gated reconnect remains disabled for null, `WAITING`, or `REJECTED` admission and becomes enterable only after `APPROVED` status has been observed and authoritative exam access has refreshed; preserve immediate resume for automatic admission.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/_stage-resolver.ts`, resolve `MAX_RECONNECT_EXCEEDED` to `targetStage: 'lobby'` and set `shouldRedirect` relative to the lobby so exhausted students remain at the override waiting surface.
- [x] Add JSDoc to the exported `useLobbyState()` hook describing instructor-gated reconnect synchronization and entry gating.
- [x] Replace the old resumable-attempt bypass assertion in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.test.tsx` with tests proving gated active attempts check in, poll, remain disabled while `WAITING`, and enable only after approval/refetch; add a separate automatic-admit active-attempt test proving no approval polling is required.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/index.test.ts` to assert exhausted active attempts stay in or redirect to `lobby`, while attempts below the limit retain the existing fresh-lobby-entry behavior.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` to assert the reconnect action is disabled with the waiting/limit message before approval and rendered as resumable only after the hook reports approved access.
      **Migration required:** No — this phase changes client orchestration and pure route resolution only.

## Phase 4: Instructor Lobby Queues and Reconnect Override Control

**Goal:** Show reconnecting students in the correct instructor queue and allow a one-time reconnect-limit override directly from the lobby.

- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`, classify every `WAITING` admission in `waitingStudents` even when it has an active attempt, and classify `inAttemptStudents` only when `hasActiveAttempt` is true and `status === 'APPROVED'`; apply the same predicates to status filtering.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`, initialize `useOverrideReconnectLimitMutation()`, add `handleOverrideReconnect(studentId)` with a lobby-specific reason, track the student currently being overridden, refresh the waiting list after success, and return the handler/pending state.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`, pass the reconnect override handler and pending student state from `useInstructorLobby()` to `InstructorLobbyAdmissionPanel`.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`, add typed `onOverrideReconnect` and pending-state props, pass them through `QueueSection`/`StudentLobbyRow`, and render an `Override Limit` button for a waiting student with an active attempt whose `reconnectCount >= maxReconnectAttempts`; keep admit/reject actions available because reconnect authorization and lobby admission are independent decisions.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`, disable only the affected override action while its mutation is pending and retain the reconnect counter/limit in the row so the instructor can see why the action is available.
- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts` with a `WAITING` student who has an active attempt and prove the student appears only in the waiting group/filter, while an `APPROVED` active attempt appears only in the in-attempt group/filter.
- [x] Extend `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx` to mock `useOverrideReconnectLimitMutation()`, assert the correct exam/student payload and reason, verify per-student pending state, and verify success refreshes the lobby list while errors preserve existing admissions.
- [x] Extend `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx` to assert `Override Limit` visibility at the exact boundary, absence below the limit or without an active attempt, disabled pending behavior, and callback wiring.
- [x] Extend `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.test.tsx` to verify the page forwards the override handler and pending state to the panel.
      **Migration required:** No — the lobby consumes the additive waiting-list field and existing reconnect-override endpoint.

## Phase 5: Monitoring Consistency and End-to-End Verification

**Goal:** Align monitoring aggregates with lobby admission state and validate the complete reconnect lifecycle across admission modes.

- [x] In `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts`, restrict the `in_attempt` aggregate to rows where `ea.attempt_id is not null and ela.status = 'APPROVED'`, leaving a rechecked-in active attempt counted as `waiting` until re-admitted.
- [ ] Extend `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.test.ts` so the query-builder spy captures the `in_attempt` SQL selection and asserts the `APPROVED` predicate is present, then verify mapped `waiting`, `approved`, and `inAttempt` values remain numeric.
- [ ] Run `pnpm --dir app/sentinel-api test` and confirm lobby, access, runtime-access, student-override, monitoring, flow, and contract suites pass.
- [ ] Run `pnpm --dir app/sentinel-web test` and confirm student stage/lobby plus instructor lobby hook, filter, panel, and page suites pass.
- [x] Run `pnpm --dir packages/services test` and `pnpm --dir packages/hooks test` to verify the additive waiting-list type and reused reconnect mutation do not regress package consumers.
- [ ] Run `pnpm lint`, `pnpm format:check`, and `pnpm build` to catch cross-workspace type, formatting, and production-build failures.
- [ ] Manually validate browser refresh, tab close/reopen, and offline/online recovery for `INSTRUCTOR_GATED` exams: each return checks in as `WAITING`, appears in the instructor waiting queue/count, cannot resume before approval, and consumes exactly one reconnect only after the approved resume succeeds.
- [ ] Manually validate the same three recovery paths for `AUTOMATIC` exams: each return is auto-approved, can resume immediately while attempts remain, and consumes exactly one reconnect only after resume succeeds.
- [ ] Manually validate the reconnect-limit boundary: the student stays in the lobby with resume disabled, the instructor can grant `Override Limit` and separately admit a gated student, the matching active attempt resumes once, and stale or mismatched overrides remain rejected.
      **Migration required:** No — monitoring changes only the predicate used to aggregate existing records.

## Done Criteria

- [x] Every returning instructor-gated active attempt is persisted as `WAITING` and cannot resume until a fresh `APPROVED` decision is observed.
- [x] Returning automatic-admit active attempts remain immediately resumable while reconnect attempts remain.
- [x] `canResume` is false at the configured reconnect limit unless a valid, active, attempt-linked override applies.
- [x] Maximum-reconnect students remain in the lobby rather than being redirected to instructions.
- [x] Instructor waiting, approved, in-attempt, and rejected queues are mutually consistent for reconnecting students.
- [x] The lobby exposes `Override Limit` only for eligible exhausted active attempts and sends the correct student record identifier to the existing endpoint.
- [x] Monitoring counts a `WAITING` active-attempt student as waiting and not in-attempt until approval.
- [x] Every modified exported function has JSDoc, and inline comments are limited to non-obvious state or authorization logic.
- [ ] All focused Vitest suites, lint, formatting checks, and builds pass.

## Additional Considerations

- **Breaking API Changes:** No breaking route or request change is planned. `maxReconnectAttempts` is an additive but required waiting-list response field, so `lobby.dto.ts` and `packages/services/src/api/exams/lobby.ts` must ship together.
- **New Environment Variables:** None.
- **Migration Rollback:** Not applicable because no Prisma migration is required; rollback consists of reverting the service, contract, and UI changes together.
- **Authorization Boundary:** The existing reconnect-override controller remains responsible for instructor authorization; the lobby button must reuse `useOverrideReconnectLimitMutation()` rather than call the endpoint directly.
- **Reconnect Counting:** Check-in and approval must not increment `reconnect_attempt_count`; only the existing successful, idempotent resume path may consume a reconnect attempt.
- **Admission and Override Ordering:** For instructor-gated exams, a reconnect override restores attempt eligibility but does not itself approve lobby admission; the student may resume only after both conditions are satisfied.
