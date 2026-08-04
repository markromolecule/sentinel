# Task 5 — Phase 2: Coupled Regression and Rollout Gates

**Status:** Not started  
**Depends on:** All prior task phases and `phase-1-evidence-readiness-check.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Validate lifecycle, progress, turn-in, and evidence behavior in one production-like sequence before
broad rollout.

## Implementation Checklist

- [ ] Create
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/attempt-lifecycle.integration.test.tsx`
      using mocked browser APIs and real attempt hooks from active answers through auto-close and
      terminal navigation.
- [ ] Fixture 28 questions and assert monitoring moves from `1/28 = 4%` to `21/28 = 75%` within the
      agreed debounce-plus-polling bound.
- [ ] Trigger a threshold-crossing MediaPipe candidate and assert one event ID progresses evidence
      `PENDING_UPLOAD -> AVAILABLE` while the attempt progresses `IN_PROGRESS -> CLOSED`.
- [ ] Assert the student stops questions, timers, telemetry, tracks, and live inspection within one
      lifecycle interval.
- [ ] Assert stale post-close sync, evidence, preparation, and turn-in calls receive lifecycle
      conflicts and do not mutate the attempt.
- [ ] Add a valid non-closed control proving turn-in commits one attempt and one `SUBMITTED` event
      through the supported transaction bridge.
- [ ] Verify the evidence row by internal event ID and access the object only through the authorized
      reviewer URL; never print its path or signed URL.

## Tests and Verification

- [ ] Run all focused suites linked by the five task folders.
- [ ] Run `pnpm test`, `pnpm lint`, and `pnpm format:check` when database/Supabase access is
      available.
- [ ] Record environment limitations and rollback readiness; keep broad evidence rollout disabled
      until this phase passes.

## Migration Decision

**Migration required:** No — this phase exercises existing schema and the configured private bucket.

## Completion Gate

- [ ] Record all focused/workspace command results here.
- [ ] Obtain review sign-off for the complete correlated sequence.
- [ ] Confirm every preceding phase file is independently complete.
- [ ] Mark this phase complete only after the coupled regression passes.
