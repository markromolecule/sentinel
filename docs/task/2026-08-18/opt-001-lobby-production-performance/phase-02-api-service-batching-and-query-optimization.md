---
title: "Phase 2: API Service Batching, Non-Blocking Notifications, and Query Consolidation"
type: phase
parent: "opt-001-lobby-production-performance"
phase: "2"
status: completed
created: "2026-08-18"
tags: [task, phase, api, backend, performance]
---

# Phase 2: API Service Batching, Non-Blocking Notifications, and Query Consolidation

## Objective

Eliminate latency bottlenecks in the Hono API lobby module by batching student lookups, inserting notifications in a single batch query (or non-blocking async task), and streamlining Kysely queries in `getWaitingList` and `checkInLobby`.

## Dependencies & Prerequisites

- Phase 1 (Database schema index).

## Impacted Files & Components

- [update-admissions.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts) (`updateAdmissions`)
- [get-waiting-list.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts) (`getWaitingList`)
- [check-in-lobby.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts) (`checkInLobby`)
- [update-admissions.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.test.ts)
- [get-waiting-list.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.test.ts)
- [check-in-lobby.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.test.ts)

## Implementation Tasks

- [x] Task 2.1 — Refactor `updateAdmissions`:
  - Run the bulk status update on `exam_lobby_admissions`.
  - Batch resolve `user_id` values for all `studentIds` in a single `selectFrom('students')` query.
  - Dispatch student notifications in parallel with `Promise.allSettled` to prevent sequential blocking latency.
  - Return `{ updatedCount }` immediately.
- [x] Task 2.2 — Optimize `getWaitingList`:
  - Fetch admissions and latest attempt statuses using an efficient consolidated Kysely query with index utilization.
- [x] Task 2.3 — Optimize `checkInLobby`:
  - Prevent duplicate activity notifications if student is already in WAITING status.
- [x] Task 2.4 — Update and expand unit test suites in `app/sentinel-api/src/modules/examination/lobby/services/`.

## Verification & Testing

- `pnpm --filter sentinel-api test src/modules/examination/lobby`: 5 test files, 21 tests passed cleanly.
- Confirmed `update-admissions.test.ts`, `get-waiting-list.test.ts`, `check-in-lobby.test.ts`, `get-lobby-count.test.ts`, and `lobby.service.test.ts` all passing.

## Risks & Rollback

- *Risk:* If notification creation fails silently in non-blocking mode, notifications might be missed.
- *Mitigation:* Catch and log errors with structured logging without interrupting admission state persistence.
