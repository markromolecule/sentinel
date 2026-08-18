---
title: "Phase 3: Stable Lobby Presence Count and Channel Lifecycle"
type: phase
parent: "fix-002-student-lobby-realtime-and-avatars"
phase: "3"
status: complete
created: "2026-08-19"
tags: [task, phase, presence, realtime, frontend, ui]
---

# Phase 3: Stable Lobby Presence Count and Channel Lifecycle

## Objective

Stabilize student lobby presence tracking so that active student counters do not flicker between 1, 0, and 1, and ensure WebSocket channel cleanup does not drop connections unnecessarily during normal component re-renders.

## Dependencies & Prerequisites

- Phase 2.

## Impacted Files & Components

- [use-lobby-presence.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/lobby/_hooks/use-lobby-presence.ts) (`useLobbyPresence`)
- [page.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/lobby/page.tsx) (`StudentExamLobbyPage`)
- Tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby`.

## Implementation Tasks

- [x] Task 3.1 — Refactor `use-lobby-presence.ts`:
  - Prevent tearing down the presence channel on spurious effect reruns by tracking active channel subscription state.
  - Guard state dispatch against unmounted components.
- [x] Task 3.2 — Update `StudentExamLobbyPage` (`page.tsx`):
  - Stabilize `displayCount` calculation:
    ```ts
    const numericDbCount = typeof lobbyCount?.count === 'number' ? lobbyCount.count : 0;
    const effectiveCount = Math.max(numericDbCount, presenceCount);
    const displayCount = effectiveCount > 0 ? effectiveCount : isResolving || isLobbyCountLoading ? 'Syncing' : 0;
    ```
  - Eliminate the flash-of-zero on initial join before presence/DB queries reconcile.
- [x] Task 3.3 — Update and execute automated tests for `use-lobby-presence` and `StudentExamLobbyPage`.

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/student/exam/[id]/lobby` (7 files, 41 tests passed).
- `pnpm --filter sentinel-web test lobby` (12 files, 69 tests passed).
- Verified student count uses `Math.max(numericDbCount, presenceCount)` with `'Syncing'` loading state fallback, eliminating flash-of-zero.

## Risks & Rollback

- *Risk:* Overcounting if zombie presence keys linger in Supabase Presence.
- *Mitigation:* `presence: { key: userId }` enforces deduplication by unique authenticated user ID.

