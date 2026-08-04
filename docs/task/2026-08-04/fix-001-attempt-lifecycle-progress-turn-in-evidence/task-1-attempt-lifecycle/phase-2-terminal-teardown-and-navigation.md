# Task 1 — Phase 2: Terminal Teardown and Navigation

**Status:** Complete  
**Depends on:** `phase-1-owned-session-status-contract.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Convert one authoritative terminal response into idempotent monitoring suspension, device teardown,
storage cleanup, and route replacement.

## Implementation Checklist

- [x] Create `useActiveAttemptLifecycle()` with JSDoc in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.ts`;
      consume `useExamSessionStatusQuery()`, latch the first terminal state, and ignore later stale
      `IN_PROGRESS` responses.
- [x] Map `LOCKED`, `CLOSED`, and `SUPERSEDED` to existing blocked-state copy and map
      `SUBMITTED`/`COMPLETED` to `buildStudentHistoryAttemptHref(attemptId)`.
- [x] Add an idempotent terminal cleanup helper with JSDoc at
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/terminate-student-attempt.ts`
      that clears the stored session, answer draft, turn-in preview, lobby entry, and reconnect intent.
- [x] Extend `useAttemptMonitoring()` in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts`
      with explicit terminal/suspension input for browser security, MediaPipe, audio, and redirects.
- [x] Call `stopAudioStream()` from
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.tsx`
      and `stopStream()` from
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider.tsx`
      exactly once during terminal cleanup.
- [x] Require a non-terminal attempt in `useMediapipeRuntimeEligibility()` at
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-mediapipe-runtime-eligibility.ts`.
- [x] Integrate the lifecycle latch into
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`;
      stop timer/sync, live inspection, and interruption intent writes after terminal state.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx` so terminal
      state mounts neither `StudentLiveInspectionBridge` nor interactive `AttemptView`.

## Tests and Verification

- [x] Create
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.test.tsx`
      covering idle closure, stale-response suppression, idempotent cleanup, copy, and navigation.
- [x] Extend monitoring/provider tests at
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.test.tsx`,
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.test.tsx`,
      and
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider.test.tsx`
      to prove tracks and pending monitoring work stop exactly once.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` to prove a
      terminal attempt renders no question controls, live inspection, or active monitoring.
- [x] Run the focused `sentinel-web` suites and typecheck.

## Migration Decision

**Migration required:** No — this phase changes client orchestration only.

## Completion Gate

- [x] Record focused command results here during implementation.
      - `pnpm --dir app/sentinel-web exec vitest run ...use-active-attempt-lifecycle.test.tsx` — passed (1 file, 4 tests).
      - `pnpm --dir app/sentinel-web exec vitest run ...use-attempt-monitoring.test.tsx` — passed (1 file, 6 tests).
      - `pnpm --dir app/sentinel-web exec vitest run ...student-exam-audio-provider.test.tsx ...student-exam-mediapipe-provider.test.tsx` — passed (2 files, 7 tests).
      - `pnpm --dir app/sentinel-web exec vitest run ...attempt/page.test.tsx` — passed (1 file, 19 tests).
- [x] Confirm observation-to-teardown is no more than one status interval plus request latency.
- [x] Confirm cleanup and route replacement occur at most once.
- [x] Mark this phase complete only after tests pass.
