---
title: "Phase 2: Unit Tests & Suite Verification"
type: phase
parent: "fix-001-ai-generation-timeout-and-env-config"
phase: "02"
status: completed
created: "2026-08-23"
tags: [task, phase, tests, vitest]
---

# Phase 2: Unit Tests & Suite Verification

## Objective

Add dedicated unit tests in `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts` to thoroughly validate dynamic timeout parsing, environment variable precedence, seconds-to-milliseconds scaling, and run the entire suite of AI and CORS tests.

## Dependencies & Prerequisites

- Phase 1 completed: [`phase-01-gemini-provider-dynamic-timeout.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-001-ai-generation-timeout-and-env-config/phase-01-gemini-provider-dynamic-timeout.md)

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`: Add test suite for `getGeminiTimeoutMs()`.

## Implementation Tasks

- [x] **Task 2.1:** Add test cases for `getGeminiTimeoutMs()`:
  - Assert default fallback is `180_000` ms when env vars are unset.
  - Assert `AI_GEMINI_TIMEOUT_MS=90000` resolves to `90_000` ms.
  - Assert `AI_GEMINI_TIMEOUT=180` (seconds) resolves to `180_000` ms.
  - Assert `GEMINI_TIMEOUT=60` (seconds) resolves to `60_000` ms.
  - Assert `GEMINI_TIMEOUT_MS=150000` resolves to `150_000` ms.
  - Assert invalid strings (e.g. `abc`, `-10`, `0`) fall back safely to `180_000` ms.
  - Assert runtime changes to `process.env` are reflected without module re-import.
- [x] **Task 2.2:** Run full regression suite:
  ```bash
  pnpm --dir app/sentinel-api test src/lib/gemini/gemini.provider.test.ts
  pnpm --dir app/sentinel-api test src/tests/gemini/gemini-route.test.ts
  pnpm --dir app/sentinel-api test src/tests/cors.test.ts
  pnpm --dir app/sentinel-api test src/lib/gemini/services/question-generator/orchestrator.test.ts
  ```

## Verification & Testing

- **`gemini.provider.test.ts`**: PASS (10/10 tests passed in 1.56s).
- **`gemini-route.test.ts`**: PASS (11/11 tests passed in 3.12s).
- **`cors.test.ts`**: PASS (11/11 tests passed in 2.89s).
- **`orchestrator.test.ts`**: PASS (3/3 tests passed in 0.85s).
- **Total Suite Pass Count:** 35/35 tests passing (0 failures).

## Risks & Rollback

- **Low Risk:** Tests are self-contained with proper `beforeEach` / `afterEach` environment cleanups.

