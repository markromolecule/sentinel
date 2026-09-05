---
parent: "database-performance-and-query-optimization"
title: "Phase 3: Non-blocking Asynchronous Audit Logging & Notifications"
type: task
status: ready
created: "2026-09-06"
tags: [task, phase, async, audit-logs, notifications, hot-path]
---

# Phase 3: Non-blocking Asynchronous Audit Logging & Notifications

## Goal

Decouple `audit_logs` and `notifications` database insertions from the student hot path (check-in, admission, answer sync, exam entry), preventing 23s–33s disk write bottlenecks.

## Affected Files

- `app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.service.ts`
- `app/sentinel-api/src/modules/examination/flow/services/sync-answers.service.ts`
- `app/sentinel-api/src/modules/examination/flow/services/start-exam-attempt.service.ts`

## Implementation Tasks

- [x] **Task 3.1:** Audit `checkInLobby` and related services to ensure that any audit logging or staff notification operations do not block the HTTP response.
- [x] **Task 3.2:** Ensure unhandled rejections in background logging are caught with structured error logging and do not crash the Node.js process.
- [x] **Task 3.3:** Decoupled `notifyCompletedSession` in `completeSessionService` to run asynchronously, removing synchronous disk write waiting from student exam turn-in.
- [x] **Task 3.4:** Verify lobby check-in and flow response times under test suites.

## Verification

- Run focused lobby and attempt flow test suites in `app/sentinel-api` (16 test files, 92 tests passed).
