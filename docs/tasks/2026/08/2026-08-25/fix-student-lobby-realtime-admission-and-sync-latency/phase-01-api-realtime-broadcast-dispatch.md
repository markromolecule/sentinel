---
title: "Phase 1: API Supabase Realtime Broadcast Dispatch"
type: phase
parent: "fix-student-lobby-realtime-admission-and-sync-latency"
phase: "01"
status: completed
created: "2026-08-25"
tags: [task, phase, api, realtime, broadcast, lobby]
---

# Phase 1: API Supabase Realtime Broadcast Dispatch

## Objective

Equip `sentinel-api` with direct Supabase Realtime Broadcast capabilities during lobby admission updates. When an instructor admits or rejects single or multiple students, the API dispatches an instant in-memory broadcast payload on `lobby:admissions:${examId}` alongside database updates, ensuring sub-50ms message propagation with zero database RLS latency.

---

## Dependencies & Prerequisites

- `supabaseAdmin` client available in `sentinel-api` ([`app/sentinel-api/src/lib/supabase-admin.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/supabase-admin.ts)).

---

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts) — Created safe fire-and-forget broadcast helper using `supabaseAdmin.channel()`.
- [`app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.test.ts) — Unit tests for broadcast event dispatching and graceful fallback.
- [`app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts) — Dispatches Realtime Broadcast event `admission:updated` with `{ examId, studentIds, status, decidedAt }`.
- [`app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts) — Dispatches Realtime Broadcast event `student:checked_in` with `{ examId, studentId, status, checkedInAt }` across all check-in return paths.

---

## Implementation Tasks

- [x] **Task 1.1: Add Realtime Broadcast Dispatch Helper in `sentinel-api`**
  - Created `broadcastLobbyEvent(examId, eventName, payload)` using `supabaseAdmin.channel(\`lobby:admissions:\${examId}\`).send({ type: 'broadcast', event: eventName, payload })` with a 3s timeout safety guard.
- [x] **Task 1.2: Integrate Broadcast in `updateAdmissions`**
  - Dispatches `admission:updated` with `studentIds` and `status` immediately after executing the SQL update.
- [x] **Task 1.3: Integrate Broadcast in `checkInLobby`**
  - Dispatches `student:checked_in` (and `admission:updated` for auto-admit) to update instructor waiting queues instantly.
- [x] **Task 1.4: Run & Verify API Test Suite**
  - `pnpm --filter sentinel-api test src/modules/examination/lobby` (PASS: 6 files, 25/25 tests passed).

---

## Verification & Testing

- `pnpm --filter sentinel-api test src/modules/examination/lobby` (PASS: 6 test files, 25 tests passed)
- Verified graceful fallback when Supabase admin client is absent or in test environments.

---

## Risks & Rollback

- **Risk:** Supabase Realtime broadcast rate limits or connectivity interruption.
- **Mitigation:** Broadcast calls are non-blocking fire-and-forget; standard PostgreSQL database updates and CDC continue as normal.
