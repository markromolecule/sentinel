# Production Telemetry Persistence and Monitoring — Implementation Plan

**Source:** `docs/context/July/July 23/fix-mobile-responsiveness-and-accessibility.md`
**Status:** Phase 2, Phase 4, and Phase 5 complete locally; Phase 3 and Phase 6 partially complete; production verification and deployment gates pending
**Delivery boundary:** Telemetry ingestion, queue consumer deployment, incident persistence, and instructor monitoring visibility
**Migration required:** No database migration is expected

## Goal

Ensure every production telemetry event accepted by policy reaches a visible, traceable terminal outcome:

- persisted or aggregated into `flagged_incidents`;
- intentionally dropped with a bounded terminal reason; or
- retained as a failed queue job with actionable diagnostics.

Instructor monitoring must display persisted incidents for the same attempt that emitted them within the agreed polling latency.

## Confirmed Baseline

- Browser detectors send individual events to `/telemetry/events`.
- `TelemetryIngestionService` resolves settings, runs policy, and submits accepted events to the ingestion queue service.
- “Event ignored: threshold not met” means no incident should be created.
- “Event flagged for persistence” means policy accepted the event; it does not prove storage.
- Redis mode uses BullMQ and requires a separate consumer.
- `app/sentinel-api`’s normal `start` command starts only `src/server.ts`.
- The telemetry worker has the separate command:

```bash
pnpm --dir app/sentinel-api start:telemetry-worker
```

- Local Turbo development starts the API with the telemetry worker, while the production topology is not defined in this repository.
- The supplied production logs show Redis connection, ingestion, policy, and queue submission, but no worker-ready or storage-success message.
- `/telemetry/health` already reports mode and basic queue counts.
- BullMQ `5.73.5` exposes `getWorkersCount()`, so worker presence can be reported without introducing a custom heartbeat.
- Monitoring overview/detail services read `flagged_incidents` for the selected latest attempt.
- Monitoring overview polls every two seconds; student detail polls every five seconds.
- A `SIGTERM` is handled as a graceful process shutdown and is not independently evidence of telemetry failure.

## Leading Hypothesis

Production is operating in Redis ingestion mode without a healthy telemetry-worker process, so accepted jobs remain queued and never reach `flagged_incidents`.

This hypothesis must be confirmed through the read-only gate below. Do not change code, settings, queue contents, or deployment topology until the failed boundary is identified.

## Execution Update — 2026-07-23

Local implementation covered the code-owned observability, traceability, incident disposition, monitoring attempt-selection helper, and runbook portions of this plan. Production verification, worker deployment, canary validation, queue retry/removal actions, and frontend visibility work remain gated by live production evidence and were not executed locally.

Validation completed:

```bash
pnpm --dir app/sentinel-api exec vitest run src/modules/telemetry/ingestion/services/ingestion-queue.service.test.ts src/modules/telemetry/ingestion/services/telemetry-job-processor.service.test.ts src/modules/telemetry/ingestion/workers/telemetry.worker.test.ts src/modules/telemetry/telemetry-monitoring.controller.test.ts src/modules/examination/monitoring/services/attempt-selection.helper.test.ts src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.test.ts src/modules/examination/monitoring/services/get-monitoring-exam-context.test.ts
pnpm --dir packages/hooks exec vitest run src/query/exams/use-exam-monitoring-overview-query.test.ts src/query/exams/use-exam-monitoring-student-query.test.ts
pnpm --dir packages/services exec vitest run src/api/exams/mappers.test.ts
pnpm --dir app/sentinel-web exec vitest run "src/app/(protected)/(instructor)/exams/[id]/monitoring/page.test.tsx" "src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx"
pnpm exec prettier --check app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.ts app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.test.ts app/sentinel-api/src/modules/telemetry/telemetry-monitoring.controller.ts app/sentinel-api/src/modules/telemetry/telemetry-monitoring.controller.test.ts app/sentinel-api/src/modules/telemetry/storage/storage.service.ts docs/operations/telemetry-production-runbook.md
```

Focused result: API 7 test files passed with 34 tests; hooks 2 test files passed with 2 tests; services 1 test file passed with 7 tests; web 2 test files passed with 10 tests. Existing DB-backed `IncidentPersistenceService` tests cover duplicate dedupe delivery and later distinct occurrence aggregation, but they were not rerun in this focused pass because the broader integration suite requires database/network availability. A full `pnpm --dir app/sentinel-api test` attempt was stopped because it ran the broader integration suite and failed on unrelated remote database/network availability. A full `pnpm --dir app/sentinel-api typecheck` attempt was stopped after several silent minutes, and a narrower default-heap `tsc --noEmit --skipLibCheck` attempt aborted with Node heap exhaustion, so full workspace typecheck remains pending.

Completed local task groups:

- [x] Phase 2 queue observability and `/telemetry/health` status reporting.
- [x] Phase 3 queue idempotency, disposition logging, duplicate/distinct occurrence coverage, and worker shutdown coverage.
- [x] Phase 4 shared monitoring attempt-selection helper, overview/detail adoption, selected-attempt incident tests, and lifecycle fixture coverage.
- [x] Phase 5 local mapper/query/toast behavior that is independent of production UI evidence.
- [x] Phase 6 production runbook and alert/trace documentation, excluding live deployment/canary items.

## Decision Matrix

| Production evidence                                           | Implementation branch                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Mode is `redis`, worker count is `0`, waiting age/count grows | Deploy or restore a dedicated telemetry-worker service                                      |
| Mode is `redis`, worker exists, jobs are failed/stalled       | Diagnose the first storage/runtime error and repair that code/configuration                 |
| Mode is `sync`, accepted event has no incident row            | Trace synchronous storage and attempt eligibility directly; worker deployment is irrelevant |
| Incident row exists, monitoring API omits it                  | Fix attempt selection/query scoping in the monitoring backend                               |
| Monitoring API returns the incident, UI omits it              | Fix service mapping/query cache/rendering only                                              |
| Event is policy-ignored                                       | No persistence fix; validate rule threshold/configuration expectations                      |

Only execute the branch supported by evidence. Avoid speculative changes across every layer.

## Scope and Affected Files

### Queue, worker, and health

- `app/sentinel-api/src/modules/telemetry/ingestion/config/ingestion-queue.config.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.service.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.test.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/services/telemetry-job-processor.service.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/services/telemetry-job-processor.service.test.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/workers/telemetry.worker.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/workers/telemetry.worker.test.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/scripts/manage-failed-jobs.ts`
- `app/sentinel-api/src/modules/telemetry/telemetry-monitoring.controller.ts`
- `app/sentinel-api/src/modules/telemetry/telemetry-monitoring.controller.test.ts`
- `app/sentinel-api/package.json`

### Persistence and monitoring

- `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.test.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.test.ts`
- `packages/services/src/api/exams/monitoring.ts`
- `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts`
- `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.test.ts`
- `packages/hooks/src/query/exams/use-exam-monitoring-student-query.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx`

### Operational documentation

- `docs/operations/telemetry-production-runbook.md` **[NEW]**
- the actual external deployment/service definition, if maintained outside this repository

## Phase 0: Read-Only Production Verification Gate

**Goal:** Identify the first failed boundary using one policy-accepted production event.

- [ ] Record the deployed application revision and relevant service names.
- [ ] Record only whether `TELEMETRY_INGESTION_MODE`, `REDIS_URL`, queue name, and worker concurrency are configured; do not copy secret values.
- [ ] Call the authorized `/telemetry/health` endpoint and record mode, waiting, active, failed, completed, and buffered counts.
- [ ] Confirm whether a separate process runs `pnpm --dir app/sentinel-api start:telemetry-worker`.
- [ ] Check worker replica count, readiness, restart history, and logs for `[TelemetryWorker] Worker ready`.
- [ ] Run the failed-job script in summary/list mode only:

```bash
pnpm --dir app/sentinel-api telemetry:failed-jobs -- --mode summary
pnpm --dir app/sentinel-api telemetry:failed-jobs -- --mode list --limit 20
```

- [ ] Do not use `remove-terminal --apply`, retry jobs, drain the queue, or edit production settings during this phase.
- [ ] Select one recent log entry with `Event flagged for persistence`.
- [ ] Trace its `eventId`, `dedupeKey`, `attemptId`, event type, queue job ID if available, and timestamps.
- [ ] Check whether the job is waiting, active, completed, failed, delayed, stalled, or absent.
- [ ] Check `flagged_incidents` for the exact `attempt_id`, rule key, platform, and dedupe key.
- [ ] Call the instructor monitoring overview and student-detail APIs for the same exam/student and compare the returned `attemptId`.
- [ ] Confirm whether the supplied `SIGTERM` coincides with deploy/restart/scale events or an unexpected resource/health failure.
- [ ] Write a short evidence note selecting exactly one decision-matrix branch.

**Exit gate:** The first stage that fails is known. No implementation phase below begins on hypothesis alone.

**Open tasks declared:**

- Complete the full read-only production verification gate with live operational access.
- Record one evidence note selecting the supported decision-matrix branch.

## Phase 1A: Restore the Redis Consumer When No Worker Is Running

**Applies only if:** Redis mode is active and worker count/readiness proves there is no healthy consumer.

**Goal:** Run the existing worker continuously against the same queue and deployment revision as the producer.

- [ ] Create or restore a dedicated production worker service using the same built artifact/image and commit as the API.
- [ ] Set its start command to `pnpm --dir app/sentinel-api start:telemetry-worker`.
- [ ] Provide the same database, Redis, telemetry mode, queue name, job name, and required configuration as the API without exposing values.
- [ ] Start with one replica and the configured concurrency; scale only after queue and database behavior are measured.
- [ ] Configure restart-on-failure and a graceful shutdown period long enough for BullMQ `worker.close()` to complete active jobs.
- [ ] Verify the service emits `Validating Redis configuration` and `Worker ready`.
- [ ] Verify queue waiting age/count falls and completed count rises.
- [ ] Verify one newly accepted event produces a storage insert/update log and a database row.
- [ ] Do not bulk-retry or delete historical failed jobs until current-event processing is healthy.
- [ ] If the hosting platform cannot run a persistent worker, document and approve a temporary switch to `sync` ingestion rather than leaving Redis jobs unconsumed.

**Code change expected:** None unless the external deployment definition is versioned in this repository.

**Open tasks declared:**

- Restore or create the production telemetry-worker process if Phase 0 confirms Redis mode has no healthy consumer.
- Validate current-event processing with one canary event before retrying or deleting historical jobs.
- Document and approve any temporary `sync` fallback if persistent workers are unavailable.

## Phase 1B: Repair Worker or Storage Failure

**Applies only if:** A worker is present and the traced job fails, stalls, or is dropped unexpectedly.

**Goal:** Fix the first concrete runtime/storage error without weakening session eligibility or deduplication.

- [ ] Capture the bounded worker failure reason, attempts made, job timestamps, and traced payload identifiers.
- [ ] Reproduce the same payload shape against a test database.
- [ ] Add a failing test in the closest owning service before changing behavior.
- [ ] Preserve terminal `404`/`409` handling for genuinely missing, completed, or ineligible attempts.
- [ ] Preserve transaction-safe incident deduplication and occurrence-count behavior.
- [ ] Fix only the confirmed configuration, database, serialization, or service defect.
- [ ] Verify retryable errors throw so BullMQ retries them; terminal eligibility errors return `dropped`.
- [ ] Ensure the final failed job retains an actionable bounded reason.
- [ ] Re-run the traced case and verify `inserted`, `aggregated`, `duplicate-ignored`, `dropped`, or retained `failed` is correct.

**Migration required:** No unless the discovered failure proves a schema mismatch. Any migration would require a separate reviewed plan.

**Open tasks declared:**

- Execute only if Phase 0 proves a worker/storage failure instead of worker absence.
- Capture the concrete failed payload/job details and add a failing service-level test.
- Repair only the confirmed runtime, storage, configuration, or serialization defect.

## Phase 2: Add End-to-End Queue Observability

**Goal:** Make “producer healthy, consumer missing” visible before instructors report absent anomalies.

- [x] Extend `TelemetryIngestionQueueService.getStats()` with:
    - `delayed`;
    - `workerCount` using BullMQ `getWorkersCount()`;
    - oldest waiting-job age/timestamp when jobs are waiting;
    - a bounded fallback when the Redis provider cannot report worker clients.
- [x] Extend `/telemetry/health` with a typed `healthy`/`degraded` status and explicit reason codes.
- [x] Mark Redis mode degraded when no worker is visible or waiting jobs exceed the agreed age threshold.
- [x] Keep sync mode healthy without requiring a worker.
- [x] Do not expose Redis URLs, credentials, raw payloads, or student details in the health response.
- [x] Confirm the health route remains restricted to the intended operational/support roles; add authorization if its mounted route is broader.
- [x] Add producer submission results containing `mode` and a safe queue `jobId`.
- [x] Log the job ID with `attemptId`, `eventId`, event type, and dedupe key after successful queue submission.
- [x] Add bounded worker completion logging for `inserted`, `aggregated`, `duplicate-ignored`, and `dropped` outcomes.
- [x] Keep failed/stalled logs and include job ID plus bounded trace identifiers.
- [x] Add tests for sync mode, Redis with worker, Redis without worker, delayed/waiting backlog, provider inability to enumerate workers, submission IDs, persisted completion, terminal drop, failure, and stalled jobs.

**Migration required:** No.

**Open tasks declared:** None. Phase 2 is complete locally.

## Phase 3: Prove Persistence and Deduplication Contracts

**Goal:** Ensure retries and queue delivery produce one correct incident outcome.

- [x] Use the existing event UUID as BullMQ `jobId` when it is present and valid, after confirming the identifier format is accepted.
- [x] Keep database `dedupe_key` as the final idempotency boundary even when BullMQ suppresses duplicate job delivery.
- [x] Return/log a distinct disposition for:
    - inserted incident;
    - aggregated occurrence;
    - duplicate event ignored;
    - terminal job dropped;
    - retryable failure.
- [ ] Add integration coverage from accepted policy result through queue processor to `flagged_incidents`.
- [x] Add duplicate-delivery coverage proving the same event ID/dedupe key does not increase occurrence count twice.
- [x] Add distinct-event coverage proving a later valid occurrence aggregates according to the configured window.
- [x] Add restart/shutdown coverage proving an accepted active job is either completed or returned to BullMQ, not silently acknowledged.
- [x] Confirm no raw media, answer content, JWT, Redis URL, or database credential appears in trace logs.

**Migration required:** No.

**Open tasks declared:**

- Add integration coverage from policy-accepted event through queue processor into `flagged_incidents`.

## Phase 4: Repair Monitoring Attempt Selection Only If Persistence Is Healthy

**Applies only if:** The traced incident exists in `flagged_incidents` but the monitoring API omits it.

**Goal:** Make attempt selection explicit and consistent between overview and detail responses.

- [x] Add fixtures with multiple attempts for one student, including active, completed, reset/superseded, and newer retry attempts.
- [x] Define the monitoring selection rule in one shared query helper: prefer the current operational attempt according to lifecycle rules, otherwise use the newest attempt.
- [x] Use the same helper in overview and student detail.
- [x] Keep incident joins scoped by both exam and selected `attempt_id`.
- [x] Include the selected `attemptId` in mapped overview/detail contracts and verify it matches the incident trace.
- [x] Add tests proving incidents from older attempts do not leak into the selected attempt and incidents from the selected attempt do appear.
- [x] Preserve instructor/institution authorization and existing lifecycle actions.

**Migration required:** No.

**Open tasks declared:** None. Phase 4 is complete locally.

## Phase 5: Repair Frontend Visibility Only If the API Is Correct

**Applies only if:** The monitoring API returns the incident but the instructor UI does not render it.

**Goal:** Preserve polling and render the server’s incident state without stale mapping or cache behavior.

- [x] Add service-mapper fixtures containing incident count, open count, latest type, latest time, and selected attempt ID.
- [x] Verify `EXAM_QUERY_KEYS.monitoring(examId)` and student-detail keys do not collide with stale attempt data.
- [x] Preserve the existing two-second overview and five-second detail polling unless production latency evidence requires a documented change.
- [x] Ensure background polling and manual refresh both update incident cards/list rows.
- [x] Verify `useIncidentToast()` keys snapshots by selected attempt and announces only real increases after hydration.
- [x] Add tests for a zero-to-one incident transition, aggregated occurrence update, attempt replacement, manual refresh, background refetch, and no duplicate initial toast.
- [x] Do not display policy-ignored raw detections as instructor incidents.

**Migration required:** No.

**Open tasks declared:** None. Phase 5 is complete locally.

## Phase 6: Production Runbook, Alerting, and Rollout

**Goal:** Make the topology and response procedure repeatable.

- [x] Create `docs/operations/telemetry-production-runbook.md`.
- [x] Document API producer and telemetry-worker as separate process roles.
- [x] Document required non-secret configuration names, start commands, queue naming, replica expectations, and graceful shutdown behavior.
- [x] Document `/telemetry/health` interpretation and safe failed-job summary/list commands.
- [x] Define alerts for zero workers in Redis mode, oldest waiting-job age, failed-job growth, repeated worker restarts, and health status `degraded`.
- [x] Document how to trace one event across ingestion, policy, queue, storage, monitoring API, and UI.
- [x] Document that `threshold not met` is an expected non-incident outcome.
- [x] Document approval requirements for retrying/removing jobs, changing ingestion mode, draining queues, or modifying production rows.
- [ ] Deploy one worker replica, validate a canary event, then observe queue latency and database load before scaling.
- [ ] Correlate `SIGTERM` with platform deployment/restart events and confirm graceful worker/API shutdown logs.

**Open tasks declared:**

- Deploy or restore the production worker only after Phase 0 selects the worker-absence branch.
- Validate one canary event end to end and observe queue/database behavior before scaling.
- Correlate `SIGTERM` with platform deployment/restart events and confirm graceful shutdown logs.

## Automated Verification Commands

```bash
pnpm --dir app/sentinel-api test
pnpm --dir app/sentinel-api typecheck
pnpm --dir packages/services test
pnpm --dir packages/hooks test
pnpm --dir app/sentinel-web test
pnpm --dir app/sentinel-web lint
pnpm --dir app/sentinel-web build
pnpm format:check
```

Run production health and queue checks separately using read-only credentials and the operational runbook.

## Rollout and Rollback

- Restore worker topology before shipping speculative storage or UI changes.
- Deploy observability changes independently from monitoring-query changes.
- Begin with one worker replica and compare queue latency, failure rate, database writes, and monitoring latency.
- If the worker is unhealthy, stop the worker deployment without deleting queued jobs; jobs remain recoverable in Redis.
- If an approved temporary sync fallback is used, monitor API latency/database load and restore Redis mode only after a healthy worker is proven.
- Roll back query/UI changes independently if attempt scoping or instructor visibility regresses.
- Never roll back by disabling policy, authorization, deduplication, or incident eligibility.

## Done Criteria

- [ ] Phase 0 identifies and records the first failed production boundary.
- [ ] Redis mode has at least one independently healthy worker, or an explicitly approved/documented sync fallback is active.
- [ ] Every policy-accepted canary event reaches `inserted`, `aggregated`, `duplicate-ignored`, `dropped`, or retained `failed`.
- [x] Queue health reports worker presence, delayed/waiting backlog, failed jobs, and oldest waiting age without secrets.
- [ ] A persisted canary incident is visible through the monitoring API and UI for the exact same `attempt_id`.
- [x] Policy-ignored events remain absent from instructor incident views.
- [x] Duplicate delivery does not create duplicate occurrences.
- [ ] Worker/API deploy shutdowns do not silently lose accepted jobs.
- [x] The production runbook and alerts cover worker absence, backlog, failure, tracing, and safe recovery.
- [ ] All affected tests, type checks, lint, builds, and formatting checks pass.

**Open tasks declared:**

- Complete production verification and canary validation.
- Complete remaining integration, production shutdown, and full-workspace verification coverage.
- Re-run full tests, type checks, lint, builds, and formatting checks in an environment with the required database/network access and enough TypeScript heap.
