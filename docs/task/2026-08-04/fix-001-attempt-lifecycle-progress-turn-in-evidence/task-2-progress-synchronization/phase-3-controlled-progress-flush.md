# Task 2 — Phase 3: Controlled-Boundary Progress Flush

**Status:** In progress  
**Depends on:** `phase-2-latest-wins-sync.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Send the latest active snapshot before turn-in navigation without allowing terminal attempts to
mutate or blocking browser teardown indefinitely.

## Implementation Checklist

- [x] Add exported `flushPendingProgress()` with JSDoc to `useAttemptSync()` and expose it through
      `useStudentExamAttempt()`.
- [x] Update
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.ts`
      to await active progress flush before writing the turn-in preview and replacing the route;
      skip after terminal latching.
- [x] Update `useExamInterruption()` in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.ts` to keep
      local draft persistence synchronous without promising a blocking network flush on unload.

## Tests and Verification

- [x] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx`
      for flush-before-preview ordering, failure fallback, and terminal skip.
- [x] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.test.tsx`
      to prove drafts persist without duplicate network calls.
- [x] Run focused `sentinel-web` tests and typecheck. - Focused vitest files passed: - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.test.tsx` - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx` - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.test.tsx` - `pnpm exec tsc --noEmit` in `app/sentinel-web` reported unrelated workspace-wide type errors,
      so the typecheck did not finish cleanly in this environment.

## Migration Decision

**Migration required:** No — this phase changes controlled client transition ordering.

## Completion Gate

- [x] Record focused command results here during implementation.
    - `pnpm exec vitest run 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.test.tsx' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-submission.test.tsx' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx' 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.test.tsx' --config vitest.config.ts`
        - `Test Files  4 passed (4)`
        - `Tests  44 passed (44)`
- [x] Confirm normal turn-in retains the latest count without unload hangs.
- [x] Confirm terminal attempts never flush queued writes.
- [ ] Mark this phase complete only after tests pass.
