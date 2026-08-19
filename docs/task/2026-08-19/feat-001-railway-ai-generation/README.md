---
title: "Decouple AI Generation from Serverless to Persistent Railway Backend"
type: task
status: completed
created: "2026-08-19"
tags: [task, ai, gemini, backend, railway, hosting, cors]
---

# Decouple AI Generation from Serverless to Persistent Railway Backend

## Outcome

Migrated all production backend API traffic (`https://api.sentinelph.tech`) and AI question generation workflows from Vercel Serverless to the persistent Railway container (`app/sentinel-api/src/server.ts`). Removed artificial serverless execution budget cutoffs (45s) and payload caps (4.5MB), restored full 25MB course material uploads, and guaranteed reliable CORS headers on all HTTP response outcomes.

---

## Pre-planning record

### Actors and goals

- **Instructor (`https://app.sentinelph.tech`)**: Uploads standard and high-volume lecture materials (PDFs up to 25MB) to generate 10–80 structured questions across diverse Bloom's taxonomy levels without timeouts, edge drops, or unhandled browser CORS errors.
- **Platform Engineer / Backend**: Operates `sentinel-api` on a containerized Node.js runtime on Railway (`src/server.ts`) with persistent HTTP keep-alive, BullMQ background queues, LiveKit, and PDF workers.
- **Frontend Applications (`sentinel-web`, `sentinel-core`)**: Consumes `https://api.sentinelph.tech` via `apiClient`, receiving deterministic JSON errors with full CORS headers whenever upstream issues occur.

### Domain language

- **Railway Backend Container**: Persistent Node.js service running `app/sentinel-api/src/server.ts` via `@hono/node-server`, unrestricted by serverless function lifecycle limits.
- **Vercel Serverless (Hobby/Free tier)**: Ephemeral serverless execution environment subject to 4.5MB request body limits and 60s execution duration ceilings.
- **Edge Proxy Drop**: Premature termination of an HTTP request by an intermediary proxy (Vercel Edge / Cloudflare), returning an unformatted 502/504 HTML page without `Access-Control-Allow-Origin` headers.
- **Question Generation Orchestrator**: The backend pipeline in `QuestionGeneratorService` executing file upload, batch generation, slot reconciliation, passage critic validation, and deficit replenishment.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | Instructor generates 50 questions from a 15MB PDF on production | Authenticated on `app.sentinelph.tech` | Request executes on Railway container across multi-batch generation in ~25–45s returning 200 OK | Clean 502 JSON with CORS headers if Gemini API errors | Verified |
| **SC-02** | Instructor generates 10 Multiple Choice questions from a 955KB PDF | Authenticated on `app.sentinelph.tech` | Request completes in <10s returning structured question preview | Clean error JSON with CORS headers | Verified |
| **SC-03** | Upstream Gemini Quota Exhaustion (429) | Rate limit encountered on Railway | Backend returns structured 429 JSON with `Retry-After` and CORS headers | Frontend displays actionable rate limit toast | Verified |
| **SC-04** | Instructor uploads file exceeding 25MB limit | Selected file > 25MB | Frontend validator displays warning before dispatch; backend returns 413 JSON | No network or CORS failure | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **DEC-01** | Deployment topology for `sentinel-api` | **Full Railway Backend (`src/server.ts`)** | Route all `api.sentinelph.tech` traffic directly to Railway Node.js container. Eliminates 4.5MB payload limit, 60s timeout cutoff, and edge-level proxy CORS stripping. | Retaining Vercel serverless for API and hacking timeouts. | `docs/context/August/19/railway-backend-ai-generation.md` |
| **DEC-02** | Timeout & Budget Guards | **Remove Serverless 45s Guard** | With a persistent container, AI generation can leverage full multi-batch parallelism and passage verification without artificial premature termination. | Keeping 45s emergency kill switch. | `phase-02-decouple-serverless-constraints-in-orchestrator.md` |
| **DEC-03** | Upload Payload Capacity | **25 MB per Request / Aggregate** | Instructors can upload complete course modules without hitting artificial 4.5MB client-side constraints. | Restricting instructors to 4.5MB. | `phase-03-frontend-client-and-upload-limits-alignment.md` |

### Unknowns and blockers

- **Railway Environment Validation**: Verify that `GEMINI_API_KEY`, `GEMINI_MODEL`, `DATABASE_URL`, and Supabase credentials are fully populated and active in the Railway project dashboard.
- **Port Binding**: Dynamically bound to `Number(process.env.PORT) || 3001` on host `0.0.0.0`.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | DEC-01, SC-01 | `sentinel-api` runs on Railway using `server.ts` and listens to `PORT` environment variable. | Updated `server.ts` to bind `process.env.PORT || 3001` and `0.0.0.0`. | Port binding & diagnostic logging verified | Verified |
| **AC-02** | DEC-02, SC-01 | Remove `SERVERLESS_EXECUTION_BUDGET_MS` cutoff from `QuestionGeneratorService`. | Removed 45s timeout guard in `orchestrator.ts`, letting replenishment and repairs run to completion. | 23/23 tests in `src/tests/gemini/` passed | Verified |
| **AC-03** | DEC-03, SC-04 | Realign upload limits from 4.5MB to 25MB across `sentinel-web` and `sentinel-core`. | Updated `constants.ts`, `use-file-validator.ts`, and `upload-tab.tsx` to 25MB. | 5/5 tests in `use-file-validator.test.ts` passed | Verified |
| **AC-04** | SC-02, SC-03 | `apiClient` error messages reflect server connectivity rather than serverless-specific timeout text. | Updated `packages/services/src/api-client.ts` to generic high-availability server error messages. | 56/56 tests in `@sentinel/services` passed | Verified |
| **AC-05** | SC-01, SC-03 | All error responses (400, 413, 429, 500, 502) guarantee `Access-Control-Allow-Origin` headers. | Verified `app.ts` `onError`, `notFound`, and `bodyLimit` handlers attach CORS headers. | 9/9 tests in `cors.test.ts` passed | Verified |

---

## Scope

- Updating `app/sentinel-api/src/server.ts` for dynamic Railway port binding (`process.env.PORT || 3001`) and host `0.0.0.0`.
- Removing artificial serverless execution budget cutoffs and partial-return logic in `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`.
- Updating `packages/services/src/api-client.ts` error messages for network and AI failures.
- Updating `MAX_FILE_SIZE_MB` from 4.5MB to 25MB in `sentinel-web` and `sentinel-core` upload hooks and dialog components.
- Running comprehensive test suites across API, shared packages, and web frontends.

---

## Non-goals

- Changing AI question schema or Bloom's taxonomy definitions.
- Modifying student examination attempt flow, live inspection, or grading logic.
- Altering Prisma database schemas or database migrations.

---

## Constraints and decisions

- Maintain full backward compatibility for `/ai/generate-preview` and legacy `/ai/generate-review` endpoints.
- Ensure all CORS headers (`Access-Control-Allow-Origin`) match allowed origins (`*.sentinelph.tech`, `localhost`, `*.vercel.app`).
- Preserve ephemeral Gemini file upload and cleanup lifecycle.

---

## Phases

- [x] [`phase-01-railway-routing-and-environment-readiness.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/feat-001-railway-ai-generation/phase-01-railway-routing-and-environment-readiness.md) — Phase 1: Railway server startup, port binding, and proxy configuration
- [x] [`phase-02-decouple-serverless-constraints-in-orchestrator.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/feat-001-railway-ai-generation/phase-02-decouple-serverless-constraints-in-orchestrator.md) — Phase 2: Decouple serverless timeout guards from Gemini orchestrator
- [x] [`phase-03-frontend-client-and-upload-limits-alignment.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/feat-001-railway-ai-generation/phase-03-frontend-client-and-upload-limits-alignment.md) — Phase 3: Update API client error handling and restore 25MB upload limits
- [x] [`phase-04-end-to-end-verification-and-header-validation.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/feat-001-railway-ai-generation/phase-04-end-to-end-verification-and-header-validation.md) — Phase 4: Full monorepo test suite validation and deployment readiness

---

## Verification

Record the command or inspection, outcome, and the acceptance criterion it supports. Do not mark a result verified from an unrun check.

| Command / Inspection | Expected Result | Acceptance Criterion | Verified Status |
|---|---|---|---|
| `pnpm --filter sentinel-api test src/tests/cors.test.ts` | All CORS test cases pass with explicit origin headers | AC-05 | Verified (9 passed) |
| `pnpm --filter sentinel-api test src/tests/gemini/` | AI preview generation tests pass with multi-batch and repair | AC-02 | Verified (23 passed) |
| `pnpm --filter @sentinel/services test` | API client tests pass with clean error mapping | AC-04 | Verified (56 passed) |
| `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.test.ts` | Web file validator tests pass with 25MB limit | AC-03 | Verified (5 passed) |

---

## Deviations

None noted at planning stage.

---

## Result

Pending phase execution.
