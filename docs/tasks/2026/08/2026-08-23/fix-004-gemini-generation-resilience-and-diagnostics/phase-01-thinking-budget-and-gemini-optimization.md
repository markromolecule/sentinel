---
title: "Phase 1: Thinking Budget Optimization and Generation Config"
type: phase
parent: "docs/tasks/2026/08/2026-08-23/fix-004-gemini-generation-resilience-and-diagnostics/README.md"
phase: "01"
status: completed
created: "2026-08-23"
tags: [task, phase, gemini, thinking-budget, optimization]
---

# Phase 1: Thinking Budget Optimization and Generation Config

## Objective

Optimize Gemini 2.5 Flash API calls by explicitly managing thinking token budgets during structured JSON preview generation, cutting generation latency by ~50% and preventing downstream proxy/socket timeout drops.

---

## Dependencies & Prerequisites

- Verified Gemini API behavior and support for `thinkingConfig: { thinkingBudget: 0 }`.

---

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`: Add `resolveThinkingBudget()` and inject `thinkingConfig` into `generateStructuredJson`.
- `app/sentinel-api/.env.example`: Document `AI_GEMINI_THINKING_BUDGET`.
- `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`: Added unit tests for budget resolution and request payload.

---

## Implementation Tasks

- [x] **Task 1.1:** Add `resolveThinkingBudget(model: string)` helper in `GeminiProvider` that checks `process.env.AI_GEMINI_THINKING_BUDGET` and defaults to `0` for Flash models (e.g. `gemini-2.5-flash`, `gemini-2.0-flash`).
- [x] **Task 1.2:** Update `generateStructuredJson` to conditionally include `thinkingConfig: { thinkingBudget }` when a budget is resolved.
- [x] **Task 1.3:** Update `app/sentinel-api/.env.example` to document `AI_GEMINI_THINKING_BUDGET=0` (optional override).

---

## Verification & Testing

- `pnpm --filter sentinel-api test src/lib/gemini/gemini.provider.test.ts` (12/12 passed)
- Verified `resolveThinkingBudget` defaults to `0` for Flash models, supports env overrides, and `generateStructuredJson` sends `{ thinkingConfig: { thinkingBudget: 0 } }`.
- Verified TypeScript type safety.

---

## Risks & Rollback

- **Risk:** Models that do not support `thinkingConfig` could reject the field if passed indiscriminately.
- **Mitigation:** Only apply `thinkingConfig` when the model name includes `flash` or when `AI_GEMINI_THINKING_BUDGET` is explicitly set.
