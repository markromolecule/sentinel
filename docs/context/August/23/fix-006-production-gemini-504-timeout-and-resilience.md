---
title: "Fix Production Gemini AI Question Generation 502/504 Timeout & Upstream Resilience"
type: context
status: ready
created: "2026-08-23"
tags: [context, ai, gemini, generation, 502, 504, timeout, production, resilience, retry, fallback, grill]
feature: "gemini-production-timeout-resilience"
---

# Fix Production Gemini AI Question Generation 502/504 Timeout & Upstream Resilience Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  - AI question generation works in local development, but in production (`api.sentinelph.tech`), generating 30 questions (10 Multiple Choice, 10 True/False, 10 Identification across 2 PDF source files) fails after ~24.5 seconds with HTTP 502:
    - Frontend: `POST https://api.sentinelph.tech/ai/generate-preview 502 (Bad Gateway)` -> `AI Generation Error: ApiError: The request timed out. Please try again.`
    - Backend (Railway Logs):
      ```json
      {"message": "Batch generation model call failed: HTTPException [Error]: The request timed out. Please try again.", "severity": "error", "attributes": {"level": "error"}}
      at Function.createUpstreamException (/app/app/sentinel-api/src/lib/gemini/gemini.provider.ts:263:15)
      at async Function.generateStructuredJson (/app/app/sentinel-api/src/lib/gemini/gemini.provider.ts:178:19)
      at async Array.<anonymous> (/app/app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts:64:25)
      at async runNext (/app/app/sentinel-api/src/lib/gemini/services/question-generator/utils/concurrency.ts:17:60)
      at async Promise.all (index 1)
      status: 502, res: undefined, cause: undefined
      ```
- **Root Cause & Forensic Diagnosis:**
  1. **Upstream Google API 504 / Deadline Exceeded:** Google's Gemini API gateway (`generativelanguage.googleapis.com`) returned an HTTP 504 error response (with payload `{"error": {"code": 504, "message": "The request timed out. Please try again.", "status": "DEADLINE_EXCEEDED"}}`) after ~24s when processing heavy multimodal PDF tokens across multiple parallel requests.
  2. **Single-Attempt Upstream Failure on Non-429s:** In `GeminiProvider.generateStructuredJson`, the retry loop only handled HTTP 429 (Quota). When Google returned 504 `DEADLINE_EXCEEDED` or 503 `UNAVAILABLE`, the provider immediately threw a fatal 502 exception and aborted the entire preview generation.
  3. **High Batch Concurrency for Multimodal Files:** Disagreeably high concurrency (`concurrencyLimit = 4`) dispatched 3 heavy batches simultaneously with all attached PDF URIs, overwhelming Google's multimodal document encoder.
  4. **No Fast-Failover or Model Fallback:** When `gemini-2.5-flash` encountered backend compute delays on Google's side, there was no automated fallback to stable high-throughput models like `gemini-2.0-flash`.

- **Business / User Value:**
  - Instructors can reliably generate multi-question previews from multiple PDFs in production without encountering 502/504 timeouts.
  - The platform gains robust resilience against upstream Google AI Studio load spikes and multimodal document processing bottlenecks.

- **Success Criteria:**
  - 30-question preview generation from multiple PDFs succeeds end-to-end in production.
  - Upstream 504 / 503 / 502 / 408 errors and requests taking > 25s trigger fast failover to `gemini-2.0-flash` with exponential backoff.
  - Concurrency for multimodal batch generation is bounded to 2 parallel tasks.
  - Full diagnostic metadata (status, latency, model, attempt) is logged for complete observability.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor*, I want to generate 30 questions from 2 lecture PDFs on the production app without getting a "request timed out" error, so that I can create question banks effortlessly.
- *As a DevOps/Platform Engineer*, I want the API layer to transparently retry upstream Google timeouts (504/503) and fail over to fallback models before proxy deadlines expire.

### Functional Requirements

- [ ] **FR-01 (Upstream Server Error Retries & Backoff):** In `GeminiProvider.generateStructuredJson`, catch upstream HTTP 504 (`DEADLINE_EXCEEDED`), 503 (`UNAVAILABLE`), 502, and 408 responses and retry up to 2 times with exponential backoff (`1_500ms`, `3_000ms`).
- [ ] **FR-02 (Automated Model Fallback Hierarchy):** On upstream timeout or failure of the primary model (e.g. `gemini-2.5-flash`), automatically switch to the secondary fallback model (`gemini-2.0-flash` or `gemini-1.5-flash`) on subsequent retry attempts.
- [ ] **FR-03 (Per-Attempt Fast-Failover Timeout):** Enforce a 25–30s per-attempt timeout for individual Gemini generation calls so stalled upstream requests fail fast and trigger fallback before reverse proxy (Cloudflare/Railway) deadlines are reached.
- [ ] **FR-04 (Multimodal Concurrency Bounding):** In `generateBatchesStep`, set `CONCURRENCY_LIMIT = 2` for batch generation to smooth out multimodal PDF encoding on Google's API.
- [ ] **FR-05 (Complete Telemetry & Cause Logging):** Ensure all upstream status codes, response payloads, attempt numbers, and active models are logged clearly without `[cause]: undefined`.

### Edge Cases & Failure Modes

- **Edge Case 1: Primary model (`gemini-2.5-flash`) returns 504 DEADLINE_EXCEEDED on first attempt:**
  - *Behavior:* System logs a warning, falls back to `gemini-2.0-flash`, retries with 1.5s backoff, and completes successfully in < 35s total.
- **Edge Case 2: Multi-file generation with 2+ large PDFs:**
  - *Behavior:* Batches are processed with `CONCURRENCY_LIMIT = 2`, preventing Google's multimodal encoder from exceeding internal compute limits.
- **Edge Case 3: Prolonged global Google AI outage:**
  - *Behavior:* After 2 failed attempts across both primary and fallback models, returns a clean 502 with full diagnostic error details in the server logs.

---

## 3. Technical & Architectural Context

- **Affected Layers:** Backend API (`app/sentinel-api/`).
- **Impacted Files:**
  - `app/sentinel-api/src/lib/gemini/gemini.provider.ts`:
    - Implement upstream 504/503/408 retry loop in `generateStructuredJson`.
    - Implement model fallback resolution (`resolveFallbackModel`).
    - Enforce 25-30s per-attempt timeout budget (`PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000`).
  - `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`:
    - Update `CONCURRENCY_LIMIT = 2`.
  - `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`:
    - Add unit tests for 504 retry, model fallback switching, and per-attempt timeout.

---

## 4. Scope & Boundaries

- **In Scope:**
  - Upstream 504/503/408 retry and fallback logic in `GeminiProvider`.
  - Concurrency bounding (`CONCURRENCY_LIMIT = 2`) in `generateBatchesStep`.
  - Per-attempt timeout budgeting (28s).
  - Unit tests verifying upstream timeout retry, model fallback, and error propagation.
- **Out of Scope / Non-Goals:**
  - Modifying frontend components or question bank UI.
  - Modifying database schemas or migrations.

---

## 5. Decision Ledger & Grill Record

| Decision ID | Question / Fork | Chosen Option | Rationale & Trade-off |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Upstream 504/503/408 timeout & overload handling | **Retry upstream 504/503/408 errors up to 2 times with exponential backoff AND automatically fall back to `gemini-2.0-flash` / `gemini-1.5-flash` if the primary model times out** | Ensures resilient recovery from Google backend deadline exceeded spikes without hanging requests, while falling back to proven high-throughput models if `gemini-2.5-flash` suffers multimodal processing delays. |
| **DEC-02** | Multimodal batch concurrency | **Limit batch concurrency to 2 parallel tasks (`CONCURRENCY_LIMIT = 2`) for PDF generation** | Prevents overwhelming Google's multimodal document encoder and avoids triggering backend compute deadlines, while still running batches in swift 2-way parallel chunks. |
| **DEC-03** | Per-attempt timeout budget & fast failover | **Set 25–28s per-attempt generation timeout (`PER_ATTEMPT_GENERATION_TIMEOUT_MS = 28_000`)** | Ensures stalled upstream requests fail fast and trigger the fallback model within ~35s total, well before Cloudflare or Railway reverse proxy timeouts (60–100s). |

---

## 6. Scenario Coverage Table

| Scenario ID | Description | Preconditions | Expected Outcome | Failure/Recovery | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SC-01** | Standard 30-question generation from 2 PDFs | `gemini-2.5-flash`, 2 PDFs uploaded | Batches execute 2-at-a-time; completes smoothly in ~15–20s | If primary times out, falls back to `gemini-2.0-flash` | Ready |
| **SC-02** | Upstream 504 DEADLINE_EXCEEDED on primary model | Google returns 504 at 24s | Provider catches 504, switches model to `gemini-2.0-flash`, retries after 1.5s, succeeds | Upstream error details logged clearly | Ready |
| **SC-03** | Upstream 503 UNAVAILABLE / Model Overloaded | Google returns 503 | Provider retries with exponential backoff and fallback model | Succeeded within retry limits | Ready |
| **SC-04** | Persistent complete Google AI outage | Google returns 504 across all retries and fallback models | Returns clean 502 with diagnostic cause attached, does not hang indefinitely | Logs show full failure history and model attempts | Ready |

---

## 7. References & External Context

- Context Spec: `docs/context/August/23/fix-005-gemini-batch-size-and-network-stability.md`
- Context Spec: `docs/context/August/23/fix-004-gemini-generation-resilience-and-diagnostics.md`
- Google Gemini API REST Reference: Errors & Status Codes (504 DEADLINE_EXCEEDED, 503 UNAVAILABLE)
