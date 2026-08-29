---
title: "Phase 2: Session Reconnect & Submission Lifecycle Status"
type: phase
parent: "docs/tasks/2026/08/2026-08-28/fix-exam-system-production-issues/README.md"
phase: "2"
status: completed
created: "2026-08-28"
tags: [task, phase, session, lifecycle, reconnect, submission]
---

# Phase 2: Session Reconnect & Submission Lifecycle Status (ISSUE-02, ISSUE-03)

## Objective

Eliminate false "Maximum reconnect attempts reached" HTTP 403 lockouts on initial exam attempts or network disconnects, and ensure successfully turned-in exams display the `/result` submission confirmation screen instead of an alarming `[CLOSED]` alert.

## Dependencies & Prerequisites

- Phase 1 completed or running in parallel.

## Impacted Files & Components

- **Modified:**
  - `app/sentinel-api/src/modules/examination/flow/data/_logic/create-session.logic.ts`: Fix `countAttempts` check to count only completed attempts against `maxSessionsAllowed`, allowing first-time attempts to start even when `maxReconnectAttempts` is 0.
  - `app/sentinel-api/src/modules/examination/flow/data/_queries/attempt-queries.ts`: Ensure `countAttempts` filters out superseded or non-completed attempts when checking if a new session is permitted.
  - `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`: Handle completed attempts gracefully so `runtimeAccess` does not generate `closed` blocks.
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/_stage-resolver.ts`: Prioritize completed state (`runtimeAccess.isTurnedIn` / `status === 'COMPLETED'`) over `BLOCKED_CLOSED` guards.
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts`: Ensure completed attempts do not trigger `resolveLifecycleBlockedState` `Exam Closed` alerts.
- **Tests:**
  - `app/sentinel-api/src/modules/examination/flow/flow.test.ts`: Add tests for first-time session creation with `maxReconnectAttempts: 0`.
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/index.test.ts`: Add test verifying completed attempt redirects to `result` regardless of exam schedule cutoff.

## Implementation Tasks

- [x] Task 2.1 — Refactor `create-session.logic.ts` `handleFreshAttempt`:
  - Change attempt counting constraint: a fresh attempt is permitted if existing completed attempts < max allowed attempts. First attempt (`attemptCount === 0`) must never be blocked by `maxReconnectAttempts === 0`.
  - Ensure reconnect logic with matching `resumeRequestId` or active in-progress status safely increments or maintains counters without false 403 errors.
- [x] Task 2.2 — Update `evaluate-student-exam-eligibility.service.ts`:
  - When `latestAttempt?.completed_at` is set, set `runtimeAccess.isTurnedIn = true` and prevent falling back into scheduled cutoff `closed` status for the submitting student.
- [x] Task 2.3 — Update `_stage-resolver.ts` & `use-student-exam-data.ts` in `sentinel-web`:
  - Ensure that when an attempt has been turned in, `resolveStudentExamStage` resolves to targetStage `'result'` with `reasonCode: 'TURNED_IN'`, bypassing `BLOCKED_CLOSED`.
  - Suppress `isBlocked: true` in `use-student-exam-data.ts` if `runtimeAccess.isTurnedIn` is true.

## Verification & Testing

- Run API flow and session tests:

  ```bash
  pnpm --filter sentinel-api test flow
  # PASS: 9/9 test files passed, 55/55 tests passed
  pnpm --filter sentinel-api test session.repository
  # PASS: 1/1 test file passed, 12/12 tests passed
  ```

- Run Web stage resolver tests:

  ```bash
  pnpm --filter sentinel-web test student-exam-flow
  # PASS: 1/1 test file passed, 21/21 tests passed
  ```


## Risks & Rollback

- **Risk:** Relaxing attempt counting could permit extra attempts if an uncompleted attempt is abandoned.
- **Mitigation:** Ensure attempt counting strictly enforces single in-progress session per student per exam.
