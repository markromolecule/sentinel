# Task 2 — Phase 1: Decouple Answer Debounce from the Timer

**Status:** ✅ Complete  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Give sync operations a stable callback so the two-second answer debounce expires while
`elapsedSeconds` continues changing every second.

## Implementation Checklist

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`, store
      elapsed time in a ref and remove it from `syncProgress` callback identity; require explicit
      snapshot time where correctness depends on it.
- [x] Add `isAttemptActive` to `useExamSession()` and stop timer, draft writes, and remote sync after
      terminal lifecycle latching.
- [x] Refactor
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.ts`
      so answer changes own the two-second debounce and elapsed time is read from a ref at send time.
- [x] Add a bounded heartbeat interval for elapsed/lifecycle freshness without sending an unchanged
      answer snapshot every second.
- [x] Route the `online` retry through the same stable scheduler rather than spawning a parallel
      request.

## Tests and Verification

- [x] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.test.tsx` with
      fake-timer cases for callback stability and terminal cancellation.
- [x] Create
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.test.tsx`
      covering continuous timer ticks, two-second answer sync, heartbeat, online retry, and cleanup.
- [x] Run the focused `sentinel-web` tests and typecheck.

## Migration Decision

**Migration required:** No — scheduling uses the existing sync contract.

## Completion Gate

- [x] Record focused command results here during implementation.

    ```
    Test Files  16 passed (16)
    Tests  106 passed (106)
    Start at  13:48:12
    Duration  16.81s
    ```

- [x] Prove one answer change syncs within the configured debounce while the timer advances.
      → `calls syncProgress exactly once after the debounce window` test confirms this.
      → `reads the latest elapsed value from the ref at fire time even after timer ticks` test proves elapsed is fresh.
- [x] Confirm heartbeat does not resend unchanged answer snapshots every second.
      → `fires heartbeat at each interval without re-sending answer payload` test asserts `answers === undefined` in the heartbeat call.
- [x] Mark this phase complete only after tests pass. ✅
