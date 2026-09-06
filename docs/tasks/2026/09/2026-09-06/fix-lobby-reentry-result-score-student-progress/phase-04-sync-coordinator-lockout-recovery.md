---
title: "Phase 4: Client Sync Coordinator Unblocking Upon Attempt Resumption"
type: phase
parent: "fix-lobby-reentry-result-score-student-progress"
phase: "04"
status: completed
created: "2026-09-06"
tags: [task, phase, sync, student, coordinator, lockout-recovery]
---

# Phase 4: Client Sync Coordinator Unblocking Upon Attempt Resumption

## Objective

Ensure that when a student resumes an attempt following instructor re-entry authorization, client-side terminal 409 latches (`isTerminallyBlockedRef` and `localBlockedMessage`) are cleanly reset, allowing debounced background progress saves to resume persisting answer counts to PostgreSQL.

## Dependencies & Prerequisites

- Phase 1, 2, 3 complete or independent.

## Impacted Files & Components

- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-blocked-state.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/attempt/_hooks/use-student-exam-attempt/use-attempt-blocked-state.ts): Expose reset helper for `localBlockedMessage`.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync-coordinator.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/attempt/_hooks/use-student-exam-attempt/use-attempt-sync-coordinator.ts): Expose reset helper for `isTerminallyBlockedRef`.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.ts): Reset coordinator state when session is active or resumes.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/attempt/_hooks/use-student-exam-attempt/index.ts): Wire unblocking upon active resumption.

## Implementation Tasks

- [x] **Task 4.1 (Expose Reset Mechanisms on Blocked State and Coordinator):**
  - In `use-attempt-blocked-state.ts`:
    - Add `clearBlockedState: () => void` that sets `setLocalBlockedMessage(null)` and `setTerminalAttemptSuspended(false)`.
  - In `use-attempt-sync-coordinator.ts`:
    - Return `resetTerminallyBlocked: () => void` that sets `isTerminallyBlockedRef.current = false`.
  - In `use-attempt-sync.ts`:
    - Expose `resetSyncBlock: () => void`.

- [x] **Task 4.2 (Reset Latches on Attempt Resumption):**
  - In `use-student-exam-attempt/index.ts`:
    - When `terminalLifecycle.isTerminal` is false, and `terminalLifecycle.blockedState.isBlocked` is false, and attempt status from the server indicates active progress (`IN_PROGRESS`), ensure `localBlockedMessage` and `resetSyncBlock` are triggered if previously latched.
    - Also invoke `resetSyncBlock` when `resumeSecuredExam` is triggered.

- [x] **Task 4.3 (Sync Coordinator Recovery Tests):**
  - In `use-attempt-sync.test.tsx`:
    - Add test scenario:
      1. Trigger a 409 rejection to latch `isTerminallyBlockedRef`.
      2. Verify further `sendSnapshot` calls are suppressed.
      3. Call `resetSyncBlock()`.
      4. Verify `sendSnapshot` executes normally on subsequent answer changes.

## Verification & Testing

- Run test suites:

  ```bash
  pnpm --dir app/sentinel-web test src/app/\(protected\)/student/exam/\[id\]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.test.tsx
  pnpm --dir app/sentinel-web test src/app/\(protected\)/student/exam/\[id\]/attempt/_hooks/use-student-exam-attempt/index.test.tsx
  ```

## Risks & Rollback

- **Risk:** Unblocking prematurely could re-send to an actually closed attempt; mitigated by the fact that backend `syncSessionService` enforces hard atomicity and returns 409 if closed.
- **Rollback:** Revert coordinator reset helper in `use-attempt-sync-coordinator.ts`.
