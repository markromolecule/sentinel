---
title: "Phase 3: Align Mobile Lobby Realtime Sync with Web"
type: phase
parent: "docs/tasks/2026/08/2026-08-25/fix-mobile-session-crash-and-lobby-realtime/README.md"
phase: "3"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, realtime, lobby]
---

# Phase 3: Align Mobile Lobby Realtime Sync with Web

## Objective

Replace isolated `useState` and custom channel subscriptions in `sentinel-mobile` with `@sentinel/hooks` (`useExamLobbyAdmissionStatusQuery` and `useLobbyRealtime`), enabling 0ms optimistic cache mutation on WebSocket events and an adaptive 2.5s fallback polling mechanism.

## Dependencies & Prerequisites

- Phase 1 & 2 completed.

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts):
  - Use `useExamLobbyAdmissionStatusQuery(id)` for source of truth.
  - Connect `useLobbyRealtime({ examId: id, onAdmissionChange: ... })`.
  - On admission change, trigger immediate refetches of runtime access.
  - Implement 2.5s adaptive polling fallback while in `WAITING` state, stopping polling once `APPROVED`.
- [`app/sentinel-mobile/features/exam/hooks/use-exam-lobby.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.test.ts): Update unit tests to mock and assert TanStack Query & Realtime hook integration.

## Implementation Tasks

- [x] Task 3.1 — Integrate `useExamLobbyAdmissionStatusQuery` and `useLobbyRealtime` in `use-exam-lobby.ts`.
- [x] Task 3.2 — Remove redundant manual Postgres change listeners and waterfall HTTP calls from `use-exam-lobby.ts`.
- [x] Task 3.3 — Implement 2.5s adaptive polling fallback when waiting for admission approval.
- [x] Task 3.4 — Update and execute `use-exam-lobby.test.ts` to verify admission unlock behavior.

## Verification & Testing

- `pnpm --filter sentinel-mobile test features/exam/hooks/use-exam-lobby.test.ts` (PASS: 4/4 tests passed)
- `pnpm --filter sentinel-mobile test features/exam/` (PASS: 19 test files, 98/98 tests passed)
- `pnpm --filter @sentinel/hooks test` (PASS: 63 test files, 184/184 tests passed)

## Risks & Rollback

- **Risk:** Stale query cache if key changes.
- **Mitigation:** Rely on standardized `EXAM_QUERY_KEYS` from `@sentinel/shared/constants`.
