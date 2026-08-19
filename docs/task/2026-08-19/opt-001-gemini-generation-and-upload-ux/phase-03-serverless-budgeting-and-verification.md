---
title: "Serverless Timeout Budgeting & Full Test Suite Verification"
type: phase
parent: "opt-001-gemini-generation-and-upload-ux"
phase: "03"
status: completed
created: "2026-08-19"
tags: [task, phase, backend, verification, serverless, cors]
---

# Phase 03: Serverless Timeout Budgeting & Full Test Suite Verification

## Objective

Enforce strict serverless execution budget protection (<45s wall clock time) in `orchestrator.ts` to guarantee responses always complete and return valid CORS headers before Vercel's 60s edge proxy termination, tune Gemini retry and critic intervals, and execute the complete verification test suite across all monorepo packages.

## Dependencies & Prerequisites

- Phase 01: [`phase-01-upload-dialog-limits-and-file-removal.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/opt-001-gemini-generation-and-upload-ux/phase-01-upload-dialog-limits-and-file-removal.md)
- Phase 02: [`phase-02-deterministic-pdf-page-counting-and-latency.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/opt-001-gemini-generation-and-upload-ux/phase-02-deterministic-pdf-page-counting-and-latency.md)

## Impacted Files & Components

- [`app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts) — Enforce 45s hard budget guard and graceful partial question recovery.
- [`app/sentinel-api/src/lib/gemini/gemini.provider.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/gemini.provider.ts) — Tune quota retry delay and timeout abort signals.
- [`app/sentinel-api/src/tests/cors.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/tests/cors.test.ts) — Validate CORS headers on all HTTP status codes.
- [`packages/services/src/api-client.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/services/src/api-client.test.ts) — Validate network and edge error translation.

## Implementation Tasks

- [x] **Task 3.1:** Verify that `SERVERLESS_EXECUTION_BUDGET_MS` (45s) in `orchestrator.ts` protects the entire lifecycle (batch generation, deficit replenishment, passage quality critic, and repair rounds), immediately short-circuiting to build and return all generated valid questions before Vercel's 60s proxy termination.
- [x] **Task 3.2:** Verify that all exceptions thrown from the Gemini pipeline map cleanly to standard HTTP status codes (400, 413, 429, 502) and pass through `applyCorsHeaders(c)` in `app.ts`.
- [x] **Task 3.3:** Run automated test suites across `sentinel-api`, `sentinel-web`, and `@sentinel/services`.
- [x] **Task 3.4:** Run full monorepo build (`pnpm build`) to ensure zero type errors or bundle issues.

## Verification & Testing

- Run test suites:
  ```bash
  pnpm --filter sentinel-api test src/tests/gemini/ src/lib/gemini/
  pnpm --filter sentinel-api test src/tests/cors.test.ts
  pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/question/bank/_components/dialogs/import-modal/
  pnpm --filter sentinel-core test src/app/\(protected\)/question/bank/_components/dialogs/import-modal/
  pnpm --filter @sentinel/services test
  pnpm build
  ```
- **Verified Results:**
  - `sentinel-api` Gemini test suite: 17 test files (94 tests) passed.
  - `sentinel-api` CORS test suite: 1 test file (9 tests) passed.
  - `@sentinel/services` test suite: 19 test files (56 tests) passed.
  - `sentinel-web` import modal test suite: 2 test files (8 tests) passed.
  - `sentinel-core` import modal test suite: 2 test files (8 tests) passed.

## Risks & Rollback

- **Risk:** Premature return under extreme quota contention might return fewer questions than requested.
- **Mitigation:** The response includes the successfully normalized and verified questions rather than failing with an unrecoverable 504 edge drop.
- **Rollback:** Revert budget tuning changes via Git.
