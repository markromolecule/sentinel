---
title: "Phase 3: Unit Tests, Batch Timing Diagnostics, and Suite Verification"
type: phase
parent: "docs/tasks/2026/08/2026-08-23/fix-004-gemini-generation-resilience-and-diagnostics/README.md"
phase: "03"
status: completed
created: "2026-08-23"
tags: [task, phase, gemini, tests, verification, diagnostics]
---

# Phase 3: Unit Tests, Batch Timing Diagnostics, and Suite Verification

## Objective

Enhance `generateBatchesStep` with batch-level latency and failure diagnostics, expand `gemini.provider.test.ts` to test all new behaviors (thinking budget, transient retries, error cause retention), and verify end-to-end suite health.

---

## Dependencies & Prerequisites

- Completion of Phase 1 and Phase 2.

---

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`: Add timing logs per batch task.
- `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`: Add comprehensive unit test coverage.

---

## Implementation Tasks

- [x] **Task 3.1:** In `generateBatchesStep`, wrap each batch execution with start/end timing diagnostics and include batch index and elapsed time in warning/error logs.
- [x] **Task 3.2:** In `gemini.provider.test.ts`, add test cases for:
  - Default `thinkingBudget: 0` in `generateStructuredJson` for flash models.
  - `AI_GEMINI_THINKING_BUDGET` environment variable override.
  - Transient network retry recovery in `fetchWithThrottle`.
  - Preservation of `{ cause: error }` on 502 exceptions.
- [x] **Task 3.3:** Run all `sentinel-api` tests and typecheck verification.

---

## Verification & Testing

- `pnpm --filter sentinel-api test src/lib/gemini/gemini.provider.test.ts` (PASS: 14/14 passed)
- `pnpm --filter sentinel-api test src/lib/gemini/` (PASS: 14 test files, 82/82 passed)
- `node --stack-size=4096 ./node_modules/typescript/bin/tsc --noEmit -p app/sentinel-api/tsconfig.json` (PASS: 0 errors)

---

## Risks & Rollback

- **Risk:** Existing unit tests expecting old request payload structures without `thinkingConfig`.
- **Mitigation:** Update mock assertions in tests to expect `thinkingConfig` when flash models are tested.
