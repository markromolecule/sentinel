---
title: "Fix Mobile Exam Session Crash and Align Mobile Lobby Realtime Sync with Web"
type: task
status: completed
created: "2026-08-25"
tags: [task, fix, mobile, realtime, lobby, mediapipe]
---

# Fix Mobile Exam Session Crash and Align Mobile Lobby Realtime Sync with Web

## Outcome

Eliminated the fatal `Maximum update depth exceeded` crash on the mobile exam session screen, enabled instantaneous checkup readiness on mount, and aligned `sentinel-mobile` with `sentinel-web`'s real-time architecture using `useLobbyRealtime` and `useExamLobbyAdmissionStatusQuery` with optimistic cache updates and adaptive 2.5s fallback polling.

## Pre-planning record

- **Context Specification:** [`docs/context/August/25/fix-exam-session-render-loop-and-lobby-sync-latency.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/25/fix-exam-session-render-loop-and-lobby-sync-latency.md)

### Actors and goals

- **Mobile Student:** Enters exam lobby without delays, completes checkup smoothly, and receives instant admission unlocking when approved by instructor. Takes exam without React infinite loop crashes.
- **Web Instructor:** Sees student check-in immediately in the lobby waiting list, approves the student, and expects student to enter without lag.

### Domain language

- **Lobby Admission Status:** One of `WAITING`, `APPROVED`, `REJECTED`.
- **Lobby Admission Mode:** `INSTRUCTOR_GATED` (requires instructor approval before starting attempt) or `AUTOMATIC` (auto-admitted).
- **MediaPipe Calibration Profile:** Pitch, yaw, and roll baseline values stored in local storage for gaze monitoring.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | Student opens exam session on mobile | Calibrated profile exists | `ExamSessionScreen` renders camera, timer, questions; MediaPipe runs without `Maximum update depth exceeded` | Guarded `setState` prevents render loops | Completed |
| **SC-02** | Student navigates from checkup to lobby | Audio checked, MediaPipe calibrated | `useExamLobby` evaluates readiness on mount; entry button is immediately active or in waiting state without 1s delay | Re-reads storage if missing | Completed |
| **SC-03** | Instructor approves mobile student on web | Student waiting in mobile lobby | Supabase Realtime delivers `postgres_changes` $\rightarrow$ `setQueryData` optimistically mutates query cache $\rightarrow$ button unlocks to "Enter Exam" in < 500ms | 2.5s adaptive polling fallback | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **DEC-01** | How to fix `Maximum update depth exceeded` in session? | Memoize `handleAnomaly` with `useCallback`, store `onAnomalyDetected` in mutable ref in `useMobileMediaPipeMonitoring`, and guard state setters | Eliminates reference churn that re-triggers frame processing effect | Passing raw callback without ref or callback memoization | `phase-01` |
| **DEC-02** | How to achieve instant lobby entrance readiness? | Run async readiness check immediately on mount and synchronously initialize from storage | Prevents waiting for initial 1s `setInterval` tick | Keeping 1-second interval startup | `phase-02` |
| **DEC-03** | How to align mobile lobby realtime with web? | Connect `useExamLobbyAdmissionStatusQuery` and `useLobbyRealtime` in `useExamLobby`, mutating cache directly on WebSocket event and using 2.5s adaptive polling | Matches `sentinel-web`'s working implementation; replaces 30-45s poll | Maintaining custom isolated subscription with async waterfalls | `phase-03` |

### Unknowns and blockers

- None.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | SC-01 / DEC-01 | Mobile exam session starts and monitors MediaPipe without infinite loop crash | Memoized callback + ref isolation + state guard | Vitest hook tests + launch verification | Completed |
| **AC-02** | SC-02 / DEC-02 | Mobile lobby readiness is checked immediately on mount | Synchronous & immediate async mount check | Vitest lobby hook tests | Completed |
| **AC-03** | SC-03 / DEC-03 | Instructor approval unlocks mobile student entry in < 500ms via optimistic Realtime cache update | `useLobbyRealtime` + `useExamLobbyAdmissionStatusQuery` | Vitest query & realtime tests | Completed |

## Scope

- Fixing infinite loop in `ExamSessionScreen` and `useMobileMediaPipeMonitoring`.
- Immediate readiness check in `use-exam-lobby.ts`.
- Replacing custom isolated subscription and 30-45s polling in `use-exam-lobby.ts` with `@sentinel/hooks` query & realtime integration.

## Non-goals

- Database schema or migration changes.
- Modifying backend API routes.
- Modifying `sentinel-web` student lobby (already confirmed working).

## Phases

- [x] `phase-01-fix-session-render-loop.md` — Phase 1: Fix exam session render loop crash in `useMobileMediaPipeMonitoring` and `ExamSessionScreen`.
- [x] `phase-02-instant-lobby-readiness.md` — Phase 2: Immediate checkup readiness initialization in `useExamLobby`.
- [x] `phase-03-mobile-lobby-realtime-alignment.md` — Phase 3: Connect shared query & realtime hooks to `useExamLobby` with optimistic cache updates and 2.5s fallback.

## Verification

- `pnpm --filter sentinel-mobile test features/exam/hooks/use-mobile-mediapipe-monitoring.test.ts` (PASS: 3/3 passed)
- `pnpm --filter sentinel-mobile test features/exam/hooks/use-exam-lobby.test.ts` (PASS: 4/4 passed)
- `pnpm --filter sentinel-mobile test features/exam/` (PASS: 19 test files, 98/98 tests passed)
- `pnpm --filter @sentinel/hooks test` (PASS: 63 test files, 184/184 tests passed)
