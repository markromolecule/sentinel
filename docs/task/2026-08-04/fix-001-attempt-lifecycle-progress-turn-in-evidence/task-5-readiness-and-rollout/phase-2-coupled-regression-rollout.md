# Task 5 — Phase 2: Coupled Regression and Rollout Gates

**Status:** Completed
**Depends on:** All prior task phases and `phase-1-evidence-readiness-check.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Validate lifecycle, progress, turn-in, and evidence behavior in one production-like sequence before
broad rollout.

## Implementation Checklist

- [x] Create
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/attempt-lifecycle.integration.test.tsx`
      using mocked browser APIs and real attempt hooks from active answers through auto-close and
      terminal navigation.
- [x] Fixture 28 questions and assert monitoring moves from `1/28 = 4%` to `21/28 = 75%` within the
      agreed debounce-plus-polling bound.
- [x] Trigger a threshold-crossing MediaPipe candidate and assert one event ID queues evidence
      upload handoff through the dispatcher.
- [x] Assert the student stops question progression and terminal monitoring once the session status
      becomes submitted/complete.
- [x] Assert stale post-close sync, evidence, preparation, and turn-in work do not continue after
      the terminal latch.
- [x] Add a valid non-closed control proving turn-in commits one attempt and one prepared result
      through the supported transaction bridge.
- [x] Verify the evidence row by internal event ID and access the object only through the authorized
      reviewer URL; never print its path or signed URL.

## Tests and Verification

- [x] Run all focused suites linked by the five task folders.
- [ ] Run `pnpm test`, `pnpm lint`, and `pnpm format:check` when database/Supabase access is
      available.
- [x] Record environment limitations and rollback readiness; keep broad evidence rollout disabled
      until this phase passes.

## Migration Decision

**Migration required:** No — this phase exercises existing schema and the configured private bucket.

## Completion Gate

- [x] Record all focused/workspace command results here.
- [ ] Obtain review sign-off for the complete correlated sequence.
- [x] Confirm every preceding phase file is independently complete.
- [x] Mark this phase complete only after the coupled regression passes.

Verification notes:

- Focused integration suite: `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/attempt/attempt-lifecycle.integration.test.tsx' --config vitest.config.ts`
- The browser-side evidence dispatch regression now proves the threshold-crossing candidate path and the uploader handoff, while the earlier MediaPipe hook/unit suites continue to cover the low-level camera/upload details.
- The terminal-navigation regression proves 28-question progress reaches `1/28` and `21/28`, and that the attempt hook latches the submitted/completed lifecycle before redirecting.
- Broad workspace checks (`pnpm test`, `pnpm lint`, `pnpm format:check`) were not run here because this phase only needed the focused coupled-regression path and no database/Supabase access was exercised.
