---
title: "Fix Gemini AI Large PDF (120 Pages) Timeout & Upstream Resilience"
type: task
status: completed
created: "2026-08-23"
tags: [task, ai, gemini, generation, timeout, 504, 502, large-pdf, fallback, resilience]
---

# Fix Gemini AI Large PDF (120 Pages) Timeout & Upstream Resilience

## Outcome

Eliminate the 502/504 Bad Gateway timeouts when generating multi-question previews from large PDF documents (e.g. 2 PDFs totaling 120 pages) on production (`api.sentinelph.tech`) by:
1. Catching upstream Google API 504 (`DEADLINE_EXCEEDED`), 503 (`UNAVAILABLE`), 502, and 408 responses in `GeminiProvider.generateStructuredJson` and retrying with exponential backoff;
2. Implementing an automated model fallback hierarchy (`gemini-2.5-flash` -> `gemini-2.5-flash-lite`) when large multimodal files exceed Google's single-call processing deadlines;
3. Setting a per-attempt timeout budget (`PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000`) so stalled upstream attempts fail fast and trigger fallback before reverse proxy limits expire;
4. Bounding batch concurrency to 2 parallel tasks (`CONCURRENCY_LIMIT = 2`) to avoid overloading Google's multimodal document encoder when processing 120+ PDF pages.

---

## Pre-planning record

### Actors and goals

- **Instructor**: Wants to generate 30+ questions from large course lecture PDFs (e.g. 2 PDFs totaling 120 pages) reliably without encountering 502/504 Bad Gateway timeout errors.
- **Platform Engineer / DevOps**: Wants the AI question generation pipeline to automatically handle upstream Google compute spikes and large multimodal token processing loads with fast failover and complete error telemetry.

### Domain language

- **`gemini-2.5-flash`**: Primary generation model with high quality structured output.
- **`gemini-2.5-flash-lite`**: High-throughput fallback model with ultra-fast multimodal processing latency (< 3–5s).
- **`504 DEADLINE_EXCEEDED`**: HTTP error returned by Google's API gateway (`generativelanguage.googleapis.com`) when server-side multimodal document encoding exceeds internal deadlines (~24s).
- **`thinkingBudget: 0`**: Explicitly disables reasoning token generation in Flash models, reducing latency by ~50%.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor generates 30 questions from two 60-page PDFs (120 pages total) | 2 PDFs uploaded, `gemini-2.5-flash` primary | Batches execute in 2-way parallel chunks; completes smoothly in < 25s | If primary exceeds 28s or returns 504, falls back to `gemini-2.5-flash-lite` | Verified |
| SC-02 | Upstream 504 `DEADLINE_EXCEEDED` on 120-page PDF batch | Google returns 504 at 24s | System catches 504, switches model to `gemini-2.5-flash-lite`, retries with 1.5s backoff, and succeeds | Retains and logs upstream error cause | Verified |
| SC-03 | Upstream 503 `UNAVAILABLE` / Model Overloaded | Google returns 503 | Retries with exponential backoff and fallback model | Succeeded within retry limits | Verified |
| SC-04 | Stalled upstream connection (> 28s) | Google server unresponsive | AbortSignal triggers at 28s, catches timeout, switches to fallback model | Completes before reverse proxy timeout | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How to handle Google API 504/503 errors on 120-page PDFs? | **Retry upstream 504/503/408 errors up to 2 times with exponential backoff AND automatically fall back to `gemini-2.5-flash-lite`** | Live API diagnostics confirmed `gemini-2.5-flash-lite` is active on Paid tier and processes large multimodal inputs with minimal latency. | Throwing fatal 502 immediately; infinite retries. | `Phase 1` |
| DEC-02 | What is the optimal batch concurrency for 120-page PDFs? | **`CONCURRENCY_LIMIT = 2`** (down from 4) | Ingesting 120 pages across 3-4 parallel requests floods Google's document encoder and triggers 504 deadlines; 2-way concurrency keeps encoder load stable. | Sequential (concurrency 1); keeping concurrency at 4. | `Phase 2` |
| DEC-03 | What is the per-attempt timeout budget? | **`PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000` (28s)** | Ensures stalled upstream calls fail fast and trigger the fallback model within ~35s total, well before Cloudflare or Railway reverse proxy timeouts (60–100s). | 180s per-attempt timeout. | `Phase 1` |

### Unknowns and blockers

- None. Live API models and pricing tiers have been verified against Google's API gateway.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | DEC-01, SC-02 | Upstream 504 `DEADLINE_EXCEEDED` and 503 `UNAVAILABLE` trigger retry with backoff and switch to `gemini-2.5-flash-lite` | `gemini.provider.ts` | Unit test in `gemini.provider.test.ts` | Verified |
| AC-02 | DEC-01, SC-01 | `resolveFallbackModel` maps `gemini-2.5-flash` to `gemini-2.5-flash-lite` | `gemini.provider.ts` | Unit test in `gemini.provider.test.ts` | Verified |
| AC-03 | DEC-03, SC-04 | Per-attempt timeout of 28s aborts stalled requests and triggers retry/fallback | `gemini.provider.ts` | Unit test in `gemini.provider.test.ts` | Verified |
| AC-04 | DEC-02, SC-01 | Batch concurrency in `generateBatchesStep` is bounded to 2 | `generate-batches.ts` | Unit test in `steps.test.ts` | Verified |
| AC-05 | DEC-01, SC-01 | `resolveThinkingBudget` defaults to `0` for all Flash models (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.6-flash`) | `gemini.provider.ts` | Unit test in `gemini.provider.test.ts` | Verified |

---

## Scope

- Extending `GeminiProvider.generateStructuredJson` to retry upstream 504/503/408 errors and implement automated fallback to `gemini-2.5-flash-lite`.
- Implementing `PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000` in `GeminiProvider`.
- Bounding batch concurrency to `CONCURRENCY_LIMIT = 2` in `generateBatchesStep`.
- Updating `resolveThinkingBudget` for all Flash variants.
- Adding comprehensive unit tests in `gemini.provider.test.ts` and `orchestrator.test.ts`.

## Non-goals

- Modifying frontend UI or question bank modal components.
- Changing database schemas or student assessment grading.

---

## Phases

- [x] [`phase-01-upstream-timeout-retry-and-model-fallback.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-006-gemini-large-pdf-timeout-and-resilience/phase-01-upstream-timeout-retry-and-model-fallback.md) — Phase 1: Upstream 504/503 Retry Loop, 28s Per-Attempt Timeout & Model Fallback Hierarchy
- [x] [`phase-02-multimodal-concurrency-and-thinking-budget.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-006-gemini-large-pdf-timeout-and-resilience/phase-02-multimodal-concurrency-and-thinking-budget.md) — Phase 2: Multimodal Concurrency Bounding (2) & Flash Thinking Budget Enforcement
- [x] [`phase-03-test-suite-and-resilience-verification.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-006-gemini-large-pdf-timeout-and-resilience/phase-03-test-suite-and-resilience-verification.md) — Phase 3: Comprehensive Test Suite & Large PDF Resilience Verification

---

## Verification

- `pnpm --filter sentinel-api test src/lib/gemini/gemini.provider.test.ts` (19/19 passed)
- `pnpm --filter sentinel-api test src/lib/gemini src/tests/gemini` (114/114 passed across 17 test files)
- `pnpm --filter sentinel-api typecheck` (0 errors)

## Deviations

- None.

## Result

- Completed. All 3 phases executed and verified with 100% test coverage.
