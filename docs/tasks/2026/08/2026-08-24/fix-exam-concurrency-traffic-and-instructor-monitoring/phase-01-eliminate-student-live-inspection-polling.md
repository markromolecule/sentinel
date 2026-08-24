---
title: "Phase 1: Eliminate Student Live Inspection 500ms Polling & Wire Realtime Signaling"
type: phase
parent: "fix-exam-concurrency-traffic-and-instructor-monitoring"
phase: "01"
status: completed
created: "2026-08-24"
tags: [task, phase, live-inspection, realtime, supabase, livekit]
---

# Phase 1: Eliminate Student Live Inspection 500ms Polling & Wire Realtime Signaling

## Objective

Completely remove the 500ms continuous HTTP polling loop (`scheduleReconcile`) in [`packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts), and wire explicit Realtime broadcast dispatching from [`packages/hooks/src/live-inspection/use-live-inspection-viewer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-viewer.ts). This eliminates 160 HTTP req/sec and 320 DB queries/sec during an 80-student exam, reducing idle live-inspection background traffic to **0 req/sec**.

---

## Dependencies & Prerequisites

- Context Specification: [`docs/context/August/24/scale-concurrent-exam-traffic-and-infrastructure.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/24/scale-concurrent-exam-traffic-and-infrastructure.md)
- Supabase Realtime channel `exam-attempt:${attemptId}:live-inspection` already supported in infrastructure.

---

## Impacted Files & Components

- [`packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts) — Remove `LIVE_INSPECTION_RECONCILE_INTERVAL_MS = 500`, `reconcileTimerRef`, and `scheduleReconcile`. Trigger reconcile exclusively on Realtime broadcast `LIVE_INSPECTION_SIGNAL_EVENT`, channel `SUBSCRIBED`, document `visibilitychange`, and window `online`.
- [`packages/hooks/src/live-inspection/use-live-inspection-viewer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-viewer.ts) — Add Supabase Realtime broadcast dispatching (`LIVE_INSPECTION_CHANGED`) when proctor calls `start()` or `stop()`.
- [`packages/hooks/src/live-inspection/use-student-live-inspection-publisher.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-student-live-inspection-publisher.test.tsx) — Update unit tests to verify zero interval polling and immediate response to broadcast events.
- [`packages/hooks/src/live-inspection/use-live-inspection-viewer.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-viewer.test.tsx) — Update unit tests to verify broadcast dispatching.

---

## Implementation Tasks

- [x] **Task 1.1: Remove 500ms Polling Loop in `useStudentLiveInspectionPublisher`**
  - Delete `const LIVE_INSPECTION_RECONCILE_INTERVAL_MS = 500;`.
  - Delete `reconcileTimerRef` and `scheduleReconcile()` callback.
  - Simplify `runReconcileNow()` to run `reconcile()` atomically without re-arming a periodic timer.
  - Ensure cleanup functions cleanly unsubscribe and reset state without clearing non-existent timers.
- [x] **Task 1.2: Add Realtime Broadcast Dispatching in `useLiveInspectionViewer`**
  - Obtain Supabase client in `useLiveInspectionViewer` (via `useAuth()`).
  - In `start()`, after lease acquisition, send broadcast event `LIVE_INSPECTION_CHANGED` on channel `exam-attempt:${attemptId}:live-inspection`.
  - In `stop()`, send broadcast event `LIVE_INSPECTION_CHANGED` on the channel to signal graceful teardown.
- [x] **Task 1.3: Update and Execute Hooks Test Suite**
  - Update `use-student-live-inspection-publisher.test.tsx` fake timer assertions (ensuring no timer-based polling is expected).
  - Run `pnpm --filter @sentinel/hooks test use-student-live-inspection-publisher`.
  - Run `pnpm --filter @sentinel/hooks test use-live-inspection-viewer`.

---

## Verification & Testing

- `pnpm --filter @sentinel/hooks test use-student-live-inspection-publisher.test.tsx` (PASS: 13/13 passed)
- `pnpm --filter @sentinel/hooks test use-live-inspection-viewer.test.tsx` (PASS: 16/16 passed)
- `pnpm --filter @sentinel/hooks test` (PASS: 62 files, 183 tests passed)
- `pnpm --filter @sentinel/hooks build` (PASS: clean compilation, zero type errors)

---

## Risks & Rollback

- **Risk:** If a student's WebSocket connection drops, directive wake-up might be delayed until tab re-focus or network reconnect.
- **Mitigation:** Tab `visibilitychange`, window `online`, and channel `SUBSCRIBED` handlers trigger instant reconciliation whenever the student returns or reconnects.
