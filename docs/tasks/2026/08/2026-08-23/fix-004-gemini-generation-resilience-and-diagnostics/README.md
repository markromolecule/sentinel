---
title: "Fix Gemini Question Generation Failure & Enhance Diagnostics and Resilience"
type: task
status: completed
created: "2026-08-23"
tags: [task, gemini, generation, resilience, diagnostics, thinking-budget, timeout]
---

# Fix Gemini Question Generation Failure & Enhance Diagnostics and Resilience

## Outcome

Eliminate intermittent HTTP 502 failures during AI question generation on production by optimizing Gemini 2.5 Flash thinking token overhead (`thinkingBudget: 0`), implementing transient network retries with exponential backoff, and preserving full error diagnostics (`cause: error`) across all upstream Gemini calls.

---

## Pre-planning record

### Actors and goals

- **Instructor on Sentinel**: Wants fast (< 15–25s) and reliable question generation from multi-page PDFs without facing 502 gateway timeouts.
- **Backend / DevOps Engineer**: Wants full error transparency in logs (cause, latency, status) and resilient upstream network recovery.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | Instructor generates 30 questions from lecture PDF | Container running, `gemini-2.5-flash` | Completes in < 25s with `thinkingBudget: 0` | Fallback deficit replenishment | Complete |
| **SC-02** | Upstream socket drops on Batch 1 | Temporary network blip during fetch | Retries once after 1.5s and succeeds | Clean 502 with cause if retry fails | Complete |
| **SC-03** | Gemini API exceeds configured timeout | Unresponsive upstream (> 180s) | Throws 502 with full `TimeoutError` cause and timing metadata logged | Preserves CORS & clean error JSON | Complete |
| **SC-04** | Rate limit 429 quota reached | Google API returns 429 | Existing quota retry logic waits according to `retry-after` header | Returns 429 upstream exception | Complete |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **DEC-01** | Thinking budget for structured JSON | **Set `thinkingBudget: 0` by default for Flash models with env override (`AI_GEMINI_THINKING_BUDGET`)** | Reduces latency by ~50% (tested 13.3s -> 7.6s) and avoids proxy/socket timeouts on multi-item batches. | Unbounded thinking (costs 1,500–4,000 extra tokens per batch causing timeouts). | `README.md` |
| **DEC-02** | Transient network fetch retry | **1 retry with 1.5s backoff for network/socket errors** | Transparently recovers from socket resets without hanging client requests. | Zero retries (fails entire multi-batch run on single packet drop). | `README.md` |
| **DEC-03** | Error cause preservation in `HTTPException` | **Always attach `{ cause: error }` and log structured diagnostic metadata** | Eliminates `[cause]: undefined` in server logs, pinpointing exact Node/undici errors. | Swallowed/masked errors. | `README.md` |

### Unknowns and blockers

None. All API capabilities, thinking configs, and network error classifications have been verified against the active Google Gemini API.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | SC-01, DEC-01 | `GeminiProvider.generateStructuredJson` applies `thinkingConfig: { thinkingBudget: 0 }` for flash models | Configured in `generationConfig` | Unit test in `gemini.provider.test.ts` | Complete |
| **AC-02** | SC-02, DEC-02 | `GeminiProvider.fetchWithThrottle` automatically retries once on transient network/socket failures | 1 retry with 1.5s sleep in `fetchWithThrottle` | Mocked unit test simulating 1st failure + 2nd success | Complete |
| **AC-03** | SC-03, DEC-03 | `HTTPException(502)` from `fetchWithThrottle` includes `cause: error` and structured error logs | Pass `{ cause: error }` in constructor and add `console.error` | Unit test asserting `error.cause` is defined | Complete |
| **AC-04** | SC-01 | Multi-batch question generation runs smoothly without timeout | Updated `generateBatchesStep` with timing logs | Integration tests and test suite pass | Complete |

---

## Scope

- Configure `thinkingConfig: { thinkingBudget: 0 }` for Flash models in `GeminiProvider.generateStructuredJson`.
- Add configurable override `AI_GEMINI_THINKING_BUDGET`.
- Implement 1-attempt transient network retry in `fetchWithThrottle`.
- Preserve `{ cause: error }` on all `HTTPException` instances and add structured diagnostic logging.
- Enhance batch progress and timing logging in `generateBatchesStep`.
- Add and run comprehensive unit tests in `gemini.provider.test.ts`.

---

## Non-goals

- Modifying question generation prompt contents or Bloom's taxonomy mapping.
- Changing frontend UI components or student test runner interfaces.

---

## Constraints and decisions

- Backward-compatible with all existing environments.
- Default thinking budget is `0` for fast deterministic extraction, customizable via `AI_GEMINI_THINKING_BUDGET`.

---

## Phases

- [x] [`phase-01-thinking-budget-and-gemini-optimization.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-004-gemini-generation-resilience-and-diagnostics/phase-01-thinking-budget-and-gemini-optimization.md) — Phase 1: Thinking budget optimization and generation config
- [x] [`phase-02-transient-retry-and-error-cause-diagnostics.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-004-gemini-generation-resilience-and-diagnostics/phase-02-transient-retry-and-error-cause-diagnostics.md) — Phase 2: Transient network retries, cause chaining, and error diagnostics
- [x] [`phase-03-unit-tests-and-batch-resilience-verification.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-004-gemini-generation-resilience-and-diagnostics/phase-03-unit-tests-and-batch-resilience-verification.md) — Phase 3: Unit tests, batch timing diagnostics, and suite verification

---

## Verification

| Check / Command | Expected Outcome | Supports AC | Status |
|---|---|---|---|
| `pnpm --filter sentinel-api test src/lib/gemini/gemini.provider.test.ts` | All GeminiProvider unit tests pass (thinking budget, retry, cause chaining) | AC-01, AC-02, AC-03 | PASS (14/14 passed) |
| `pnpm --filter sentinel-api test src/lib/gemini/` | Question generator and Gemini subsystem pipeline tests pass | AC-04 | PASS (14 test files, 82/82 passed) |
| `node --stack-size=4096 ./node_modules/typescript/bin/tsc --noEmit -p app/sentinel-api/tsconfig.json` | Clean compilation with zero TypeScript errors | AC-01, AC-02, AC-03, AC-04 | PASS (0 errors) |

---

## Deviations

None.

---

## Result

All 3 phases successfully executed and verified. Gemini 2.5 Flash thinking token overhead is eliminated by default (`thinkingBudget: 0`), transient socket errors recover automatically with 1 exponential retry, all upstream exceptions preserve the root cause payload in server logs, and batch generation includes full duration diagnostics.
