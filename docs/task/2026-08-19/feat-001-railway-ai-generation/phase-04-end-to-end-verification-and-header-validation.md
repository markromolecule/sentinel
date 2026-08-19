---
title: "Phase 4: Full Monorepo Test Suite Validation and Deployment Readiness"
type: phase
parent: "feat-001-railway-ai-generation"
phase: "04"
status: completed
created: "2026-08-19"
tags: [task, phase, verification, testing, build]
---

# Phase 4: Full Monorepo Test Suite Validation and Deployment Readiness

## Objective

Execute monorepo-wide automated verification, typechecking, and lint checks. Verify that all CORS test suites, Gemini generation tests, and client fetch handling pass with zero regressions.

---

## Dependencies & Prerequisites

- Phase 1, Phase 2, and Phase 3 completed.

---

## Impacted Files & Components

- Test suites across `app/sentinel-api`, `packages/services`, `app/sentinel-web`, and `app/sentinel-core`.

---

## Implementation Tasks

- [x] **Task 4.1 (Run CORS Test Suite):**
  Executed `pnpm --filter sentinel-api test src/tests/cors.test.ts` — 9/9 tests passed.
- [x] **Task 4.2 (Run Gemini Route Tests):**
  Executed `pnpm --filter sentinel-api test src/tests/gemini/` — 3 test files, 23/23 tests passed.
- [x] **Task 4.3 (Run Services Test Suite):**
  Executed `pnpm --filter @sentinel/services test` — 19 test files, 56/56 tests passed.
- [x] **Task 4.4 (Run Web Upload Validation Tests):**
  Executed `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.test.ts` — 5/5 tests passed with 25MB validation.

---

## Verification & Testing

- CORS Test Suite:
  ```bash
  pnpm --filter sentinel-api test src/tests/cors.test.ts
  ```
  *Result: 9 passed.*
- Gemini AI Generation Test Suite:
  ```bash
  pnpm --filter sentinel-api test src/tests/gemini/
  ```
  *Result: 23 passed.*
- Services API Client Test Suite:
  ```bash
  pnpm --filter @sentinel/services test
  ```
  *Result: 56 passed.*
- Web File Validator Test Suite:
  ```bash
  pnpm --filter sentinel-web test src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.test.ts
  ```
  *Result: 5 passed.*

---

## Risks & Rollback

- **Risk:** Build failure on CI/CD due to type mismatches.
- **Mitigation:** Run full monorepo build and linting locally prior to deployment commit.
- **Rollback:** Address any type discrepancies or revert changes.
