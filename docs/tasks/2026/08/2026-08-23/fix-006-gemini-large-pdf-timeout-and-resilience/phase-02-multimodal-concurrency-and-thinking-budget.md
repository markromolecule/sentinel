---
title: "Phase 2: Multimodal Concurrency Bounding (2) & Flash Thinking Budget Enforcement"
type: phase
parent: "docs/tasks/2026/08/2026-08-23/fix-006-gemini-large-pdf-timeout-and-resilience/README.md"
phase: "02"
status: completed
created: "2026-08-23"
tags: [task, phase, gemini, concurrency, batching, thinking-budget, large-pdf]
---

# Phase 2: Multimodal Concurrency Bounding (2) & Flash Thinking Budget Enforcement

## Objective

Bound question batch generation concurrency to 2 parallel tasks (`CONCURRENCY_LIMIT = 2`) in `generateBatchesStep` and ensure thinking token budgets are strictly disabled (`thinkingBudget: 0`) across all Flash models and fallbacks (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.6-flash`), preventing Google's multimodal document encoder from choking on 120-page PDFs.

---

## Dependencies & Prerequisites

- Phase 1 completed (`GeminiProvider` fallback and retry enhancements).

---

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`:
  - Set `CONCURRENCY_LIMIT = 2` (down from 4).
- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`:
  - Ensure `resolveThinkingBudget` returns `0` whenever `model.toLowerCase().includes('flash')` or when `AI_GEMINI_THINKING_BUDGET` is explicitly set to 0.
- `app/sentinel-api/.env.example`:
  - Document `AI_GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite` and `AI_GEMINI_THINKING_BUDGET=0`.

---

## Implementation Tasks

- [x] **Task 2.1:** In `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`, set `const CONCURRENCY_LIMIT = 2`.
- [x] **Task 2.2:** Verify that `resolveThinkingBudget` in `GeminiProvider` properly detects all Flash models (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.6-flash`) and injects `{ thinkingConfig: { thinkingBudget: 0 } }` into structured JSON requests.
- [x] **Task 2.3:** Document `AI_GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite` and `AI_GEMINI_THINKING_BUDGET=0` in `app/sentinel-api/.env.example`.

---

## Verification & Testing

- `pnpm --filter sentinel-api test src/lib/gemini/services/question-generator/steps/steps.test.ts src/lib/gemini/services/question-generator/orchestrator.test.ts` (PASS: 11/11 passed)
- Verified that batch tasks execute with a concurrency of 2.
- Verified that `generateStructuredJson` sends `{ thinkingConfig: { thinkingBudget: 0 } }` for both primary and fallback models.

---

## Risks & Rollback

- **Risk:** 2-way concurrency slightly increases generation time if PDFs are tiny.
- **Mitigation:** With `thinkingBudget: 0`, each 10-item batch completes in 4–6s. Two concurrent batches of 10 items finish 30 questions in ~10–14s total, which is well within acceptable user thresholds and significantly more stable for 120-page PDFs.
- **Rollback:** Revert `generate-batches.ts` to `84ca0891`.
