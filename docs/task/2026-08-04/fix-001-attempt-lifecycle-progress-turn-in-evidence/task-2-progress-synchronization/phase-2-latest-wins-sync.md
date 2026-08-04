# Task 2 — Phase 2: Latest-Wins Sync and Guarded Persistence

**Status:** ✅ Complete  
**Depends on:** `phase-1-decouple-answer-debounce.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Prevent older overlapping requests from overwriting newer progress and make persistence conditional
on an active attempt.

## Implementation Checklist

- [x] Add a one-in-flight/latest-pending coordinator inside `useAttemptSync()` so new snapshots
      replace the queued snapshot and only the newest values send after the active request.
- [x] Propagate terminal `409` once to `onLifecycleBlocked()` and clear queued work.
- [x] Update `syncAttemptProgress()` in
      `app/sentinel-api/src/modules/examination/flow/data/_mutations/attempt-mutations.ts` with
      `status = IN_PROGRESS`, `completed_at IS NULL`, and `lifecycle_state = IN_PROGRESS` predicates;
      return whether a row was updated.
- [x] Update `syncSessionService()` in
      `app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts` to convert a
      zero-row guarded update into the existing lifecycle `409` instead of logging success.
- [x] Keep `answered_question_count` authoritative in
      `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts`; a
      closed-unsubmitted attempt retains its last persisted percentage.

## Tests and Verification

- [x] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.test.tsx`
      for latest-wins ordering and terminal queue cancellation.
- [x] Extend `app/sentinel-api/src/modules/examination/flow/flow.test.ts` and
      `app/sentinel-api/src/modules/examination/flow/data/session.repository.test.ts` for guarded
      updates, concurrent closure, and zero-row conflicts.
- [x] Extend
      `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts`
      with `1/28 = 4%`, `21/28 = 75%`, closed `21/28 = 75%`, and submitted `100%` cases.
- [x] Run focused API/web tests and typechecks.
      `pnpm exec tsc --noEmit` was started in `app/sentinel-api`, but the workspace typecheck did not
      return in this environment, so the completed verification is the focused API/web test subset
      recorded below.

## Migration Decision

**Migration required:** No — this phase adds predicates and request coordination.

## Completion Gate

- [x] Record focused command results here during implementation.
  - `pnpm exec vitest run 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.test.tsx' --config vitest.config.ts -t 'heartbeat|online retry|one-in-flight coordinator'`
    - `Test Files  1 passed (1)`
    - `Tests  10 passed | 10 skipped (20)`
  - `pnpm exec vitest run 'src/modules/examination/flow/flow.test.ts' 'src/modules/examination/flow/data/session.repository.test.ts' 'src/modules/examination/monitoring/services/map-monitoring-response.test.ts' --config vitest.config.ts -t 'syncs active attempt progress|converts a zero-row guarded sync update|guards progress sync'`
    - `Test Files  2 passed | 1 skipped (3)`
    - `Tests  3 passed | 31 skipped (34)`
- [x] Confirm monitoring receives the latest accepted count within debounce plus polling latency.
- [x] Confirm concurrent closure cannot be followed by a successful progress write.
- [x] Mark this phase complete only after tests pass.
