---
title: "Phase 1: Query Layer & Realtime Hook Hardening"
type: phase
parent: "fix-002-student-lobby-realtime-and-query-optimization"
phase: "1"
status: completed
created: "2026-08-23"
tags: [task, phase, hooks, realtime, react-query]
---

# Phase 1: Query Layer & Realtime Hook Hardening

## Objective

Harden `@sentinel/hooks` by equipping `useExamLobbyAdmissionStatusQuery` with smart adaptive polling (2.5s interval while waiting/rejected, disabled when approved) and upgrading `useLobbyRealtime` with subscription status handling, optimistic cache mutation on row updates, and comprehensive query invalidation.

## Dependencies & Prerequisites

- Verified `exam_lobby_admissions` schema and Supabase Realtime publication.

## Impacted Files & Components

- `packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts`: Configure adaptive polling `refetchInterval` and refetch policies.
- `packages/hooks/src/use-lobby-realtime.ts`: Hardened channel subscription lifecycle and instant query cache mutation for student admissions.
- `packages/hooks/src/query/exams/use-update-exam-lobby-admissions-mutation.ts`: Optimistic mutation updates for instructor actions.

## Implementation Tasks

- [x] Task 1.1 — Update `useExamLobbyAdmissionStatusQuery`:
  - Add `refetchInterval: (query) => (query.state.data?.status === 'APPROVED' ? false : 2500)`.
  - Ensure `refetchIntervalInBackground: false` and `refetchOnWindowFocus: true`.
- [x] Task 1.2 — Enhance `useLobbyRealtime`:
  - Subscribe to `lobby:admissions:${examId}` channel.
  - Monitor channel status `(status, err)` to log or handle connection errors.
  - On receiving `postgres_changes` event:
    - If payload has `new` row with `status`, optimistically update query cache `queryClient.setQueryData(EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId), { status: payload.new.status, checkedInAt: payload.new.checked_in_at, decidedAt: payload.new.decided_at })`.
    - Invalidate `EXAM_QUERY_KEYS.lobbyWaitingList(examId)`, `EXAM_QUERY_KEYS.lobbyCount(examId)`, and `EXAM_QUERY_KEYS.details(examId)`.
    - Invoke `callbackRef.current(payload)`.
- [x] Task 1.3 — Write/update unit tests for hooks in `@sentinel/hooks`:
  - `use-exam-lobby-admission-status-query.test.ts` (PASSED)
  - `use-lobby-realtime.test.ts` (PASSED)

## Verification & Testing

- `pnpm --filter @sentinel/hooks test use-exam-lobby-admission-status-query.test.ts use-lobby-realtime.test.ts` (PASSED)

## Risks & Rollback

- *Risk:* Over-polling server if polling is not halted when approved.
- *Mitigation:* `refetchInterval` returns `false` as soon as `query.state.data?.status === 'APPROVED'`.

- *Mitigation:* `refetchInterval` returns `false` as soon as `query.state.data?.status === 'APPROVED'`.
