---
title: "Phase 2: Shared Hooks Hardening & Adaptive Polling Fallback"
type: phase
parent: "fix-student-lobby-realtime-admission-and-sync-latency"
phase: "02"
status: completed
created: "2026-08-25"
tags: [task, phase, hooks, realtime, query, fallback]
---

# Phase 2: Shared Hooks Hardening & Adaptive Polling Fallback

## Objective

Enhance `@sentinel/hooks` by:
1. Enabling **smart adaptive fallback polling** in `useExamLobbyAdmissionStatusQuery` (polls every 3s *only* while `status !== 'APPROVED'`, instantly stopping once `APPROVED`).
2. Upgrading `useLobbyRealtime` to listen to both WebSocket `broadcast` events and `postgres_changes` events.
3. Scoping `useLobbyRealtime` cache mutations so only events intended for the current student mutate `lobbyAdmissionStatus(examId)`.

---

## Dependencies & Prerequisites

- Phase 1 completed (API broadcasting on `lobby:admissions:${examId}`).

---

## Impacted Files & Components

- [`packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts) — Implemented dynamic `refetchInterval` function (3s while waiting/rejected, 0s/false when approved).
- [`packages/hooks/src/use-lobby-realtime.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.ts) — Added `broadcast` listener for `admission:updated` and `student:checked_in`, added student ID scoping for cache updates.
- [`packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.test.ts) — Unit tests for adaptive polling behavior.
- [`packages/hooks/src/use-lobby-realtime.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.test.ts) — Unit tests for broadcast and CDC event handling.

---

## Implementation Tasks

- [x] **Task 2.1: Add Adaptive Polling to `useExamLobbyAdmissionStatusQuery`**
  - Configured `refetchInterval: (query) => query.state.data?.status === 'APPROVED' ? false : 3000`.
  - Set `staleTime: 0` during lobby waiting so query responses are always reactive.
- [x] **Task 2.2: Upgrade `useLobbyRealtime` with Broadcast & Scoped Invalidation**
  - Accepted optional `studentId` in `UseLobbyRealtimeArgs`.
  - Subscribed to `channel.on('broadcast', { event: 'admission:updated' })` and `channel.on('broadcast', { event: 'student:checked_in' })`.
  - Scoped cache mutation by checking `payload.studentIds.includes(studentId)` or `payload.studentId === studentId`.
  - Invalidated related query keys (`lobbyWaitingList`, `lobbyCount`, `lobbyAdmissionStatus`, `details`).
- [x] **Task 2.3: Run & Verify Hooks Test Suite**
  - `pnpm --filter @sentinel/hooks test` (PASS: 63 test files, 188/188 tests passed).
  - `pnpm --filter @sentinel/hooks build` (PASS: zero compilation errors).

---

## Verification & Testing

- `pnpm --filter @sentinel/hooks test use-exam-lobby-admission-status-query.test.ts` (PASS: 3 tests passed)
- `pnpm --filter @sentinel/hooks test use-lobby-realtime.test.ts` (PASS: 4 tests passed)
- `pnpm --filter @sentinel/hooks build` (PASS: zero errors)

---

## Risks & Rollback

- **Risk:** Additional network load if polling fails to terminate.
- **Mitigation:** Query state function explicitly evaluates `query.state.data?.status === 'APPROVED'` to disable polling immediately, verified by automated unit tests.
