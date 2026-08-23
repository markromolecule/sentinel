---
title: "Phase 2: 200-Student Concurrency, Jittered Heartbeats & Non-Blocking Telemetry"
type: phase
parent: "task-exam-scalability-integrity-architecture"
phase: "2"
status: completed
created: "2026-08-23"
tags: [task, phase, concurrency, heartbeats, jitter, telemetry, scalability]
---

# Phase 2: 200-Student Concurrency, Jittered Heartbeats & Non-Blocking Telemetry

## Objective

Ensure that an active exam with 200 simultaneous test-takers does not degrade database performance or bottleneck API workers. Implement jittered heartbeat schedules, lightweight sync payloads, and non-blocking asynchronous incident logging.

---

## Dependencies & Prerequisites

- Phase 1 completed (Lobby check-ins & admissions hardened).
- Exam flow services in `app/sentinel-api/src/modules/examination/flow/`
- Mobile exam session hook in `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`
- Telemetry persistence service in `app/sentinel-api/src/modules/telemetry/storage/services/`

---

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts): Jittered periodic heartbeat loop and debounced answer sync.
- [`app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts): Optimized session sync.
- [`app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts): Telemetry ingestion & persistence.
- [`app/sentinel-api/src/modules/examination/flow/flow.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/flow.test.ts): Session flow concurrency tests.

---

## Implementation Tasks

- [x] **Task 2.1 (Implement Jittered Sync Cadence):** In [`use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts), apply random jitter (15s–25s interval) and debounced answer sync so that 200 concurrent student devices do not trigger HTTP sync requests every second or on the exact same millisecond.
- [x] **Task 2.2 (Lightweight Heartbeat Payloads):** Verified that [`syncSessionService`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts) handles lightweight status heartbeats (`elapsedSeconds`, `answeredCount`) omitting heavy answer snapshots when answers have not changed.
- [x] **Task 2.3 (Non-Blocking Telemetry Ingestion):** Verified and hardened [`IncidentPersistenceService`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts) and side-effects so incident logging is non-blocking and isolated from answer submission.
- [x] **Task 2.4 (Concurrency & Sync Tests):** Run integration tests in [`flow.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/flow.test.ts) and telemetry suites validating simultaneous operations.

---

## Verification & Testing

```bash
# Run flow and telemetry test suites
pnpm --filter sentinel-api test src/modules/examination/flow
# PASS: 9/9 test files passed, 53/53 tests passed

pnpm --filter sentinel-api test src/modules/telemetry
# PASS: 31/31 test files passed, 276/276 tests passed

pnpm --filter sentinel-mobile exec tsc --noEmit
# PASS: 0 type errors
```

---

## Risks & Rollback

- **Risk:** Stale answer overwrites if network latency is high.
- **Mitigation:** Rely on versioning and client-side timestamp comparison in `SessionRepository.updateSyncProgress`.
- **Rollback:** Retain full snapshot sync fallback if payload comparison encounters issues.
