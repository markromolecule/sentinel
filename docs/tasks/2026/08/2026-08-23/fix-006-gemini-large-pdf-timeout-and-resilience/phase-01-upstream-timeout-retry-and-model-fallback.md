---
title: "Phase 1: Upstream 504/503 Retry Loop, 28s Per-Attempt Timeout & Model Fallback Hierarchy"
type: phase
parent: "docs/tasks/2026/08/2026-08-23/fix-006-gemini-large-pdf-timeout-and-resilience/README.md"
phase: "01"
status: completed
created: "2026-08-23"
tags: [task, phase, gemini, timeout, 504, retry, fallback, large-pdf]
---

# Phase 1: Upstream 504/503 Retry Loop, 28s Per-Attempt Timeout & Model Fallback Hierarchy

## Objective

Enhance `GeminiProvider.generateStructuredJson` to catch upstream HTTP 504 (`DEADLINE_EXCEEDED`), 503 (`UNAVAILABLE`), 502, and 408 responses from Google's API gateway, enforce a 28s per-attempt timeout budget (`PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000`), and automatically fall back to `gemini-2.5-flash-lite` on retries when processing large 120-page PDF documents.

---

## Dependencies & Prerequisites

- Verified active model availability on Google Gemini API: `gemini-2.5-flash` and `gemini-2.5-flash-lite`.

---

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`:
  - Add `PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000` and `MAX_UPSTREAM_RETRIES = 2`.
  - Add `resolveFallbackModel(currentModel: string): string` (maps `gemini-2.5-flash` -> `gemini-2.5-flash-lite`, or checks `AI_GEMINI_FALLBACK_MODEL`).
  - Update retry loop in `generateStructuredJson` to retry on `response.status === 429 || response.status === 504 || response.status === 503 || response.status === 502 || response.status === 408`.
  - On retry attempt > 0, switch the model parameter to `resolveFallbackModel(model)`.
  - Pass the per-attempt timeout signal into `fetchWithThrottle`.
  - Preserve detailed error logs and `cause` chaining on failure.
- `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`:
  - Add unit tests for fallback model, timeout budgeting, and 504/503 retry.
- `app/sentinel-api/.env.example`:
  - Document `AI_GEMINI_FALLBACK_MODEL` and `AI_GEMINI_PER_ATTEMPT_TIMEOUT_MS`.

---

## Implementation Tasks

- [x] **Task 1.1:** Define `DEFAULT_FALLBACK_MODEL = 'gemini-2.5-flash-lite'`, `MAX_UPSTREAM_RETRIES = 2`, and `PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000` in `gemini.provider.ts`.
- [x] **Task 1.2:** Implement `resolveFallbackModel(currentModel: string): string` helper in `GeminiProvider`.
- [x] **Task 1.3:** Refactor `generateStructuredJson` retry loop to:
  1. Inspect response status (`429`, `504`, `503`, `502`, `408`);
  2. If retrying due to 504/503 or timeout, switch `activeModel = this.resolveFallbackModel(activeModel)` and log a warning;
  3. Wait with exponential backoff (`1_500ms * attempt`) before retrying.
- [x] **Task 1.4:** Update `fetchWithThrottle` to use the 28s per-attempt timeout budget for generation requests, ensuring stalled upstream requests fail fast and trigger fallback before reverse proxy (Cloudflare/Railway) limits are hit.

---

## Verification & Testing

- `pnpm --filter sentinel-api test src/lib/gemini/gemini.provider.test.ts` (18/18 tests passed)
- Verified that simulated 504 `DEADLINE_EXCEEDED` triggers retry with `gemini-2.5-flash-lite` and succeeds.
- Verified that 429 quota retries continue to function as expected.
- Verified fallback model and per-attempt timeout overrides.

---

## Risks & Rollback

- **Risk:** Fallback model (`gemini-2.5-flash-lite`) produces slightly different schema formatting.
- **Mitigation:** Both models strictly enforce the same `responseJsonSchema` and `responseMimeType: 'application/json'`.
- **Rollback:** Revert `gemini.provider.ts` to `84ca0891`.
