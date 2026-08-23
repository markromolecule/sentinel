---
title: "Fix and Optimize Student Lobby Real-Time Admission Updates & Query Responsiveness"
type: task
status: planned
created: "2026-08-23"
tags: [task, student-lobby, realtime, optimization, supabase-realtime, react-query]
---

# Fix and Optimize Student Lobby Real-Time Admission Updates & Query Responsiveness

## Outcome

Fix the student lobby desynchronization issue where students remain stuck on "Waiting for Approval" after instructor admission. Migrate `use-lobby-state` to reactive TanStack Query (`useExamLobbyAdmissionStatusQuery`) with smart adaptive polling (2.5s fallback) and hardened Supabase Realtime cache updates, unlocking the "Continue to Attempt" button and notifying the student within `< 500ms` of instructor approval.

## Pre-planning record

### Actors and goals
- **Student in Lobby:** Waiting to enter an instructor-gated exam; needs immediate, clear unlocking and feedback as soon as instructor admits them.
- **Instructor / Proctor in Exam Lobby:** Admitting individual or bulk students; expects students to be admitted and transition smoothly without manual intervention or page reloads.

### Domain language
- **Instructor-Gated Lobby (`INSTRUCTOR_GATED`):** Examination admission mode requiring explicit instructor authorization (`exam_lobby_admissions.status = 'APPROVED'`) before an attempt session can start.
- **Admission Status (`WAITING` | `APPROVED` | `REJECTED`):** Current gatekeeping state of the student in the exam lobby.
- **Adaptive Polling:** Polling interval that runs at 2.5s while waiting/rejected, and stops (0s) once approved or out of lobby.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Student waiting in lobby gets admitted via Realtime | Student in lobby with `status: WAITING`; Supabase Realtime connected | Instructor admits student; Realtime postgres_changes event mutates cache, unlocks button to "Continue to Attempt", triggers success toast in `< 500ms` | Fallback to 2.5s poll if event lost | Planned |
| SC-02 | Student waiting in lobby under disconnected WebSocket | Student in lobby with `status: WAITING`; WebSocket offline/blocked | Adaptive 2.5s poll fetches `getAdmissionStatus`, detects `APPROVED`, unlocks entry in `< 3s` | Next poll retries automatically | Planned |
| SC-03 | Instructor rejects student admission | Student in lobby with `status: WAITING` | Instructor rejects student; status changes to `REJECTED`, button reflects "Waiting for Re-approval" | Polling continues; instructor can admit later | Planned |
| SC-04 | Returning student resuming active attempt | Student with active in-progress attempt reconnecting | Bypasses admission gating if allowed or unlocks "Resume Exam" button upon approval | Stored session validated on session start | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | What should happen when student is approved? | Unlock button to "Continue to Attempt" + success toast | Non-disruptive, preserves student control and fullscreen triggers | Auto-redirecting without user action | [`Context.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/23/fix-002-student-lobby-realtime-and-query-optimization.md) |
| DEC-02 | How should admission state be managed in `use-lobby-state`? | TanStack Query (`useExamLobbyAdmissionStatusQuery`) with 2.5s adaptive polling | Eliminates local `useState` desync and leverages React Query invalidations | Manual `setInterval(45000)` and local state | [`use-lobby-state.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts) |
| DEC-03 | How should Supabase Realtime handle row updates? | Optimistically mutate `EXAM_QUERY_KEYS.lobbyAdmissionStatus` and invalidate `details` | Guarantees instant sub-second UI transition | Only invalidating queries without cache pre-population | [`use-lobby-realtime.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.ts) |

### Unknowns and blockers
- None. All database models, indexes, and API routes are inspected and verified.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01 / DEC-02 | Student lobby dynamically updates status to `APPROVED` and enables "Continue to Attempt" button within 500ms of approval | `useExamLobbyAdmissionStatusQuery` + `useLobbyRealtime` cache update | Vitest hook tests in `sentinel-web` | Planned |
| AC-02 | SC-02 / DEC-02 | Student lobby unlocks within 3s under total WebSocket disconnection | Adaptive 2.5s `refetchInterval` in `useExamLobbyAdmissionStatusQuery` | Polling query unit tests | Planned |
| AC-03 | SC-01 / DEC-01 | Success toast is displayed when student is admitted | Effect in `use-lobby-state` monitoring status transition from `WAITING` to `APPROVED` | Component test verification | Planned |
| AC-04 | SC-03 | Rejection cleanly transitions button to "Waiting for Re-approval" | Handled in `lobby-footer-actions.tsx` & `use-lobby-state.ts` | Vitest footer actions tests | Planned |
| AC-01 | SC-01 / DEC-02 | Student lobby dynamically updates status to `APPROVED` and enables "Continue to Attempt" button within 500ms of approval | `useExamLobbyAdmissionStatusQuery` + `useLobbyRealtime` cache update | Vitest hook tests in `sentinel-web` | Completed |
| AC-02 | SC-02 / DEC-02 | Student lobby unlocks within 3s under total WebSocket disconnection | Adaptive 2.5s `refetchInterval` in `useExamLobbyAdmissionStatusQuery` | Polling query unit tests | Completed |
| AC-03 | SC-01 / DEC-01 | Success toast is displayed when student is admitted | Effect in `use-lobby-state` monitoring status transition from `WAITING` to `APPROVED` | Component test verification | Completed |
| AC-04 | SC-03 | Rejection cleanly transitions button to "Waiting for Re-approval" | Handled in `lobby-footer-actions.tsx` & `use-lobby-state.ts` | Vitest footer actions tests | Completed |

## Scope

- Hardening `@sentinel/hooks` query hooks and Supabase Realtime integration.
- Refactoring `use-lobby-state.ts` in `sentinel-web` to use reactive queries and adaptive polling.
- Adding feedback toast upon admission.

## Non-goals

- Altering exam scoring or question delivery pipelines.
- Modifying LiveKit video streaming services.

## Phases

- [x] `phase-01-query-layer-and-realtime-hook-hardening.md` — Phase 1: Query Layer & Realtime Hook Hardening
- [x] `phase-02-student-lobby-state-and-reactive-gating.md` — Phase 2: Student Lobby State & Reactive Gating Migration
- [x] `phase-03-api-query-optimization-and-test-verification.md` — Phase 3: API Query Optimization & End-to-End Verification

## Verification

- `@sentinel/hooks`: `use-exam-lobby-admission-status-query.test.ts`, `use-lobby-realtime.test.ts` (**PASSED**)
- `sentinel-web`: `src/app/(protected)/student/exam/[id]/lobby` (**PASSED: 7/7 test files, 38/38 tests**)
- `sentinel-api`: `src/modules/examination/lobby` (**PASSED: 5/5 test files, 22/22 tests**)
- Build: `pnpm --filter @sentinel/hooks build` (**PASSED**)
