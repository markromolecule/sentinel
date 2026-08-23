---
title: "Phase 4: Test Suite & End-to-End Verification"
type: phase
parent: "fix-005-gemini-passage-quality-and-batch-resilience"
phase: "4"
status: completed
created: "2026-08-23"
tags: [task, phase, ai, gemini, test, verification]
---

# Phase 4: Test Suite & End-to-End Verification

## Objective

Validate all changes across unit test suites, integration test suites, and simulate 40-question generations to ensure zero regressions, clean error contracts, and robust quality recovery.

## Dependencies & Prerequisites

- Phase 1, Phase 2, & Phase 3

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.test.ts`
- `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`
- `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.test.ts`
- `app/sentinel-api/src/tests/gemini/gemini-route.test.ts`

## Implementation Tasks

- [x] **Task 4.1:** Update unit tests in `orchestrator.test.ts` to test:
  - Batching into chunks of 10.
  - Replenishing questions when an item has persistent passage quality leaks after repair.
- [x] **Task 4.2:** Update unit tests in `gemini.provider.test.ts` to test 2 network retries with exponential backoff.
- [x] **Task 4.3:** Update unit tests in `prompt-builder.service.test.ts` to verify delimiter tags, empty text detection, and schema constraints.
- [x] **Task 4.4:** Run full AI test suite across `src/lib/gemini/` and `src/tests/gemini/` (PASS: 109/109 tests passed).

## Verification & Testing

- `pnpm --dir app/sentinel-api test src/lib/gemini/ src/tests/gemini/` (PASS: 109/109 tests)

## Risks & Rollback

- **Risk:** Test regressions due to changed mock counts.
- **Mitigation:** Updated mock expectations to match the new `BATCH_SIZE = 10` and `MAX_NETWORK_RETRIES = 2`.

