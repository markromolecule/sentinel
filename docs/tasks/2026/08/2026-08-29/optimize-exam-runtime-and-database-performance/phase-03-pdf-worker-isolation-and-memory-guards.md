---
title: "Phase 3: PDF Worker Concurrency Guards & Process Isolation Safety"
type: phase
parent: "optimize-exam-runtime-and-database-performance"
phase: "03"
status: completed
created: "2026-08-29"
tags: [task, phase, api, worker, pdf, memory, oom, railway]
---

# Phase 3: PDF Worker Concurrency Guards & Process Isolation Safety

## Objective

Enforce strict memory guards and concurrency bounds on the PDF Generation Worker and API server to prevent Node.js heap expansion and Out-Of-Memory (OOM) restarts on container platforms like Railway.

## Dependencies & Prerequisites

- Phases 1 and 2 completed.

## Impacted Files & Components

- `app/sentinel-api/src/modules/general/pdf-documents/queue/pdf-generation-queue.config.ts` — Concurrency defaults and isolation checks.
- `app/sentinel-api/src/server.ts` — Embedded worker startup conditions.
- `app/sentinel-api/src/pdf-worker-process.ts` — Standalone worker process entry point.

## Implementation Tasks

- [x] Task 3.1: Confirmed `ENABLE_EMBEDDED_PDF_WORKER` defaults to `false` in production environments (`shouldStartEmbeddedPdfWorker` requires explicit opt-in via `ENABLE_EMBEDDED_PDF_WORKER=true`), ensuring web API replicas do not execute background worker threads.
- [x] Task 3.2: Verified `PDF_WORKER_CONCURRENCY` defaults to `2` (`getPdfWorkerConcurrency` caps at 2) with exponential backoff on retry (`getPdfJobOptions` enforces 5s initial delay and exponential backoff) to prevent CPU and heap saturation.
- [x] Task 3.3: Verified graceful shutdown handlers in `server.ts` and `pdf-worker-process.ts` correctly close BullMQ workers and Redis connections within 5 seconds on `SIGTERM` / `SIGINT`.
- [x] Task 3.4: Executed PDF API and worker test suites (`pnpm --dir app/sentinel-api test src/server.config.test.ts` & `src/modules/general/pdf-documents`).

## Verification & Testing

- `pnpm --dir app/sentinel-api test src/server.config.test.ts src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts` — PASS: 2/2 test files, 31/31 tests passed.
- `pnpm --dir app/sentinel-api test src/modules/general/pdf-documents/tests/pdf-document-api.integration.test.ts` — PASS: 1/1 test file, 8/8 tests passed.
- `pnpm --dir app/sentinel-api test src/modules/general/pdf-documents/tests/pdf-generation-queue-and-cleanup.integration.test.ts` — PASS: 1/1 test file, 6/6 tests passed.

## Risks & Rollback

- **Risk:** Misconfigured environment variable disables PDF generation.
- **Rollback:** Setting `PDF_GENERATION_MODE=sync` allows direct in-process generation if Redis is unavailable.

## Risks & Rollback

- **Risk:** Misconfigured environment variable disables PDF generation.
- **Rollback:** Setting `PDF_GENERATION_MODE=sync` allows direct in-process generation if Redis is unavailable.
