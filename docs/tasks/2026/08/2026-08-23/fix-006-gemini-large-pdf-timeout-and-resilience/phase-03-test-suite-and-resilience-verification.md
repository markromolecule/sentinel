---
title: "Phase 3: Comprehensive Test Suite & Large PDF Resilience Verification"
type: phase
parent: "docs/tasks/2026/08/2026-08-23/fix-006-gemini-large-pdf-timeout-and-resilience/README.md"
phase: "03"
status: completed
created: "2026-08-23"
tags: [task, phase, gemini, testing, verification, large-pdf]
---

# Phase 3: Comprehensive Test Suite & Large PDF Resilience Verification

## Objective

Update and expand unit test suites across `gemini.provider.test.ts`, `steps.test.ts`, and `orchestrator.test.ts` to verify upstream 504/503 retry recovery, model fallback switching (`gemini-2.5-flash` -> `gemini-2.5-flash-lite`), 28s per-attempt timeout abort handling, and concurrency limits.

---

## Dependencies & Prerequisites

- Phases 1 and 2 completed.

---

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`:
  - Test upstream 504 `DEADLINE_EXCEEDED` retry and model switch.
  - Test upstream 503 `UNAVAILABLE` retry.
  - Test 28s per-attempt timeout abort signal.
  - Test `resolveFallbackModel` resolution.
- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.test.ts`:
  - Ensure end-to-end question generation tests pass with mock provider.

---

## Implementation Tasks

- [x] **Task 3.1:** Add unit test in `gemini.provider.test.ts` verifying that when the first call returns HTTP 504 `DEADLINE_EXCEEDED`, `generateStructuredJson` retries with `gemini-2.5-flash-lite` and succeeds.
- [x] **Task 3.2:** Add unit test in `gemini.provider.test.ts` verifying that when the first call returns HTTP 503 `UNAVAILABLE`, `generateStructuredJson` retries with exponential backoff and succeeds.
- [x] **Task 3.3:** Add unit test in `gemini.provider.test.ts` verifying that `resolveFallbackModel` returns `gemini-2.5-flash-lite` for `gemini-2.5-flash` and respects `process.env.AI_GEMINI_FALLBACK_MODEL`.
- [x] **Task 3.4:** Execute all test suites in `app/sentinel-api` and ensure 100% pass rate without regressions.

---

## Verification & Testing

- `pnpm --filter sentinel-api test src/lib/gemini/gemini.provider.test.ts` (19/19 tests passed)
- `pnpm --filter sentinel-api test src/lib/gemini src/tests/gemini` (114/114 tests passed across 17 test files)
- `pnpm --filter sentinel-api typecheck` (0 errors)

---

## Risks & Rollback

- **Risk:** Existing tests mocking `generateStructuredJson` might fail if signatures or helper expectations change.
- **Mitigation:** Maintain full backward compatibility for `generateStructuredJson` signature and types.
- **Rollback:** Revert test updates to `84ca0891`.
