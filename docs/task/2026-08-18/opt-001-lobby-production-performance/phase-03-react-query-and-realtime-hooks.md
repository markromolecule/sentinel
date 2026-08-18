---
title: "Phase 3: TanStack Query Hooks, Optimistic Mutations, and Realtime Invalidation"
type: phase
parent: "opt-001-lobby-production-performance"
phase: "3"
status: completed
created: "2026-08-18"
tags: [task, phase, hooks, react-query, realtime]
---

# Phase 3: TanStack Query Hooks, Optimistic Mutations, and Realtime Invalidation

## Objective

Standardize all lobby state management around TanStack Query hooks in `@sentinel/hooks` with optimistic mutation rollbacks and Supabase Realtime cache invalidation listeners.

## Dependencies & Prerequisites

- Phase 1 & Phase 2.

## Impacted Files & Components

- [exam-constants.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/shared/src/constants/exams/exam-constants.ts) (`EXAM_QUERY_KEYS`)
- New Hook: `packages/hooks/src/query/exams/use-exam-lobby-waiting-list-query.ts`
- New Hook: `packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts`
- New Hook: `packages/hooks/src/query/exams/use-update-exam-lobby-admissions-mutation.ts`
- New Hook: `packages/hooks/src/use-lobby-realtime.ts`
- Index exports in `packages/hooks/src/index.ts` and `packages/hooks/src/query/exams/index.ts`

## Implementation Tasks

- [x] Task 3.1 — Update `EXAM_QUERY_KEYS` in `@sentinel/shared` to include:
  - `lobbyWaitingList: (id: string) => ['exams', id, 'lobby', 'waiting-list'] as const`
  - `lobbyAdmissionStatus: (id: string) => ['exams', id, 'lobby', 'admission-status'] as const`
- [x] Task 3.2 — Implement `useExamLobbyWaitingListQuery` in `@sentinel/hooks` with appropriate stale times and refetch controls.
- [x] Task 3.3 — Implement `useUpdateExamLobbyAdmissionsMutation` in `@sentinel/hooks` supporting:
  - Optimistic relocation of student entries in cache.
  - Automatic rollback on mutation error.
  - Invalidating `lobbyWaitingList` and `lobbyCount` query keys.
- [x] Task 3.4 — Implement `useLobbyRealtime` in `@sentinel/hooks` to subscribe to `postgres_changes` on `exam_lobby_admissions` for `exam_id = ${examId}` and invalidate relevant query keys on row changes.
- [x] Task 3.5 — Add comprehensive unit tests for the new query hooks and realtime listeners.

## Verification & Testing

- `pnpm --filter @sentinel/shared build`: Built successfully.
- `pnpm --filter @sentinel/hooks build`: Typecheck and build passed cleanly.
- `use-exam-lobby-waiting-list-query.test.ts` & `use-update-exam-lobby-admissions-mutation.test.ts`: Passed cleanly.

## Risks & Rollback

- *Risk:* Multiple rapid mutations overwriting optimistic rollback snapshots.
- *Mitigation:* Use functional updater on QueryClient cache or cancel outgoing refetches before mutating.
