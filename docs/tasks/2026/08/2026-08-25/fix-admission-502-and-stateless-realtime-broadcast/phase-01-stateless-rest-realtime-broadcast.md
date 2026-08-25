---
title: "Phase 1: Stateless REST Realtime Broadcast Migration & Fault-Isolation"
type: phase
parent: "docs/tasks/2026/08/2026-08-25/fix-admission-502-and-stateless-realtime-broadcast/README.md"
phase: "01"
status: completed
created: "2026-08-25"
tags: [task, phase, api, broadcast, realtime, rest]
---

# Phase 1: Stateless REST Realtime Broadcast Migration & Fault-Isolation

## Objective

Replace ephemeral Supabase Realtime WebSocket client creation in `broadcastLobbyEvent` with a stateless HTTP POST request to Supabase Realtime's broadcast endpoint (`POST ${SUPABASE_URL}/realtime/v1/api/broadcast`), with strict timeout aborting and complete fault isolation from the database transaction.

## Dependencies & Prerequisites

- Context Specification: [`docs/context/August/25/fix-admission-502-and-stateless-realtime-broadcast.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/25/fix-admission-502-and-stateless-realtime-broadcast.md)

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts) — Refactored to stateless HTTP `fetch` to `${SUPABASE_URL}/realtime/v1/api/broadcast`.
- [`app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.test.ts) — Updated tests to mock `fetch` and verify request payload structure, authorization headers, and timeout handling.
- [`app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts) — Added null-safe dereferencing for `numUpdatedRows`.

## Implementation Tasks

- [x] Task 1.1: Refactor `broadcastLobbyEvent` to use `fetch` with `POST ${SUPABASE_URL}/realtime/v1/api/broadcast` and 2-second timeout signal via `AbortSignal.timeout(2000)`.
- [x] Task 1.2: Add defensive check for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
- [x] Task 1.3: Update `updateAdmissions.ts` to return `Number(result?.numUpdatedRows ?? 0)`.
- [x] Task 1.4: Update and expand unit tests in `broadcast-lobby-event.test.ts`.

## Verification & Testing

```bash
pnpm --filter sentinel-api vitest run src/modules/examination/lobby
# Result: PASS (all lobby module tests passed)
```

## Risks & Rollback

- If Supabase REST broadcast fails due to invalid key or network timeout, it safely catches and logs warning; database records are unaffected and client falls back to PostgreSQL CDC.
