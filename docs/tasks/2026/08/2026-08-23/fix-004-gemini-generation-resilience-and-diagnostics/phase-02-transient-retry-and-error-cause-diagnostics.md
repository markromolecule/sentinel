---
title: "Phase 2: Transient Network Retries, Cause Chaining, and Error Diagnostics"
type: phase
parent: "docs/tasks/2026/08/2026-08-23/fix-004-gemini-generation-resilience-and-diagnostics/README.md"
phase: "02"
status: completed
created: "2026-08-23"
tags: [task, phase, gemini, resilience, retry, diagnostics]
---

# Phase 2: Transient Network Retries, Cause Chaining, and Error Diagnostics

## Objective

Enhance `GeminiProvider.fetchWithThrottle` to automatically recover from transient network drops/socket resets via a single exponential backoff retry, preserve error causes across all exceptions (`cause: error`), and log rich diagnostic metadata.

---

## Dependencies & Prerequisites

- Completion of Phase 1.

---

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`: Add retry loop, timing calculations, cause chaining, and structured logging in `fetchWithThrottle` and `createUpstreamException`.
- `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`: Add unit test coverage for transient retry and error cause chaining.

---

## Implementation Tasks

- [x] **Task 2.1:** In `GeminiProvider.fetchWithThrottle`, implement a retry loop (`MAX_NETWORK_RETRIES = 1`, `NETWORK_RETRY_DELAY_MS = 1500`) for transient network errors (`TypeError: fetch failed`, `ECONNRESET`, socket hangup).
- [x] **Task 2.2:** When a transient error occurs and retries remain, log a diagnostic warning with the attempt count and retry delay.
- [x] **Task 2.3:** When all retries fail or an unrecoverable error occurs, log a detailed diagnostic error including URL, elapsed ms, error name, error code, and message.
- [x] **Task 2.4:** Pass `{ cause: error }` to `new HTTPException(502, { message: GEMINI_REQUEST_FAILURE_MESSAGE, cause: error })` so the root cause is never undefined in server logs.
- [x] **Task 2.5:** Update `createUpstreamException` to pass `{ cause: errorDetails ?? new Error(message) }` or the underlying response status details.

---

## Verification & Testing

- `pnpm --filter sentinel-api test src/lib/gemini/gemini.provider.test.ts` (14/14 passed)
- Verified transient failure recovers on retry attempt.
- Verified 502 and upstream exceptions retain original error / payload in `cause`.

---

## Risks & Rollback

- **Risk:** Infinite loops or excessive delays if retries are not bounded.
- **Mitigation:** Strict limit of 1 retry with maximum delay of 1.5s; immediate abort if the error is a hard timeout and signal is already aborted.
