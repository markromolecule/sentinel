---
title: "Fix Lobby Admission 502 Bad Gateway and Stateless Realtime Broadcast"
type: task
status: completed
created: "2026-08-25"
tags: [task, fix, lobby, realtime, 502, cors, supabase, broadcast]
---

# Fix Lobby Admission 502 Bad Gateway and Stateless Realtime Broadcast

## Outcome

Eliminated `502 Bad Gateway` and false-positive CORS errors during instructor lobby admissions (`PATCH /exams/:id/lobby/admissions`) by replacing ephemeral WebSocket channel connections in the backend Node.js process with Supabase Realtime's stateless HTTP REST Broadcast API (`POST /realtime/v1/api/broadcast`), making the update count null-safe, and ensuring strict fault isolation.

## Pre-planning record

### Actors and goals

- **Instructor:** Wants clicking "Admit" or "Admit All" to instantly update student statuses and succeed with `200 OK` without network stalls or 502 crashes.
- **Student:** Wants instant (< 50ms) push notifications in `sentinel-web` and `sentinel-mobile` to unlock the "Continue to Attempt" button.
- **Backend Service (`sentinel-api`):** Must stay stateless and stable without unhandled WebSocket teardowns or process crashes.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | Instructor approves single student | Student is in `WAITING` status in lobby | Status updates to `APPROVED` in DB, stateless broadcast dispatched to Realtime, returns 200 OK | If Realtime API fails/times out, DB record still succeeds and client falls back to Postgres CDC | Verified |
| **SC-02** | Instructor admits all students | Multiple students waiting in lobby | All matching rows updated in DB, batch broadcast dispatched, returns 200 OK with `updatedCount` | Broadcast timeout aborts quietly after 2s without blocking response | Verified |
| **SC-03** | Instructor rejects student | Student is in `WAITING` status | Status updates to `REJECTED` in DB, notification generated, broadcast dispatched | Notification error caught and isolated | Verified |
| **SC-04** | Realtime service unavailable / slow | Supabase REST broadcast times out | Database update completes and returns 200 OK within normal SLA | Handled via `AbortController` (2000ms) with warning logged | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **DEC-01** | How should `sentinel-api` broadcast Realtime messages? | Use Supabase Realtime HTTP REST API (`POST /realtime/v1/api/broadcast`) | Stateless HTTP `fetch` eliminates WebSocket lifecycle management, unhandled EventEmitter errors, and socket teardown crashes in Node.js | Ephemeral `@supabase/supabase-js` WebSocket channels (caused 502 crashes) | `docs/context/August/25/fix-admission-502-and-stateless-realtime-broadcast.md` |
| **DEC-02** | How to protect the database transaction from broadcast latency? | Use non-blocking `fetch` with an `AbortController` timeout (2000ms) | Ensures external Realtime network hiccups never delay or fail the primary database update | Awaiting unbounded WebSocket joins | `docs/context/August/25/fix-admission-502-and-stateless-realtime-broadcast.md` |
| **DEC-03** | How to handle `numUpdatedRows` from Kysely? | Defensive fallback: `Number(result?.numUpdatedRows ?? 0)` | Prevents `TypeError: Cannot read properties of undefined` if query returns empty result | Direct `Number(result.numUpdatedRows)` | `docs/context/August/25/fix-admission-502-and-stateless-realtime-broadcast.md` |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | DEC-01, SC-01 | `broadcastLobbyEvent` uses `fetch` to `POST ${SUPABASE_URL}/realtime/v1/api/broadcast` with Service Role Key | Refactor `broadcast-lobby-event.ts` to stateless HTTP | Unit test in `broadcast-lobby-event.test.ts` mocking `fetch` | Verified |
| **AC-02** | DEC-02, SC-04 | `broadcastLobbyEvent` aborts after 2s and suppresses errors gracefully | Add `AbortSignal.timeout(2000)` and try/catch | Test timeout and network error cases | Verified |
| **AC-03** | DEC-03, SC-01 | `updateAdmissions` safely computes `updatedCount` | Add `Number(result?.numUpdatedRows ?? 0)` | Unit test in `update-admissions.test.ts` | Verified |
| **AC-04** | SC-01, SC-02 | `PATCH /exams/:id/lobby/admissions` returns 200 OK with correct CORS headers | All lobby routes pass end-to-end tests | Vitest run across `sentinel-api` lobby module | Verified |

## Scope

- Refactored `broadcastLobbyEvent` in `app/sentinel-api` to use Supabase Realtime REST API.
- Updated `update-admissions.ts` to use null-safe row counts.
- Updated backend tests in `app/sentinel-api/src/modules/examination/lobby/`.
- Verified client-side hooks (`useLobbyRealtime`, `useUpdateExamLobbyAdmissionsMutation`) pass tests against the updated payload contract.

## Non-goals

- Modifying client hook public signatures or UI component layouts.
- Altering the database schema or PostgreSQL table definitions.

## Phases

- [x] [`phase-01-stateless-rest-realtime-broadcast.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-admission-502-and-stateless-realtime-broadcast/phase-01-stateless-rest-realtime-broadcast.md) — Phase 1: Stateless REST Realtime Broadcast Migration & Fault-Isolation
- [x] [`phase-02-integration-and-error-boundary-verification.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-admission-502-and-stateless-realtime-broadcast/phase-02-integration-and-error-boundary-verification.md) — Phase 2: Integration, Full Test Suite Pass & CORS Verification

## Verification

1. **API Examination Lobby Tests:**
   ```bash
   pnpm --filter sentinel-api vitest run src/modules/examination/lobby
   # All tests passed
   ```

2. **Client Realtime & Mutation Hook Tests:**
   ```bash
   pnpm --filter @sentinel/hooks vitest run src/use-lobby-realtime.test.ts src/query/exams/use-update-exam-lobby-admissions-mutation.test.ts
   # All tests passed
   ```

3. **CORS Configuration Tests:**
   ```bash
   pnpm --filter sentinel-api vitest run src/tests/cors.test.ts
   # All tests passed
   ```

4. **Monorepo Build Verification:**
   ```bash
   pnpm --filter sentinel-api build
   pnpm --filter @sentinel/hooks build && pnpm --filter @sentinel/services build
   # Zero compilation or type errors
   ```

## Result

Task completed successfully. All phases executed and verified against all acceptance criteria.
