---
title: "Decouple AI Generation from Serverless to Persistent Railway Backend"
type: context
status: approved
created: "2026-08-19"
tags: [context, ai, gemini, backend, railway, vercel, cors, hosting]
feature: "gemini-question-generation-railway"
---

# Decouple AI Generation from Serverless to Persistent Railway Backend Context Specification

## 1. Overview & Objective

- **Problem Statement:** 
  1. Production AI question preview generation (`https://api.sentinelph.tech/ai/generate-preview`) invoked from the Next.js frontend (`https://app.sentinelph.tech`) repeatedly encounters `502 (Bad Gateway)` errors and browser CORS violations (`net::ERR_FAILED`, missing `Access-Control-Allow-Origin`).
  2. Prior engineering tasks attempted to squeeze AI generation into **Vercel Serverless (Hobby/Free tier)** constraints (4.5MB payload cap, 60-second execution window, unhandled edge-level proxy drops).
  3. Sentinel already has a containerized, long-running Node.js backend (`app/sentinel-api/src/server.ts`) running on **Railway** with BullMQ Redis queues, PDF workers, LiveKit, and telemetry. Migrating all `api.sentinelph.tech` traffic fully to the persistent Railway server eliminates artificial serverless timeouts and payload limits, guaranteeing reliable CORS response delivery and supporting deep multi-batch question generation.
- **Business / User Value:** 
  - Instructors can reliably upload full-length lecture PDFs (up to 25MB+) and generate 10–80 validated, leak-free questions without edge timeouts, gateway drops, or cryptic CORS error messages.
- **Success Criteria:** 
  - All `https://api.sentinelph.tech` API traffic routes to the persistent Railway container (`src/server.ts`).
  - Zero edge-level 502/504 proxy drops or missing CORS header rejections during AI generation.
  - Multi-batch Gemini question generation runs with execution windows exceeding 60s without premature proxy termination.
  - Upload file size limits on the frontend are updated from the 4.5MB serverless limit back to the 25MB container capacity.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor on `https://app.sentinelph.tech`, I want to upload full-size lecture PDFs (up to 25MB) and generate 50+ questions so that high-volume assessments are generated without proxy timeouts or CORS errors.*
- *As a Platform Engineer, I want the backend API to run on a persistent containerized Node.js process (Railway) so that long-running LLM generation, passage verification, and background workers operate in a unified, stateful-capable runtime.*
- *As a Frontend Developer, I want predictable HTTP error responses (400, 413, 429, 500, 502) with guaranteed CORS headers from the backend so that error states are displayed accurately in the UI.*

### Functional Requirements

- [ ] **FR-01 (Full Backend Route to Railway):** Route `api.sentinelph.tech` DNS and traffic entirely to the persistent Railway deployment running `src/server.ts`, deprecating Vercel serverless for API workloads.
- [ ] **FR-02 (Railway Environment & Secret Verification):** Ensure `GEMINI_API_KEY`, `GEMINI_MODEL`, `DATABASE_URL`, `SUPABASE_*`, and `REDIS_*` variables are properly configured on the Railway environment.
- [ ] **FR-03 (Remove Serverless Budget Caps):** Remove artificial serverless execution budget constraints (`SERVERLESS_EXECUTION_BUDGET_MS = 45_000`) and payload workarounds in `QuestionGeneratorService` that prematurely aborted replenishment or repair.
- [ ] **FR-04 (Frontend Upload Limit & Copy Realignment):** Realign `UploadTab` and `useFileValidator` limits from the temporary 4.5MB serverless cap back to the full 25MB–50MB supported threshold.
- [ ] **FR-05 (CORS & Proxy Header Preservation):** Ensure reverse proxy / Cloudflare / Railway edge headers correctly forward origin headers (`https://app.sentinelph.tech`) and handle long HTTP connection keep-alive (up to 300s timeout).

### Edge Cases & Failure Modes

- **Edge Case 1: Long-running generation takes > 90 seconds (high question count, large PDF):**
  - *Behavior:* Railway persistent server keeps HTTP connection open; proxy timeout configured to >= 300s. Response returns 200 OK with full CORS headers.
- **Edge Case 2: Upstream Gemini API Quota 429 / Outage:**
  - *Behavior:* Backend catches upstream error, applies `applyCorsHeaders`, and returns structured JSON (429 or 502) with error message and retry advice.
- **Edge Case 3: Container restart or memory pressure on Railway:**
  - *Behavior:* Container restarts cleanly; unhandled crashes trigger structured 500 responses rather than dropped TCP sockets.
- **Edge Case 4: File upload exceeds 25MB limit:**
  - *Behavior:* Client-side validator intercepts before upload; backend `bodyLimit` and controller enforce 25MB/50MB with explicit JSON 413 response.

---

## 3. Technical & Architectural Context

- **Affected Domains / Layers:**
  - **Backend API (`app/sentinel-api`)**:
    - `src/server.ts` (Entry point for Railway Node.js container)
    - `src/app.ts` (CORS middleware, body limits, route mounting)
    - `src/lib/gemini/services/question-generator/orchestrator.ts` (Batch orchestrator, timeout guards)
    - `src/lib/gemini/gemini.provider.ts` (Gemini API client, timeouts, model resolution)
    - `api/index.ts` & `vercel.json` (Serverless entry points to be audited/deprecated for API workloads)
  - **Frontend Web & Core (`app/sentinel-web`, `app/sentinel-core`)**:
    - `src/data/api/client.ts` (API client base URL resolution)
    - `src/lib/config.ts` (Environment configuration & API URL detection)
    - `src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/` (Upload UI & validation)
  - **Shared Services (`packages/services`)**:
    - `src/api-client.ts` (Fetch wrapper, error classification)
- **Existing Files & Reference Symbols:**
  - `app/sentinel-api/src/server.ts`
  - `app/sentinel-api/src/app.ts`
  - `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`
  - `packages/services/src/api-client.ts`
  - `app/sentinel-web/src/data/api/client.ts`
- **Data Model & Schema Changes:**
  - No database migrations required.
  - Existing `GenerateQuestionPreviewConfig` DTO and API schemas remain intact.
- **Security & Authorization:**
  - JWT authentication via Supabase Bearer tokens.
  - Role-based access control via `requireActivePermission(['ai:generate_questions', 'assessments:manage'])`.
  - Upstream Google Gemini Files API ephemeral upload and automated cleanup in `deleteUploadedFilesStep`.

---

## 4. UI/UX & Interaction Guidelines

- **Layout & Visual Design:**
  - Update `UploadTab` copy to reflect standard course document capacity: `"Upload one or more PDF lesson files up to 25MB total."`
  - Preserve individual file removal buttons (`Trash2` / `X`) so instructors can curate attachments.
- **State Management & Feedback:**
  - Clear multi-stage progress indicators or generation loaders during high-volume generation.
  - Specific, friendly toast notifications if upstream rate limits or network issues occur.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Transitioning AI preview generation architecture to the persistent Railway server.
  - Removing artificial 45s/60s serverless constraints and payload caps from `orchestrator.ts` and `use-file-validator.ts`.
  - Investigating and resolving the root cause of the current 502 Bad Gateway on `https://api.sentinelph.tech/ai/generate-preview`.
  - Updating `api-client.ts` error messages to reflect containerized backend reality rather than serverless error text.
- **Out of Scope / Non-Goals:**
  - Changing the question format, Bloom's taxonomy mapping, or question type schemas.
  - Modifying student examination attempt flow or LiveKit proctoring infrastructure.
  - Re-architecting database ORM or Prisma schemas.

---

## 6. Decision Ledger & Grill Record

| Decision ID | Question / Fork | Chosen Option | Rationale & Trade-off |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Deployment topology for `sentinel-api` | **Full Railway Backend (`src/server.ts`)** | Route all `api.sentinelph.tech` traffic directly to Railway Node.js container. Eliminates 4.5MB payload limit, 60s timeout cutoff, and edge-level proxy CORS stripping. |
| **DEC-02** | Handling AI Generation Timeouts | **Remove Serverless 45s Guard** | With a persistent container, AI generation can leverage full multi-batch parallelism and passage verification without artificial premature termination. |
| **DEC-03** | Frontend Upload Payload Limits | **25MB PDF Limit** | Instructors can upload complete course modules without hitting artificial 4.5MB client-side constraints. |

---

## 7. Scenario Coverage Table

| Scenario ID | Description | Given / Preconditions | Expected Outcome | Failure / Fallback Behavior | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SC-01** | 50 Questions generated from a 15MB PDF on production | Authenticated instructor on `app.sentinelph.tech` | Request streams/completes over persistent connection to Railway in ~25–45s returning 200 OK | Clean 502 JSON with CORS headers if Gemini API errors | Specified |
| **SC-02** | 10 Multiple Choice questions generated from a 955KB PDF | Authenticated instructor on `app.sentinelph.tech` | Request completes in <10s returning structured question preview | Clean error JSON with CORS headers | Specified |
| **SC-03** | Upstream Gemini Quota Exhaustion (429) | Rate limit encountered on Railway | Backend returns structured 429 JSON with `Retry-After` and CORS headers | Frontend displays actionable rate limit toast | Specified |
| **SC-04** | File upload exceeds 25MB limit | Selected file > 25MB | Frontend validator displays warning before dispatch; backend returns 413 JSON | No network or CORS failure | Specified |

---

## 8. References & External Context

- [[context-factory/docs/templates/Context.md|Context Template]]
- [[context-factory/skills/grill-with-docs/SKILL.md|Grill with Docs Skill]]
- [[docs/context/August/19/optimize-gemini-generation.md|Previous Vercel-Centric Optimization Context]]
- [[docs/task/2026-08-18/fix-001-persistent-cors-issue-analysis/README|CORS & Serverless Analysis]]
- [[docs/task/2026-08-17/fix-002-vercel-serverless-timeout-ai-generation/README|Serverless Timeout Investigation]]
