---
title: "Phase 1: Dynamic Timeout Resolution & Env Hardening"
type: phase
parent: "fix-001-ai-generation-timeout-and-env-config"
phase: "01"
status: completed
created: "2026-08-23"
tags: [task, phase, gemini, timeout]
---

# Phase 1: Dynamic Timeout Resolution & Env Hardening

## Objective

Refactor `GeminiProvider` in `app/sentinel-api/src/lib/gemini/gemini.provider.ts` to implement dynamic, adaptive timeout resolution supporting seconds/milliseconds across multiple standard environment variable names with a 180s default fallback.

## Dependencies & Prerequisites

- Context specification: [`docs/context/August/23/fix-001-ai-generation-timeout-and-env-config.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/23/fix-001-ai-generation-timeout-and-env-config.md)
- Master Plan: [`docs/tasks/2026/08/2026-08-23/fix-001-ai-generation-timeout-and-env-config/README.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-001-ai-generation-timeout-and-env-config/README.md)

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`: Replace static `GEMINI_GENERATION_TIMEOUT_MS` with dynamic `getGeminiTimeoutMs()`.
- `app/sentinel-api/.env.example`: Add documented entries for `AI_GEMINI_TIMEOUT_MS` and `AI_GEMINI_TIMEOUT`.

## Implementation Tasks

- [x] **Task 1.1:** Add `DEFAULT_GEMINI_GENERATION_TIMEOUT_MS = 180_000` (3 minutes) constant.
- [x] **Task 1.2:** Implement public static `getGeminiTimeoutMs()` method in `GeminiProvider`:
  - Inspect `process.env.AI_GEMINI_TIMEOUT_MS`, `process.env.AI_GEMINI_TIMEOUT`, `process.env.GEMINI_TIMEOUT_MS`, `process.env.GEMINI_TIMEOUT`.
  - Parse candidate numeric value; if $> 0$:
    - If $\le 1000$ (e.g. `120`, `180`, `300`), interpret as seconds $\rightarrow \text{value} \times 1000$.
    - If $> 1000$ (e.g. `180000`, `90000`), interpret as milliseconds.
  - Return resolved milliseconds or default to `180_000`.
- [x] **Task 1.3:** Update `GeminiProvider.fetchWithThrottle` to call `this.getGeminiTimeoutMs()` on every invocation when creating the abort timeout signal.
- [x] **Task 1.4:** Update `.env.example` in `app/sentinel-api` to explain the timeout configuration.

## Verification & Testing

- **Command executed:** `pnpm --dir app/sentinel-api test src/lib/gemini/gemini.provider.test.ts`
- **Result:** PASS (3/3 tests passed in 1.56s).

## Risks & Rollback

- **Low Risk:** Changes are strictly additive and backward compatible with existing `AI_GEMINI_TIMEOUT_MS` configurations.
- **Rollback:** Revert modifications to `gemini.provider.ts`.

