---
title: "Fix Student Lobby Realtime Admission Sync Latency & Client Gating"
type: task
status: planned
created: "2026-08-25"
tags: [task, lobby, realtime, admission, performance, latency, student-experience]
---

# Fix Student Lobby Realtime Admission Sync Latency & Client Gating

## Outcome

Eliminate realtime admission delays and UI locking on the student exam lobby across `sentinel-web` and `sentinel-mobile`. Single-student and bulk instructor admissions unlock the student attempt button in `< 100ms` via dual-transport WebSocket broadcast + Postgres CDC, reinforced with a zero-leak adaptive 3s fallback poll.

---

## Pre-planning Record

### Context & Evidence
- Context Document: [`docs/context/August/25/fix-student-lobby-realtime-admission-and-sync-latency.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/25/fix-student-lobby-realtime-admission-and-sync-latency.md)
- Root causes:
  1. `refetchInterval: false` left student client with zero fallback when WebSocket messages are delayed or dropped.
  2. `use-lobby-state.ts` deadlocked on `runtimeAccess.state === 'lobby_approved'`, blocking the button until a slow asynchronous `refetchExam()` HTTP roundtrip finished while `isAdmissionPendingRefresh` was true.
  3. Supabase Realtime CDC (`postgres_changes`) alone suffers from PostgreSQL WAL latency and heavy RLS multi-table query checks on every client socket.
  4. `use-lobby-realtime.ts` unscoped `setQueryData` overwriting cache across different students.

### Scenario Coverage

| ID | Actor and Situation | Preconditions | Expected Outcome | Failure/Recovery | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SC-01** | Single student admitted by instructor on web | Student waiting in web lobby (`WAITING`), instructor clicks admit | Student UI updates to "Continue to Attempt" / "Resume Exam" in < 100ms without manual refresh | Adaptive 3s poll catches change within 3s if WebSocket drops | Planned |
| **SC-02** | Bulk admission ("Admit All") by instructor | 50 students in lobby, instructor clicks "Admit All" | All 50 students receive broadcast frame; UI unlocks concurrently without database query storm | Fallback adaptive polling recovers any dropped sockets | Planned |
| **SC-03** | Flaky network / reconnection in lobby | Student Wi-Fi hiccups while instructor approves | Adaptive poll retrieves `status: 'APPROVED'` on next 3s check; immediately stops polling once approved | Graceful recovery within 3s max | Planned |
| **SC-04** | Single student rejected by instructor | Student waiting in lobby, instructor clicks reject | Student UI updates to "Waiting for Re-approval" in < 100ms with clear feedback | Resilient state update | Planned |

### Decision Ledger

| ID | Question | Decision | Evidence or Rationale | Alternatives Rejected | Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | How to ensure instant admission delivery without PostgreSQL RLS load? | Send Supabase Realtime Broadcast (`broadcast`) from API + Instructor client on `lobby:admissions:${examId}` alongside Postgres CDC | Broadcast routes in-memory via Phoenix channels in < 50ms with zero DB load | Pure CDC alone (high RLS latency) | `phase-01` |
| **DEC-02** | How to handle socket drops without creating server traffic storms? | Adaptive polling in `useExamLobbyAdmissionStatusQuery`: poll every 3s *only* while `status !== 'APPROVED'`; immediately stop (0 req/sec) once `APPROVED` | Solves the Aug 24 issue of zero fallback while keeping production traffic near-zero | Aggressive constant polling (heavy server load) | `phase-02` |
| **DEC-03** | How to eliminate client button deadlock? | Decouple `canEnterExam` from `runtimeAccess.state === 'lobby_approved'`; unlock immediately if `admissionStatus === 'APPROVED'` and exam is open | Eliminates async `refetchExam()` waiting loop that kept button disabled | Requiring `refetchExam()` before enabling button | `phase-03` |
| **DEC-04** | How to prevent cross-student cache pollution? | Scope `useLobbyRealtime` cache updates by inspecting target student ID | Prevents one student's status update from corrupting another student's cache | Blind global `setQueryData` | `phase-02` |

---

## Acceptance Criteria

| ID | Source Goal / Scenario | Criterion | Implementation | Verification | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AC-01** | SC-01, DEC-03 | Single student admission unlocks button immediately (< 100ms) | Refactor `use-lobby-state.ts` gating logic | Automated tests in `use-lobby-state.test.tsx` + manual verification | Planned |
| **AC-02** | SC-02, DEC-01 | API dispatches Realtime Broadcast on admission changes | Add broadcast call in `updateAdmissions` | Automated tests in `update-admissions.test.ts` | Planned |
| **AC-03** | SC-03, DEC-02 | Adaptive fallback poll runs only while `status !== 'APPROVED'` | Update `useExamLobbyAdmissionStatusQuery` with function `refetchInterval` | Automated tests in `use-exam-lobby-admission-status-query.test.ts` | Planned |
| **AC-04** | SC-01, DEC-04 | `useLobbyRealtime` scopes updates and handles broadcast + CDC | Update `use-lobby-realtime.ts` | Automated tests in `use-lobby-realtime.test.ts` | Planned |

---

## Scope

- **In-Scope:**
  - `sentinel-api`: Supabase Realtime broadcast dispatch in `updateAdmissions` and `checkInLobby`.
  - `@sentinel/hooks`: Adaptive polling in `useExamLobbyAdmissionStatusQuery`, broadcast handling & student scoping in `useLobbyRealtime`.
  - `sentinel-web`: Instant optimistic gating in `use-lobby-state.ts` and `LobbyFooterActions`.
  - `sentinel-mobile`: Sync `use-exam-lobby.ts` with the new realtime and adaptive query patterns.
- **Out-of-Scope / Non-Goals:**
  - Modifying exam attempt answer autosave or proctoring AI pipelines.
  - Altering database schema or table structures (no migrations required).

---

## Phases

- [x] [`phase-01-api-realtime-broadcast-dispatch.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-student-lobby-realtime-admission-and-sync-latency/phase-01-api-realtime-broadcast-dispatch.md) — Phase 1: API Supabase Realtime Broadcast Dispatch
- [x] [`phase-02-hooks-and-adaptive-polling-fallback.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-student-lobby-realtime-admission-and-sync-latency/phase-02-hooks-and-adaptive-polling-fallback.md) — Phase 2: Shared Hooks Hardening & Adaptive Polling Fallback
- [x] [`phase-03-web-and-mobile-student-lobby-instant-unlock.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-student-lobby-realtime-admission-and-sync-latency/phase-03-web-and-mobile-student-lobby-instant-unlock.md) — Phase 3: Web & Mobile Student Lobby Optimistic Instant Gating

---

## Verification

- `pnpm --filter sentinel-api test`
- `pnpm --filter @sentinel/hooks test`
- `pnpm --filter sentinel-web test lobby`
- `pnpm --filter sentinel-mobile test`
