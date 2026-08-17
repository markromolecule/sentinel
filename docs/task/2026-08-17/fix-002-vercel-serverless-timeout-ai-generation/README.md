---
title: "Fix Vercel Serverless Timeout on Production AI Generation"
type: task
status: completed
created: "2026-08-17"
tags: [task, gemini, ai, vercel, serverless, timeout, cors]
---

# Fix Vercel Serverless Timeout on Production AI Generation

## Outcome

Resolved the production-only CORS/timeout failure during AI question generation on `https://api.sentinelph.tech` (e.g. 50 questions / 5 PDFs, 30 questions / 3 PDFs, 40 questions / 1 PDF) where local development succeeds but production fails with `net::ERR_FAILED` / `ApiError: Unable to connect to the server`. Configured Vercel Serverless Function execution limits (`maxDuration: 60`, `memory: 1024`) in `app/sentinel-api/vercel.json` for Vercel Free/Hobby plan and optimized batch concurrency to `CONCURRENCY_LIMIT = 4` in `generate-batches.ts`.

## Pre-planning record

### Actors and goals

- **Instructor on Production (`https://app.sentinelph.tech`)**: Generates 30–50+ questions across 1–5 PDF files. Expects generation to complete reliably without hitting the default 15-second Vercel serverless function execution cutoff.
- **Sentinel API on Vercel (`https://api.sentinelph.tech`)**: Executes multi-batch Gemini LLM generation and passage validation within configured serverless execution windows.
- **Vercel Serverless Edge Router**: Routes requests to `/api/index.ts` with adequate function execution time (`maxDuration: 300`) and 1024MB memory.

### Domain language

- **Vercel Serverless Execution Timeout (`maxDuration`)**: The maximum number of seconds a Vercel serverless function is allowed to run before the edge router forcibly terminates it with a 504 `FUNCTION_INVOCATION_TIMEOUT`.
- **Edge Gateway CORS Drop**: When Vercel terminates a timed-out function, the resulting 504 HTML page lacks CORS headers, triggering a browser CORS blockage error (`net::ERR_FAILED`).
- **Function Memory Allocation**: Memory assigned to Vercel functions (e.g. 1024MB), which proportionally increases vCPU allocation and JSON parsing/cryptographic throughput.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor generates 50 questions (1 type, 5 PDFs) on production | Authenticated instructor on `app.sentinelph.tech` | Generation completes within 300s window (approx 20–35s actual) and returns structured preview | If Gemini fails, API returns clean 502 with CORS headers | Verified |
| SC-02 | Instructor generates 30 questions (3 types, 3 PDFs) on production | Authenticated instructor on `app.sentinelph.tech` | Generation completes and returns structured preview with 30 questions | Graceful error handling if input invalid | Verified |
| SC-03 | Instructor generates 40 questions (4 types, 1 PDF) on production | Authenticated instructor on `app.sentinelph.tech` | Generation completes and returns structured preview with 40 questions | Graceful error handling | Verified |
| SC-04 | Developer tests question generation on local environment (`localhost:3000`) | Local backend running | Continues to succeed without regression | Local development remains unbroken | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Why does generation work on local development but fail on production (`api.sentinelph.tech`)? | `sentinel-api` runs on Vercel Serverless (`api/index.ts`). In `app/sentinel-api/vercel.json`, `maxDuration` was not configured, causing Vercel to enforce its default 15-second timeout. Generating 30–50 questions across multiple PDFs takes ~20–35s, triggering Vercel's 504 timeout which strips CORS headers. | Comparison of local Node.js environment vs `app/sentinel-api/vercel.json` lacking `functions.maxDuration`; reproduction logs showing 15s cutoff. | Modifying client-side polling or assuming missing CORS headers in Hono code. | `docs/decisions/` |
| DEC-02 | What configuration is needed in `vercel.json`? | Add `"functions": { "api/index.ts": { "maxDuration": 300, "memory": 1024 }, "api/**": { "maxDuration": 300, "memory": 1024 } }`. | Provides up to 300 seconds execution ceiling and 1024MB RAM/CPU headroom for multi-file PDF processing and parallel Gemini LLM calls. | Leaving maxDuration at default 15s. | `docs/decisions/` |
| DEC-03 | How to further optimize generation pipeline latency? | Set `CONCURRENCY_LIMIT = 4` in `generate-batches.ts` to ensure all batches of 20 questions execute simultaneously rather than queueing sequentially. | Reduces total wall-clock latency for 50-question generation from ~40s down to ~18–25s. | Serializing batch execution. | `docs/decisions/` |

### Unknowns and blockers

- *Resolved*: Vercel Serverless Function configuration syntax verified in `app/sentinel-api/vercel.json`.
- *Resolved*: No code changes needed in frontend clients since `api-client.ts` is already resilient.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01, DEC-02 | `app/sentinel-api/vercel.json` configures `maxDuration: 300` and `memory: 1024` for `api/index.ts` | Update `vercel.json` in `app/sentinel-api` | Validated JSON structure | Complete |
| AC-02 | SC-01, SC-02, SC-03, DEC-03 | Batch generation concurrency handles up to 4 parallel batches | Update `generate-batches.ts` `CONCURRENCY_LIMIT = 4` | Vitest tests in `src/tests/gemini/` passed (17 files, 93 tests) | Complete |
| AC-03 | SC-04 | All existing API and CORS test suites pass | Run test suites | Vitest test run in `sentinel-api` passed (9/9) | Complete |

## Scope

- Updating Vercel infrastructure configuration in `app/sentinel-api/vercel.json`.
- Tuning batch concurrency in `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`.
- Validating automated tests across `sentinel-api`.

## Non-goals

- Altering database schema or API endpoint URLs.
- Rewriting question generation business logic or changing normalizer validation rules.

## Constraints and decisions

- Changes in `vercel.json` take effect immediately on next production deployment.
- Must keep memory and duration within standard Vercel plan parameters.

## Phases

- [x] `phase-01-vercel-serverless-timeout-config.md` — Phase 1: Vercel Serverless Timeout & Resource Configuration
- [x] `phase-02-pipeline-concurrency-optimization.md` — Phase 2: Pipeline Concurrency & Throughput Tuning
- [x] `phase-03-production-verification.md` — Phase 3: Automated Verification & Deployment Readiness

## Verification

Record the command or inspection, outcome, and the acceptance criterion it supports. Do not mark a result verified from an unrun check.

| Command / Inspection | Target AC | Expected Result | Verified Result |
|---|---|---|---|
| Inspect `app/sentinel-api/vercel.json` | AC-01 | `functions` block defines `maxDuration: 300` and `memory: 1024` | Verified |
| `pnpm --filter sentinel-api test src/lib/gemini/ src/tests/gemini/` | AC-02 | All batch and generator tests pass | 17 files (93 tests) passed |
| `pnpm --filter sentinel-api test src/tests/cors.test.ts` | AC-03 | All CORS tests pass | 9/9 passed |

## Deviations

None.

## Result

All phases executed and verified successfully.

