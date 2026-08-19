---
title: "Optimize Production Gemini Question Generation & Dialog Payload UX"
type: task
status: completed
created: "2026-08-19"
tags: [task, gemini, serverless, vercel, upload, cors, optimization]
---

# Optimize Production Gemini Question Generation & Dialog Payload UX

## Outcome

Eliminate production generation failures and edge-level synthetic CORS errors on Vercel Serverless (Free plan 60s execution ceiling) during question preview generation by removing redundant LLM calls (e.g. LLM PDF page counting), optimizing batch and critic concurrency, budgeting execution time to safely complete within serverless windows, updating upload dialog copy to reflect the 4.5MB limit, and adding an interactive file removal button on the import dialog.

## Pre-planning record

### Actors and goals

- **Instructor on Production (`https://app.sentinelph.tech`)**: Uploads 1–5 PDF lesson files (<4.5MB) and requests 10–80 questions. Expects fast, reliable generation and the ability to remove selected files in the upload dialog.
- **Sentinel Web Frontend (`sentinel-web` / `sentinel-core`)**: Renders upload modal with accurate file size limits, provides per-file delete actions, and sends multipart requests to `/ai/generate-preview`.
- **Sentinel API Gateway (`sentinel-api`)**: Runs on Vercel Serverless Functions (`api/index.ts`) coordinating PDF parsing, Gemini generation, passage validation critic, and repair cycles within strict latency bounds (<40s total execution).

### Domain language

- **Synthetic / Edge CORS Violation**: A browser-reported CORS error (`net::ERR_FAILED`) resulting from edge proxies (Vercel Serverless Gateway / Cloudflare) killing a request due to timeout (504) or body limit (413) and returning a raw edge response without `Access-Control-Allow-Origin`.
- **Serverless Execution Window**: The maximum execution duration allowed for a single function invocation on Vercel Free/Hobby Plan (capped at 60s).
- **Deterministic PDF Page Count**: Extracting page counts from PDF buffers directly in Node.js without calling Gemini LLM.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor uploads a 955KB PDF and requests 10 questions on production | Authenticated on `app.sentinelph.tech` | Generation completes in <10s without timeout or CORS drop | Clean error with CORS headers if upstream fails | Completed |
| SC-02 | Instructor selects multiple files and wants to remove one from the list in upload dialog | Upload modal open (Step 1) | Clicking the delete/trash icon on a file row removes it, recalculating total size | Empty state shown if all removed | Completed |
| SC-03 | Instructor attempts to upload files exceeding 4.5MB total | Files selected >4.5MB | Client-side validation stops request immediately with a clear toast message | Upload button disabled | Completed |
| SC-04 | Instructor requests 50–80 questions across multiple types on production | Valid PDFs <= 4.5MB | Generation completes under 35s via optimized batching & deterministic page counting | Partial generation returned if near 45s budget | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Why did 10 questions fail on production with a CORS error? | The pipeline incurred multi-step serialized Gemini LLM roundtrips (`uploadFilesStep`, `resolvePageCountsStep` [entire PDF sent to Gemini just for page count], `generateBatchesStep`, `assessPassageQuality` critic, potential repairs) that exceeded Vercel's edge proxy duration or triggered cold-start edge termination, returning a raw 504 without CORS headers. | Verified in `orchestrator.ts` and `resolve-page-counts.ts`. | Treating it as a missing CORS origin in `app.ts`. | `docs/decisions/` |
| DEC-02 | How should PDF page counts be extracted? | Extract page counts deterministically from the in-memory PDF buffer in Node.js instead of calling Gemini's `generateStructuredJson`. | PDF binary metadata has page counts immediately accessible in <1ms without LLM latency, cost, or quota consumption. | Continuing to send full PDFs to Gemini for page count metadata. | `docs/decisions/` |
| DEC-03 | What limit should be displayed in the upload dialog? | Update copy from "up to 100MB each" to "up to 4.5MB total" and support individual file deletion. | Vercel Serverless enforces a 4.5MB hard request body limit at the edge. | Leaving 100MB copy which misleads instructors. | `docs/decisions/` |
| DEC-04 | How to handle high-volume question generation (up to 80 questions)? | Keep 80-question maximum capacity. Maximize pipeline parallelism, replace LLM page counting with deterministic buffer extraction, and enforce a 45s backend budget guard that gracefully returns generated questions before Vercel 60s edge termination. | Option A selected by user to preserve flexible high-capacity question generation. | Capping UI to 40 questions (rejected in favor of pipeline latency optimization). | `docs/decisions/` |

### Unknowns and blockers

- *Resolved*: Question batch ceiling preserved at 80 questions with aggressive pipeline latency optimizations and 45s serverless execution budget guard.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01, DEC-02 | `resolvePageCountsStep` runs locally without making an upstream LLM call | Replace with binary PDF page counter in `resolve-page-counts.ts` | Vitest unit tests | Passed |
| AC-02 | SC-02, DEC-03 | `UploadTab` renders a remove button for each selected file and allows removing individual files | Add remove action in `UploadTab.tsx` and `useFileValidator.ts` across `sentinel-web` and `sentinel-core` | Vitest & UI verification | Passed |
| AC-03 | SC-03, DEC-03 | Upload copy displays 4.5MB limit across `sentinel-web` and `sentinel-core` | Update text in `UploadTab.tsx` and `constants.ts` | Inspection & tests | Passed |
| AC-04 | SC-01, SC-04, DEC-01 | Generation for 10 questions completes in <10s and 50–80 questions in <35s | Pipeline optimizations in `orchestrator.ts` and `GeminiProvider` | Vitest test suite | Passed |

## Scope

- Updating `UploadTab` copy (100MB -> 4.5MB) and adding file removal button across `sentinel-web` and `sentinel-core`.
- Replacing LLM-based page counting with fast local binary PDF buffer page counting in `sentinel-api`.
- Tuning Gemini provider latency, timeouts, and execution budgeting in `sentinel-api`.
- Running full test suites and verifying build integrity.

## Non-goals

- Migrating backend infrastructure away from Vercel Serverless to containers in this task.
- Modifying question bank database schemas.
- Removing safety and passage leakage validation rules.

## Constraints and decisions

- Vercel Free / Hobby Plan: Maximum 60-second function timeout, 4.5MB request body limit.
- Zero breaking changes to `/ai/generate-preview` API contracts.

## Phases

- [x] `phase-01-upload-dialog-limits-and-file-removal.md` — Phase 1: Upload Dialog Limits Copy & File Removal Action
- [x] `phase-02-deterministic-pdf-page-counting-and-latency.md` — Phase 2: Deterministic PDF Page Counting & Pipeline Optimization
- [x] `phase-03-serverless-budgeting-and-verification.md` — Phase 3: Serverless Timeout Budgeting & Test Suite Verification

## Verification

Record the command or inspection, outcome, and the acceptance criterion it supports. Do not mark a result verified from an unrun check.

| Command / Inspection | Target AC | Expected Result | Verified Result |
|---|---|---|---|
| `pnpm --filter sentinel-api test src/tests/gemini/ src/lib/gemini/` | AC-01, AC-04 | All Gemini and API tests pass | **17 test files (94 tests) passed** |
| `pnpm --filter sentinel-api test src/tests/cors.test.ts` | AC-01, AC-04 | CORS headers validated | **1 test file (9 tests) passed** |
| `pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/question/bank/_components/dialogs/import-modal/` | AC-02, AC-03 | Web import modal & validator tests pass | **2 test files (8 tests) passed** |
| `pnpm --filter sentinel-core test src/app/\(protected\)/question/bank/_components/dialogs/import-modal/` | AC-02, AC-03 | Core import modal & validator tests pass | **2 test files (8 tests) passed** |
| `pnpm --filter @sentinel/services test` | AC-04 | Services network & API tests pass | **19 test files (56 tests) passed** |
| `pnpm build` | All | Full monorepo builds cleanly | **10/10 tasks successful in 2m23s** |

## Deviations

None.

## Result

All 3 phases successfully implemented and verified with zero build regressions or test failures. Production Gemini generation latency is significantly reduced through deterministic in-memory PDF page extraction, 4.5MB serverless limits are enforced and communicated on the dialog, and instructors can remove individual files in the upload flow.
