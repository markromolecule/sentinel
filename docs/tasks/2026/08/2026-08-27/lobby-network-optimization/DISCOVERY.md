# Discovery: Lobby Network Optimization + Submitted Status

**Date:** 2026-08-27  
**Status:** ✅ Resolved — Ready for `plan`  
**Scope:** `packages/hooks`, `packages/services`, `app/sentinel-api`, `app/sentinel-web` (student + instructor lobby)

---

## Problem Statements

### P1 — Realtime Broadcast Amplification Storm

When students open the student lobby page (`/student/exam/:id/lobby`), network becomes congested due to quadratic request amplification:

1. Every student subscribes to channel `lobby:admissions:${examId}`.
2. When **any** student checks in or is admitted, the Supabase broadcast fires to **all** connected students.
3. `use-lobby-state.ts` calls `useLobbyRealtime` without a `studentId` prop, so `onAdmissionChange` (fires `refetchAdmissionStatus()` + `refetchExam()`) runs for **every student** regardless of who the event was for.
4. **Math:** 40 students × each check-in → 40 × 2 = 80 HTTP requests per single check-in. 40 sequential check-ins → up to 3,200 HTTP requests in seconds.
5. `student:checked_in` broadcast carries no `studentId`, causing all students to unconditionally invalidate `lobbyWaitingList` and `lobbyCount` — data they don't even use.

### P2 — 3-Second Continuous Polling Baseline

`useExamLobbyAdmissionStatusQuery` polls every 3s per student while `status !== 'APPROVED'`. With 40 students → ~13 requests/second constant baseline load on top of broadcast-triggered refetches.

### P3 — Missing Submitted Status on Instructor Lobby

After a student submits, they appear in `approvedStudents` (APPROVED + no active attempt), identical to students approved but haven't entered yet. No visible signal to instructor. `REJECTED` column is rarely actionable during an active exam.

---

## Resolved Decisions

| # | Decision | Resolution | Rationale |
| --- | ---------- | ----------- | ----------- |
| D1 | Fix scope | Fix realtime filter AND raise polling to 10s | Realtime is primary; polling is safety net |
| D2 | Student ID source | `session.user.id` from `useAuth()` | Already used in `use-lobby-presence.ts`; matches broadcast payload |
| D3 | `student:checked_in` filtering | Add `studentId` to backend payload; client skips if not their event | Eliminates cross-student query invalidation |
| D4 | Polling interval | Raise 3s → 10s | Reduces baseline ~13 req/s → ~4 req/s with 40 students |
| D5 | Submitted column | Replace `rejectedStudents` with `submittedStudents`; REJECTED stays in filter dropdown | Most actionable end-state during active exam |
| D6 | Submitted status values | Only `SUBMITTED` (student clicked Turn In) | `COMPLETED` is auto-submit context |

---

## Non-Goals

- MediaPipe WASM/Service Worker caching (separate task)
- Monitoring page changes
- Auto-admit feature

---

## Scope of Changes

### `packages/hooks`

- `use-exam-lobby-admission-status-query.ts` — `refetchInterval` 3000 → 10000

### `app/sentinel-api`

- `lobby/services/check-in-lobby.ts` (or `lobby.service.ts`) — add `studentId` to `student:checked_in` broadcast payload

### `app/sentinel-web` (student)

- `lobby/_hooks/use-lobby-state.ts` — import `useAuth`, pass `session.user.id` as `studentId` to `useLobbyRealtime`

### `app/sentinel-web` (instructor)

- `lobby/_lib/lobby-admission-filters.ts` — replace `rejectedStudents` with `submittedStudents` (`attemptStatus === 'SUBMITTED'`); update type; add `'submitted'` to filter, keep `'rejected'` as filter-only
- `lobby/_lib/lobby-admission-filters.test.ts` — update tests
- Instructor lobby UI components — swap `rejectedStudents` → `submittedStudents`

### `app/sentinel-core`

- Same `lobby-admission-filters.ts` update

---

## Scenario Coverage

| Scenario | Expected After Fix |
| ---------- | ------------------- |
| 40 students open lobby simultaneously | Each fires 1 check-in; only their own callbacks fire |
| Instructor admits Student A | Only Student A refetches |
| Student B checks in while Student A waits | Student A's client does NOT refetch |
| Student submits exam | Appears in Submitted column on instructor lobby |
| Instructor needs to see rejected | Available via status filter dropdown |
| WebSocket drops | 10s polling catches admission status |
| 40 students at steady state | ~4 req/s vs current ~13 req/s |

---

## Status: READY FOR PLAN
