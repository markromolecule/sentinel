---
title: "Phase 3: Realtime Channel Consolidation & Stripping postgres_changes CDC"
type: phase
parent: "scale-concurrency-surge-optimization"
phase: "3"
status: completed
created: "2026-08-28"
tags: [task, phase, realtime, supabase, websockets, performance]
---

# Phase 3: Realtime Channel Consolidation & Stripping `postgres_changes` CDC

## Objective

Consolidate student presence tracking and admission broadcasts into a single WebSocket channel (`lobby:${examId}`), and remove PostgreSQL CDC (`postgres_changes`) listeners to stay strictly within the Supabase Free Tier cap of 200 concurrent WebSockets and eliminate 40,000 CDC message explosions.

---

## Dependencies & Prerequisites

- Phase 2 completed (Stateless REST broadcasts verified).

---

## Impacted Files & Components

1. **[`packages/hooks/src/use-lobby-realtime.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.ts)**
   - Consolidate channel subscription to `lobby:${examId}`.
   - Support both Broadcast events (`admission:updated`, `student:checked_in`) and Presence tracking on the same single channel.
   - Remove `.on('postgres_changes', ...)` block entirely.
   - Handle admission updates optimistically via payload without triggering extra HTTP invalidation loops for non-target students.

2. **[`packages/hooks/src/use-lobby-realtime.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.test.ts)**
   - Update tests to verify single channel creation, broadcast handling, presence tracking, and absence of CDC subscriptions.

3. **[`app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-presence.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-presence.ts)**
   - Unified channel topic to `lobby:${examId}`.

4. **[`app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts)**
   - Consolidated presence tracking and broadcast listening into single channel via `useLobbyRealtime`.

5. **[`app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts)**
   - Dispatches broadcast events to unified topic `lobby:${examId}`.

---

## Implementation Tasks

- [x] **Task 3.1 — Remove `postgres_changes` CDC Subscription from `useLobbyRealtime`**
  - Delete the `.on('postgres_changes', ...)` listener in `use-lobby-realtime.ts`.
  - Ensure all admission updates rely on the fast-path stateless Supabase Broadcast (`admission:updated`).

- [x] **Task 3.2 — Merge Presence and Broadcast into Single Channel `lobby:${examId}`**
  - Configure the single channel `lobby:${examId}` with `{ config: { presence: { key: studentId } } }`.
  - Listen to `broadcast` for `admission:updated` and `student:checked_in`.
  - Track presence joins/syncs on the same channel, exposing `presenceCount`.

- [x] **Task 3.3 — Update `@sentinel/hooks` Test Suite**
  - Verify that exactly 1 `supabase.channel()` call is made per student component lifecycle.
  - Verify that incoming broadcasts for the target student trigger optimistic cache update with zero extra HTTP requests.

---

## Verification & Testing

```bash
# 1. Test useLobbyRealtime hook
pnpm --filter @sentinel/hooks exec vitest run src/use-lobby-realtime.test.ts
# Output: PASS (6/6 tests)

# 2. Test backend broadcast service
pnpm --filter sentinel-api exec vitest run src/modules/examination/lobby/services/broadcast-lobby-event.test.ts
# Output: PASS (4/4 tests)

# 3. Test sentinel-web presence & lobby page
pnpm --filter sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-presence.test.tsx' 'src/app/(protected)/student/exam/[id]/lobby/page.test.tsx'
# Output: PASS (16/16 tests)

# 4. Test sentinel-mobile lobby
pnpm --filter sentinel-mobile exec vitest run features/exam/hooks/use-exam-lobby.test.ts
# Output: PASS (4/4 tests)
```

---

## Risks & Rollback

- **Risk:** If a broadcast message is dropped over transient network, the student could remain in `WAITING`.
  - **Mitigation:** Retain the adaptive 10s polling fallback in `useExamLobbyAdmissionStatusQuery` (which only polls while `status !== 'APPROVED'`).

