---
title: "Persistent Production CORS Analysis & Resolution on AI Question Generation"
type: task
status: completed
created: "2026-08-18"
tags: [task, cors, ai, gemini, serverless, vercel, edge]
---

# Persistent Production CORS Analysis & Resolution on AI Question Generation

## Outcome

Pinpointed the exact technical mechanisms that cause cross-origin resource sharing (CORS) errors (`net::ERR_FAILED` / `No 'Access-Control-Allow-Origin' header`) on production (`https://app.sentinelph.tech` -> `https://api.sentinelph.tech/ai/generate-preview`) during AI question generation while working locally. Defined and implemented an actionable, multi-layer architectural solution tailored specifically for the **Vercel Free (Hobby) Plan** (4.5MB payload limit, 60s execution duration ceiling).

## Pre-planning record

### Actors and goals

- **Instructor on Production (`https://app.sentinelph.tech`)**: Uploads 1–5 PDF files and requests 30–80 structured questions. Expects fast, reliable generation or descriptive user-facing errors without browser-level network drops or cryptic CORS policy violations.
- **Sentinel Web Frontend (`sentinel-web` / `sentinel-core`)**: Initiates cross-origin multipart POST requests to `https://api.sentinelph.tech/ai/generate-preview` and requires standard HTTP status codes and CORS headers on all outcomes (200, 400, 413, 429, 502, 504).
- **Sentinel API Gateway (`sentinel-api`)**: Hono-based backend running on Vercel Serverless Functions (`api/index.ts`) coordinating PDF parsing, Gemini LLM calls, passage validation critic, and deficit replenishment loops.
- **Vercel Edge Proxy / Cloudflare**: Edge ingress routing cross-origin traffic, enforcing platform payload limits (4.5MB request body limit) and serverless execution timeouts (15s–60s limit on Free/Hobby plan).

### Domain language

- **Synthetic / Edge CORS Violation**: A browser-reported CORS error (`net::ERR_FAILED`) that is not caused by missing application CORS rules, but rather by the edge infrastructure (Vercel Edge proxy or Cloudflare) terminating a connection (504 Timeout or 413 Payload Too Large) and returning a raw edge error page without `Access-Control-Allow-Origin`.
- **Vercel Serverless Function Body Limit**: A hard, non-configurable 4.5 MB request body limit enforced at the Vercel edge router before incoming requests reach Node.js.
- **Vercel Serverless Execution Ceiling (`maxDuration`)**: The maximum wall-clock runtime allocated to a serverless invocation before Vercel terminates the worker process (capped at 60s on Hobby plan).

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor uploads multiple PDFs (>4.2MB total payload) on production | Authenticated on `app.sentinelph.tech` | Client-side validation stops request before network dispatch, displaying clear size warning | No network failure or CORS drop | Verified |
| SC-02 | Instructor requests 50–80 questions spanning multi-stage Gemini critic/replenishment (>50s) on production | Authenticated on `app.sentinelph.tech` | Generation completes under 48s budget guard or returns best available questions safely | Process never killed at 60s Vercel limit | Verified |
| SC-03 | Gemini upstream returns 429 rate limit with retry-after on production | High quota utilization | API adapts retry delay to 2–3s within remaining serverless budget | Clean 429 JSON returned with CORS headers | Verified |
| SC-04 | Instructor generates questions on local development (`http://localhost:3000`) | Local Node.js server (`localhost:3001`) | Generation completes successfully without serverless edge constraints | No regression | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Why does generation fail on production with a CORS error while working locally? | Root cause is **Edge-level drops by Vercel Serverless on Free Plan**: (1) **Payload Size**: Uploads exceeding 4.5MB are terminated by Vercel Edge with a raw 413 HTML page lacking CORS headers; (2) **Execution Timeout**: Multi-batch generation + critic + replenishment exceeding Vercel's 60s maxDuration (or 15s default) triggers Vercel 504 Edge timeout without CORS headers; (3) **Upstream Retries**: A 10s–20s quota sleep consumes serverless execution budget. In local development, Node.js has no 4.5MB edge limit and no 60s proxy termination, allowing long requests to finish normally. | Confirmed Vercel Free Plan; inspection of `app/sentinel-api/vercel.json`, `app.ts`, `gemini.provider.ts`, and Vercel serverless platform specifications. | Assuming `ALLOWED_CORS_ORIGINS` is missing domains (verified: `*.sentinelph.tech` is present). | `docs/decisions/` |
| DEC-02 | How to handle multi-file uploads given Vercel Free Plan's 4.5MB edge payload limit? | Enforce client-side total payload size validation (<4.2MB) in `use-file-validator.ts` with user-friendly guidance. | Vercel Serverless enforces a hard 4.5MB unconfigurable body ceiling on Free/Hobby plans. | Relying on Hono's 50MB `bodyLimit` in serverless (never reached when Vercel blocks at edge). | `phase-01-client-payload-and-network-resilience.md` |
| DEC-03 | How to guarantee execution stays well within Vercel Free Plan's 60s duration limit? | Bound pipeline execution: reduce Gemini quota retry delay to 2–3s, reduce upstream call timeout to 35s, and enforce a 48s execution budget guard in `orchestrator.ts`. | Total wall-clock time for 80 questions with critic and repairs can exceed 60s under quota contention. | Setting `maxDuration: 300` in vercel.json (rejected because Vercel Free/Hobby plan rejects or caps values >60s). | `phase-02-serverless-timeout-budgeting-and-retry-tuning.md` |

### Unknowns and blockers

- *Resolved*: Vercel Account Plan confirmed as **Free (Hobby) Plan** (60s maxDuration limit, 4.5MB payload limit).

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01, DEC-02 | Requests with combined PDF payloads >4.2MB are caught client-side with an informative toast warning before dispatch | Implement client-side aggregate size guard in `use-file-validator.ts` | Vitest & manual tests | Verified |
| AC-02 | SC-02, DEC-01, DEC-03 | Question generation execution stays strictly under serverless platform limits (<48s execution budget) | Implement budget guard in `orchestrator.ts` & concurrency in `generate-batches.ts` | Vitest generator tests | Verified |
| AC-03 | SC-03, DEC-01, DEC-03 | Gemini rate limit retries in serverless are bounded to 2–3s to avoid edge timeout cascades | Tune `resolveQuotaRetryDelayMs` in `GeminiProvider` | Vitest unit tests | Verified |
| AC-04 | SC-04, DEC-01 | Local development workflows remain fully backward compatible | Maintain Hono route contracts | Vitest test suite | Verified |

## Scope

- In-depth architectural analysis and documentation of the production CORS issue on Vercel Free Plan.
- Identifying edge proxy limits (Vercel 4.5MB payload, Vercel 15s/60s timeout, Cloudflare 100s timeout).
- Pinpointing Hono/Gemini pipeline bottlenecks and edge error header drops.
- Implementing client-side payload guards and serverless execution budget protection.

## Non-goals

- Altering database schema or user permissions.
- Disabling passage safety validation.

## Constraints and decisions

- Vercel Free (Hobby) plan limits: maximum 60s function duration, 4.5MB payload ceiling.
- Must preserve multi-file PDF extraction and passage leak prevention integrity.

## Phases

- [x] `phase-01-client-payload-and-network-resilience.md` — Phase 1: Client-Side Payload & Network Resilience
- [x] `phase-02-serverless-timeout-budgeting-and-retry-tuning.md` — Phase 2: Serverless Timeout Budgeting & Retry Tuning
- [x] `phase-03-automated-verification-and-test-suites.md` — Phase 3: Automated Verification & Test Suites

## Verification

Record the command or inspection, outcome, and the acceptance criterion it supports. Do not mark a result verified from an unrun check.

| Command / Inspection | Target AC | Expected Result | Verified Result |
|---|---|---|---|
| Code inspection of `app.ts` & `vercel.json` | AC-01, AC-02 | Identify edge limits vs application limits | Verified |
| `pnpm --filter sentinel-api test src/tests/cors.test.ts` | AC-04 | All application CORS tests pass | 9/9 passed |
| `pnpm --filter sentinel-api test src/lib/gemini/ src/tests/gemini/` | AC-02, AC-03 | All Gemini tests pass | 93/93 passed |
| `pnpm --filter @sentinel/services test` | AC-01 | All services tests pass | 56/56 passed |
| `pnpm build` | AC-04 | Full workspace builds successfully | 10/10 successful |

## Deviations

None.

## Result

All phases executed and verified successfully. Zero regressions.

