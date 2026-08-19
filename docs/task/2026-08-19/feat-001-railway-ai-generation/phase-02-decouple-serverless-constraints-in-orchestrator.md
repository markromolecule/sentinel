---
title: "Phase 2: Decouple Serverless Timeout Guards from Gemini Orchestrator"
type: phase
parent: "feat-001-railway-ai-generation"
phase: "02"
status: completed
created: "2026-08-19"
tags: [task, phase, ai, gemini, orchestrator]
---

# Phase 2: Decouple Serverless Timeout Guards from Gemini Orchestrator

## Objective

Remove artificial serverless execution budget cutoffs (`SERVERLESS_EXECUTION_BUDGET_MS = 45_000`) and early break-offs from `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`. Allow full replenishment loops, multi-batch parallel generation, and thorough passage quality validation to execute naturally to completion on the persistent Railway backend.

---

## Dependencies & Prerequisites

- Phase 1 completed (persistent Railway server execution).
- Upstream Gemini model (`gemini-2.5-flash` / `gemini-2.0-flash`) configured with proper timeout in `gemini.provider.ts`.

---

## Impacted Files & Components

- **`app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`**:
  - Remove `SERVERLESS_EXECUTION_BUDGET_MS = 45_000`.
  - Remove artificial budget timeout breaks in `while (reconciliation.deficits.length > 0)` and `while (assessResult.failedSlots.length > 0)`.
  - Ensure clean exceptions (`HTTPException(502)`) with descriptive reasons if Gemini fails to produce valid questions after all replenishment and repair rounds.

---

## Implementation Tasks

- [x] **Task 2.1 (Remove Serverless Budget Ceiling):**
  Removed `SERVERLESS_EXECUTION_BUDGET_MS` and premature break-offs from deficit replenishment and passage repair loops in `orchestrator.ts`.
- [x] **Task 2.2 (Preserve Max Round Guards):**
  Retained logical `MAX_DEFICIT_REPLENISHMENT_ROUNDS = 2` and `MAX_PASSAGE_REPAIR_ROUNDS = 2` to guard against unbounded recursion while letting legitimate repairs complete.
- [x] **Task 2.3 (Refine Error Messages):**
  Verified all failure branches produce clean, actionable `HTTPException` messages with CORS headers attached via `app.onError`.

---

## Verification & Testing

- Run the full Gemini route and orchestrator test suite:
  ```bash
  pnpm --filter sentinel-api test src/tests/gemini/
  ```
  *Result: 3 test files passed, 23 tests passed.*

---

## Risks & Rollback

- **Risk:** If upstream Gemini hangs indefinitely on a request.
- **Mitigation:** `GeminiProvider.GEMINI_GENERATION_TIMEOUT_MS` (default 35s per individual fetch call with abort signal) protects against orphaned network calls while allowing the orchestrator as a whole to complete multiple batches.
- **Rollback:** Revert `orchestrator.ts`.
