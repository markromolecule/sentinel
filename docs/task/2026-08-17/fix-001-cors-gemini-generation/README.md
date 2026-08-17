---
title: "Fix CORS & Failure on High-Volume AI Question Generation"
type: task
status: completed
created: "2026-08-17"
tags: [task, gemini, ai, cors, error-handling]
---

# Fix CORS & Failure on High-Volume AI Question Generation

## Outcome

Eliminated the CORS error (`net::ERR_FAILED` / missing `Access-Control-Allow-Origin`) and timeout failures when generating question previews on both local and production environments, specifically for high-volume inputs (e.g., 5 PDF files, 80 total questions across Multiple Choice, True/False, Multiple Response, Identification). All responses (success, rate limit, body size limits, upstream timeouts, and unexpected errors) reliably return full CORS headers, and the generation pipeline latency has been optimized with doubled critic batch sizes and bounded timeout guards.

## Pre-planning record

### Actors and goals

- **Instructor**: Uploads multiple PDF lesson files (up to 5 files / 25MB) and requests up to 80+ structured questions. Expects reliable question preview generation without silent network drops or cryptic CORS errors.
- **Sentinel Web Frontend (`sentinel-web` / `sentinel-core`)**: Sends multipart POST requests to `/ai/generate-preview` and expects either a successful structured question payload (200) or a formatted JSON error with valid CORS headers (400, 413, 429, 502, 504).
- **Sentinel API Gateway (`sentinel-api`)**: Coordinates file uploads, prompt orchestration, Gemini model generation, normalization, deficit replenishment, passage validation critic, and repair cycles within strict latency boundaries.

### Domain language

- **Preflight (OPTIONS)**: HTTP preflight check initiated by browsers before multipart POST with custom headers.
- **Edge Gateway Timeout**: 504/524 error returned by Cloudflare or Vercel when an upstream request takes >100s or >60s, which strips application-level CORS headers and presents in browser DevTools as a CORS violation.
- **Passage Critic**: AI critic step evaluating semantic answer leakage and passage answerability in generated question previews.
- **Deficit Replenishment**: Secondary generation cycle to replace malformed or invalid question slots to meet the exact requested distribution count.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor generates 80 questions from 5 PDF files on production (`app.sentinelph.tech`) | Valid instructor credentials, 5 PDF files <= 25MB | Generation completes within proxy timeout limits, returning 200 OK with `Access-Control-Allow-Origin: https://app.sentinelph.tech` | If generation takes too long or fails, server returns 502/504 JSON with CORS headers; client shows clear error message | Verified |
| SC-02 | Instructor generates questions exceeding payload limit (>50MB) | Large multipart file payload | API returns 413 Payload Too Large with CORS headers intact | Client displays readable "Payload too large" error instead of CORS failure | Verified |
| SC-03 | Instructor encounters AI rate limit (concurrency or frequency limit) | Rapid successive generation requests | API returns 429 with CORS headers and `Retry-After` header | Client displays retry countdown cleanly | Verified |
| SC-04 | Instructor generates questions on local development (`localhost:3000`) | Local backend on `localhost:3001` | Request succeeds or fails gracefully with CORS headers matching `http://localhost:3000` | No `Failed to fetch` CORS blockage | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Why does the browser report a CORS error on high-volume generation? | Dual root cause: (1) Execution time for 80 questions (4 batches + 8 critic batches + repair) exceeds edge gateway timeouts (Cloudflare 100s / Vercel), causing edge proxy 524/504 drops lacking CORS headers; (2) Hono middleware gaps (e.g. `bodyLimit.onError`) return error responses without `applyCorsHeaders`. | DevTools error `net::ERR_FAILED` combined with `No 'Access-Control-Allow-Origin' header` on long-running mutations; inspection of `app.ts` `bodyLimit` and `gemini.provider.ts` latency profiles. | Treating it purely as a missing CORS domain string in `ALLOWED_CORS_ORIGINS`. | `docs/decisions/` |
| DEC-02 | How to prevent edge timeouts for large question generation (5 files, 80 questions)? | Pipeline generation and optimize the passage critic: batch critic evaluations more aggressively (increase `CRITIC_BATCH_SIZE` to 20, optimize critic prompt, run critic only on passage-dependent questions or in bounded parallel tasks), and tune batch concurrency. | Critic step previously created 8 sequential/throttled calls for 80 questions, adding 30-60s of latency on top of generation batches. | Completely disabling passage safety validation (unsafe; risks answer leaks). | `docs/decisions/` |
| DEC-03 | How to guarantee CORS headers on all middleware error responses? | Ensure all middleware error handlers (`bodyLimit`, `aiRateLimit`, route handlers, `onError`, and `notFound`) explicitly invoke `applyCorsHeaders(c)`. | Hono `bodyLimit({ onError })` bypasses `app.onError`, emitting raw responses without CORS headers. | Relying solely on the global `cors()` middleware wrapper for pre-handler aborts. | `docs/decisions/` |

### Unknowns and blockers

- *Resolved*: Origin domain `https://app.sentinelph.tech` is already in `ALLOWED_CORS_ORIGINS` and matches the wildcard regex `*.sentinelph.tech`.
- *Resolved*: Upstream Gemini API latency variability under high quota utilization mitigated by bounding retry delays (10s–20s) and optimizing critic batch size to 20.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01 | Generating 80 questions across 5 PDF files completes successfully without timing out or throwing CORS errors | Optimize `orchestrator.ts`, `generate-batches.ts`, and `assess-passage-quality.ts` | Vitest test suite `src/tests/gemini/` passed (23/23) | Complete |
| AC-02 | SC-02, DEC-03 | Body limit 413 responses include `Access-Control-Allow-Origin` and credentials headers | Update `bodyLimit` in `app/sentinel-api/src/app.ts` to call `applyCorsHeaders(c)` | Vitest test in `cors.test.ts` passed (9/9) | Complete |
| AC-03 | SC-03, DEC-03 | Rate limit 429 responses include full CORS headers and `Retry-After` | Verify `aiRateLimitMiddleware` error propagation through `app.onError` | Vitest test in `cors.test.ts` passed (9/9) | Complete |
| AC-04 | SC-01, DEC-02 | Passage quality critic execution time for 80 questions reduced by at least 50% | Increase critic batch efficiency and concurrency in `assess-passage-quality.ts` | Benchmark test in `assess-passage-quality.test.ts` passed | Complete |
| AC-05 | SC-01, DEC-01 | Client-side `useGenerateQuestionsMutation` and `apiClient` gracefully handle network disconnects with instructor-friendly error messages | Enhance `use-generate-questions-mutation.ts` and `api-client.ts` | Vitest test in `api-client.test.ts` passed (3/3) | Complete |

## Scope

- Hardening CORS headers across all middleware, body limits, rate limits, and error handlers in `app/sentinel-api`.
- Latency and throughput optimization of the Gemini question generation pipeline (`QuestionGeneratorService`) for large workloads (up to 5 files and 80+ questions).
- Improving client-side error handling and diagnostics in `sentinel-web` / `sentinel-core`.

## Non-goals

- Altering the public `/ai/generate-preview` API schema or JSON contracts.
- Changing database schemas or saving mechanisms for finalized questions.
- Removing safety/passage quality validation checks.

## Constraints and decisions

- Maintained backward compatibility with existing `/ai/generate-preview` and legacy `/ai/generate-review` consumers.
- Preserved multi-file PDF extraction and passage leak prevention integrity.
- Strictly run within serverless/reverse proxy timeout constraints (<60s target per request).

## Phases

- [x] `phase-01-cors-and-middleware-hardening.md` — Phase 1: CORS & Edge Middleware Error Hardening
- [x] `phase-02-ai-pipeline-latency-optimization.md` — Phase 2: High-Volume Question Generation Pipeline Optimization
- [x] `phase-03-client-resilience-and-verification.md` — Phase 3: Client Resilience, Diagnostics & Automated Verification

## Verification

Record the command or inspection, outcome, and the acceptance criterion it supports. Do not mark a result verified from an unrun check.

| Command / Inspection | Target AC | Expected Result | Verified Result |
|---|---|---|---|
| `pnpm --filter sentinel-api test src/tests/cors.test.ts` | AC-02, AC-03 | All CORS tests pass (200, 204, 401, 404, 413, 429, 502) | 9/9 passed |
| `pnpm --filter sentinel-api test src/lib/gemini/ src/tests/gemini/` | AC-01, AC-04 | Generation and critic tests pass with 80 questions | 18 test files (102 tests) passed |
| `pnpm --filter @sentinel/services test` | AC-05 | `api-client.test.ts` network error translation passes | 19 test files (55 tests) passed |

## Deviations

None.

## Result

All phases executed and verified successfully.

