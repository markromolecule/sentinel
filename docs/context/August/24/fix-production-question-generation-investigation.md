---
title: "Production Question Generation Failure Investigation"
type: context
status: draft
created: "2026-08-24"
tags: [context, defect, ai, gemini, pdf, production, investigation]
feature: "production-question-generation-investigation"
---

# Production Question Generation Failure Investigation Context Specification

## 1. Overview & Objective

- **Problem Statement:** Question generation succeeds locally and for smaller production inputs, but fails in the Railway production backend for the reported large-input case: two PDFs totaling approximately 120 pages, one PDF of approximately 30 pages, and one PDF of approximately 20 pages. The exact failing request shape and production error payload are not yet captured in this record.
- **Business / User Value:** Instructors must be able to generate question previews from normal multi-document course material without production-only failures.
- **Success Criteria:** Identify the failing production boundary and provide reproducible evidence tying the failure to the API deployment path, upstream Gemini request, request duration, input limit, or another concrete cause. Do not mark the investigation ready for implementation until one failed production attempt is correlated with server/platform logs.

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an instructor, I want question generation from large multi-PDF course material to complete in production, so that I can prepare assessments from complete lessons.*
- *As a platform engineer, I want one failed request correlated across browser, API, hosting proxy, and Gemini logs, so that the root cause is distinguishable from a generic 502/504 message.*

### Functional Requirements

- [ ] Capture the exact production status, response body, elapsed time, request correlation identifier, and deployment revision for a failed large-input attempt.
- [ ] Establish whether `api.sentinelph.tech` currently routes `/ai/generate-preview` to the persistent Railway server (`src/server.ts`) or the Vercel adapter (`api/index.ts`).
- [ ] Compare production runtime environment values relevant to the path: `NODE_ENV`, `PORT`, `GEMINI_MODEL`, timeout variables, and deployment revision.
- [ ] Reproduce with a bounded matrix of file count, total pages, total bytes, requested question count, and question-type distribution.

### Edge Cases & Failure Modes

- A 60-second Vercel function/proxy cutoff may produce an edge 504/502 before the application can return JSON.
- A Gemini upstream 504/503/408 or request abort may be mapped to application HTTP 502.
- A per-file 25 MiB limit may reject a file even when total page count is acceptable.
- Large PDFs may pass upload but fail during Gemini multimodal processing or later passage-quality/replenishment calls.
- A production deployment may contain source changes that are present on the current branch but not in the serving revision.

## 3. Technical & Architectural Context

- **Affected Domains / Layers:** `app/sentinel-api` Gemini route, Gemini provider, question-generation orchestrator, deployment adapters, and production proxy/runtime configuration.
- **Existing Files & Reference Symbols:**
  - `app/sentinel-api/src/modules/integrations/gemini/gemini.controller.ts` — multipart route and per-file size limit.
  - `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts` — upload, parallel generation, page counting, normalization, quality repair, and replenishment lifecycle.
  - `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts` — batch size 10 and concurrency limit 2.
  - `app/sentinel-api/src/lib/gemini/gemini.provider.ts` — Gemini upload/generation timeout, retry, fallback, and upstream error mapping.
  - `app/sentinel-api/api/index.ts` — Vercel adapter entrypoint.
  - `app/sentinel-api/src/server.ts` — persistent Node entrypoint.
  - `app/sentinel-api/vercel.json` — Vercel function duration is configured as 60 seconds.
- **Data Model & Schema Changes:** None expected for diagnosis; no schema change is currently justified.
- **Security & Authorization:** The route requires the existing active AI-generation or assessment-management permission. Production evidence must redact PDF contents, API keys, user tokens, and sensitive prompt data.

## 4. UI/UX & Interaction Guidelines

- Preserve the distinction between an application JSON error and an unformatted proxy/browser failure. The UI message alone is insufficient evidence of the failure layer.

## 5. Scope & Boundaries

- **In Scope:** Trace and reproduce the production failure; identify the active deployment path; correlate request timing and status across layers; compare production runtime configuration with the current source contract; document root cause and confidence.
- **Out of Scope / Non-Goals:** Production code changes, schema changes, replacing Gemini, redesigning the upload UI, or declaring a fix based only on local tests or historical task documents.

## 6. References & External Context

- `docs/tasks/2026/08/2026-08-23/fix-006-gemini-large-pdf-timeout-and-resilience/README.md` — prior completed large-PDF resilience work; its production claims require current-deployment confirmation.
- `docs/tasks/2026/08/2026-08-23/fix-001-ai-generation-timeout-and-env-config/README.md` — prior timeout/environment work.
- `docs/tasks/2026/08/2026-08-23/feat-001-railway-ai-generation/README.md` — prior Railway migration record.

## Discovery State

- **Verified from source:** Per-file PDF limit is 25 MiB; generation batches contain 10 questions; batch concurrency is 2; generation attempts use a 28-second per-attempt timeout and fallback retries; Vercel configuration still declares 60-second function duration; both Railway-style and Vercel entrypoints exist.
- **Reported by user:** Local 120-page generation succeeds; smaller production cases succeed; the stated larger production cases fail.
- **Historical but not current proof:** Completed task documents claim Railway routing and large-PDF resilience verification.
- **Pasted Railway log evidence:** The failure reaches Gemini batch generation and returns HTTP 502 after upstream timeout messages. Both batch 1 and batch 2 fail in some requests. The log includes missing error causes and older stack locations. Its first relevant failures are at `2026-08-23T11:31Z`, before the current resilience commit timestamp of `2026-08-23T15:34Z`.
- **User clarification:** Railway runs the production backend. Railway is the primary production boundary under investigation.
- **User clarification:** The reported page-count cases are separate requests: (a) two PDFs totaling approximately 120 pages, (b) one PDF of approximately 30 pages, and (c) one PDF of approximately 20 pages.
- **Unknown:** Whether Railway was redeployed from the resilience commit after the pasted log window, current serving deployment revision, actual Railway timeout/model environment, PDF byte sizes, requested question count, and whether current failures still occur during batch generation. The Vercel adapter/configuration remains a repository consistency check, not an asserted production route.
