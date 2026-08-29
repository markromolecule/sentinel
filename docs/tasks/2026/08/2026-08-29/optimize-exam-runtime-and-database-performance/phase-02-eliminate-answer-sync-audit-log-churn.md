---
title: "Phase 2: Eliminate Answer Sync & Heartbeat Write Churn"
type: phase
parent: "optimize-exam-runtime-and-database-performance"
phase: "02"
status: completed
created: "2026-08-29"
tags: [task, phase, api, performance, answer-sync, logging, telemetry]
---

# Phase 2: Eliminate Answer Sync & Heartbeat Write Churn

## Objective

Refactor `syncSessionService` in `app/sentinel-api` to eliminate redundant `activity_logs` inserts and `institutions` hierarchy queries during routine 2s answer syncs and 30s elapsed-time heartbeats, cutting database round-trips by 50% per sync.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- `app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts` — Removed routine `LogsService.createLog` calls during answer sync.
- `app/sentinel-api/src/modules/examination/flow/flow.test.ts` — Updated test assertions to ensure atomic progress sync without routine activity log overhead.

## Implementation Tasks

- [x] Task 2.1: In `app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts`, remove the invocation of `LogsService.createLog(dbClient, { action: "exam.heartbeat_synced", ... })`.
- [x] Task 2.2: Ensure `SessionRepository.updateSyncProgress` remains atomic and retains the terminal 409 conflict detection for locked/closed attempts.
- [x] Task 2.3: Verify that genuine security incidents and lifecycle events (e.g. attempt start, attempt submit, attempt lock, proctoring violations) continue to log to `flagged_incidents` and `exam_attempt_lifecycle_events`.
- [x] Task 2.4: Execute flow test suite (`pnpm --dir app/sentinel-api test src/modules/examination/flow`).

## Verification & Testing

- `pnpm --dir app/sentinel-api test src/modules/examination/flow` — PASS: 9/9 test files passed, 55/55 tests passed in 11.91s.
- Verified answer sync executions now require strictly 2 DB operations per request (1 read + 1 atomic update) rather than 4 operations.

## Risks & Rollback

- **Risk:** Loss of routine heartbeat audit logs (which are non-actionable operational pings).
- **Rollback:** Re-add logging call if required by explicit institutional policy.
