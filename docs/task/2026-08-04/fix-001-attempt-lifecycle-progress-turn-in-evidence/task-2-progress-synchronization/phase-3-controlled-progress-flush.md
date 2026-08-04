# Task 2 — Phase 3: Controlled-Boundary Progress Flush

**Status:** Not started  
**Depends on:** `phase-2-latest-wins-sync.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Send the latest active snapshot before turn-in navigation without allowing terminal attempts to
mutate or blocking browser teardown indefinitely.

## Implementation Checklist

- [ ] Add exported `flushPendingProgress()` with JSDoc to `useAttemptSync()` and expose it through
      `useStudentExamAttempt()`.
- [ ] Update
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`
      to await active progress flush before writing the turn-in preview and replacing the route;
      skip after terminal latching.
- [ ] Update `useExamInterruption()` in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.ts` to keep
      local draft persistence synchronous without promising a blocking network flush on unload.

## Tests and Verification

- [ ] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx`
      for flush-before-preview ordering, failure fallback, and terminal skip.
- [ ] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.test.tsx`
      to prove drafts persist without duplicate network calls.
- [ ] Run focused `sentinel-web` tests and typecheck.

## Migration Decision

**Migration required:** No — this phase changes controlled client transition ordering.

## Completion Gate

- [ ] Record focused command results here during implementation.
- [ ] Confirm normal turn-in retains the latest count without unload hangs.
- [ ] Confirm terminal attempts never flush queued writes.
- [ ] Mark this phase complete only after tests pass.
