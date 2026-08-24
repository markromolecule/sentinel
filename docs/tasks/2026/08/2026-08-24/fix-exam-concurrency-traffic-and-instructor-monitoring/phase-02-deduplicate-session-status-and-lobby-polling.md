---
title: "Phase 2: De-duplicate Active Session Status & Student Lobby Polling Leaks"
type: phase
parent: "fix-exam-concurrency-traffic-and-instructor-monitoring"
phase: "02"
status: completed
created: "2026-08-24"
tags: [task, phase, session-status, lobby, traffic-optimization]
---

# Phase 2: De-duplicate Active Session Status & Student Lobby Polling Leaks

## Objective

Remove redundant polling in `useExamSessionStatusQuery` (2,000ms background poll) and student lobby admission status/count queries (2.5s/5s polls). This cuts **~88 HTTP req/sec** (~5,280 req/min) during exam taking and lobby waiting phases, relying instead on existing Realtime postgres changes and 409 terminal lifecycle responses.

---

## Dependencies & Prerequisites

- Phase 1 completed (student live inspection polling eliminated).
- `useLobbyRealtime` already subscribed to Supabase postgres_changes for lobby admissions.

---

## Impacted Files & Components

- [`packages/hooks/src/query/exams/use-exam-session-status-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-session-status-query.ts) — Remove `refetchInterval: EXAM_SESSION_STATUS_REFETCH_INTERVAL_MS` (set `refetchInterval: false`), and set `refetchIntervalInBackground: false`.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.ts) — Ensure lifecycle termination relies on initial session status, `syncProgress` terminal 409 responses, and explicit turn-in completion.
- [`packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts) — Remove `refetchInterval: 2500`, set `staleTime: 30000`, and let `useLobbyRealtime` handle cache invalidation.
- [`packages/hooks/src/query/exams/use-exam-lobby-count-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-count-query.ts) — Remove `refetchInterval: 5000` and `refetchIntervalInBackground: true`, set `staleTime: 30000`.
- [`packages/hooks/src/query/exams/use-exam-session-status-query.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-session-status-query.test.ts) — Update unit tests.
- [`packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.test.ts) — Update unit tests.
- [`packages/hooks/src/query/exams/use-exam-lobby-count-query.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-count-query.test.ts) — Add unit tests.

---

## Implementation Tasks

- [x] **Task 2.1: Remove 2,000ms Interval from `useExamSessionStatusQuery`**
  - Set `refetchInterval: false` and `refetchIntervalInBackground: false`.
  - Deprecate `EXAM_SESSION_STATUS_REFETCH_INTERVAL_MS` or set to `false`.
  - Verify that `useAttemptSync` 409 handler continues to lock the attempt coordinator and trigger `onLifecycleBlocked`.
- [x] **Task 2.2: De-duplicate Lobby Admission Status & Count Polling**
  - In `useExamLobbyAdmissionStatusQuery`, set `refetchInterval: false` and `staleTime: 30_000`.
  - In `useExamLobbyCountQuery`, set `refetchInterval: false`, `refetchIntervalInBackground: false`, and `staleTime: 30_000`.
  - Confirm `useLobbyRealtime` executes `invalidateQueries` on `EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId)` and `lobbyCount(examId)` when admission events occur.
- [x] **Task 2.3: Execute Hooks and Attempt Lifecycle Test Suites**
  - Run `pnpm --filter @sentinel/hooks test use-exam-session-status-query`.
  - Run `pnpm --filter @sentinel/hooks test use-exam-lobby-admission-status-query`.
  - Run `pnpm --filter sentinel-web test attempt-lifecycle.integration.test.tsx`.

---

## Verification & Testing

- `pnpm --filter @sentinel/hooks test use-exam-session-status-query.test.ts` (PASS: 3/3 passed)
- `pnpm --filter @sentinel/hooks test use-exam-lobby-admission-status-query.test.ts` (PASS: 1/1 passed)
- `pnpm --filter @sentinel/hooks test use-exam-lobby-count-query.test.ts` (PASS: 1/1 passed)
- `pnpm --filter sentinel-web test use-active-attempt-lifecycle use-attempt-sync attempt-lifecycle` (PASS: 5 files, 34 tests passed)
- `pnpm --filter sentinel-web test lobby` (PASS: 12 files, 67 tests passed)
- `pnpm --filter @sentinel/hooks build` (PASS: zero compilation errors)

---

## Risks & Rollback

- **Risk:** If a student's attempt is locked remotely by an instructor while the student is idle (not typing or answering questions), the student won't observe the lock until their next 30s heartbeat or answer sync.
- **Mitigation:** The 30s heartbeat (`useAttemptSync`) guarantees terminal status is surfaced within 30s max, and any click/answer immediately surfaces 409 conflict and locks the UI.
