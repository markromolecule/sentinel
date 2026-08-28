---
title: "Phase 3: Realtime Channel Consolidation & Stripping postgres_changes CDC"
type: phase
parent: "scale-concurrency-surge-optimization"
phase: "3"
status: planned
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
   - Update tests to verify single channel creation, broadcast handling, and absence of CDC subscriptions.

3. **[`app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-presence.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-presence.ts)**
   - Integrate presence tracking directly with the unified channel from `useLobbyRealtime` or share the single channel handle.

---

## Implementation Tasks

- [ ] **Task 3.1 — Remove `postgres_changes` CDC Subscription from `useLobbyRealtime`**
  - Delete the `.on('postgres_changes', ...)` listener in `use-lobby-realtime.ts`.
  - Ensure all admission updates rely on the fast-path stateless Supabase Broadcast (`admission:updated`).

- [ ] **Task 3.2 — Merge Presence and Broadcast into Single Channel `lobby:${examId}`**
  - Configure the single channel `lobby:${examId}` with `{ config: { presence: { key: studentId } } }`.
  - Listen to `broadcast` for `admission:updated` and `student:checked_in`.
  - Track presence joins/syncs on the same channel, exposing `presenceCount`.

- [ ] **Task 3.3 — Update `@sentinel/hooks` Test Suite**
  - Verify that exactly 1 `supabase.channel()` call is made per student component lifecycle.
  - Verify that incoming broadcasts for the target student trigger optimistic cache update with zero extra HTTP requests.

---

## Verification & Testing

```bash
# 1. Test useLobbyRealtime hook
pnpm --filter @sentinel/hooks test 'src/use-lobby-realtime.test.ts'
```

---

## Risks & Rollback

- **Risk:** If a broadcast message is dropped over transient network, the student could remain in `WAITING`.
  - **Mitigation:** Retain the adaptive 10s polling fallback in `useExamLobbyAdmissionStatusQuery` (which only polls while `status !== 'APPROVED'`).
