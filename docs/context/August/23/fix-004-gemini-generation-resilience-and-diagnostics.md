---
title: "Fix Gemini Question Generation Failure & Enhance Diagnostics and Resilience"
type: context
status: ready
created: "2026-08-23"
tags: [context, ai, gemini, generation, failure, timeout, diagnostics, resilience, grill]
feature: "gemini-generation-resilience-and-diagnostics"
---

# Fix Gemini Question Generation Failure & Enhance Diagnostics and Resilience Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. AI question preview generation (`/ai/generate-preview`) intermittently fails on production with HTTP 502:
     ```
     Batch generation model call failed: HTTPException [Error]: Gemini request timed out or failed to connect.
     status: 502, cause: undefined
     Question generation batch 1 failed: HTTPException [Error]: Gemini request timed out or failed to connect.
     Question generation batch 2 failed: HTTPException [Error]: Gemini request timed out or failed to connect.
     ```
  2. Root cause analysis revealed three core vulnerabilities:
     - **Thinking Token Overhead:** `gemini-2.5-flash` has reasoning/thinking tokens enabled by default, generating 1,500–4,000+ tokens of thinking per request. For 20-item batches, this inflates latency beyond 60–90+ seconds, triggering proxy and socket timeouts.
     - **Error Masking / Cause Loss:** `GeminiProvider.fetchWithThrottle` wraps every `TypeError` or timeout in `new HTTPException(502, { message: 'Gemini request timed out or failed to connect.' })` without attaching `{ cause: error }` or logging the underlying Node.js error (`ECONNRESET`, `ETIMEDOUT`, `TimeoutError`, DNS lookup failure).
     - **Zero Transient Network Retries:** Unlike 429 quota handling (which retries), any single transient socket drop or network blip in either batch immediately fails the entire generation run.

- **Business / User Value:**
  - Instructors can reliably and quickly generate multi-question assessments from lecture PDFs (~50% faster with `thinkingBudget: 0`).
  - Engineers and DevOps receive transparent, actionable logs showing exact error causes, latency, and endpoints.
  - Temporary network glitches are transparently recovered via single transient retry.

- **Success Criteria:**
  - `gemini-2.5-flash` uses `thinkingConfig: { thinkingBudget: 0 }` during structured JSON generation, slashing latency by ~50%.
  - `GeminiProvider.fetchWithThrottle` implements a 1-attempt transient network retry (1.5s backoff) for recoverable socket/network dropouts.
  - All `HTTPException` instances attach `cause: error`, and structured diagnostic warnings log endpoint, latency, and error code.
  - Existing unit and integration tests pass, with new tests covering thinking budget and transient retries.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor on Sentinel*, I want question preview generation from PDFs to be fast and resilient so I can construct exams without encountering 502 timeout errors.
- *As a Platform Engineer*, I want upstream Gemini API calls to provide complete error cause diagnostics in the server logs so that connection issues can be identified instantly.

### Functional Requirements

- [ ] **FR-01 (Thinking Budget Optimization):** In `GeminiProvider.generateStructuredJson`, include `thinkingConfig: { thinkingBudget: 0 }` for `gemini-2.5-flash` to eliminate reasoning token latency for structured JSON generation.
- [ ] **FR-02 (Transparent Error Diagnostics & Cause Chaining):** Attach `{ cause: error }` to `HTTPException(502)` in `GeminiProvider.fetchWithThrottle` and log full diagnostic metadata (URL, elapsed ms, error name/code/message) when network or timeout errors occur.
- [ ] **FR-03 (Transient Network Retry Mechanism):** In `GeminiProvider.fetchWithThrottle`, retry once with a 1.5s backoff if a network error (`TypeError: fetch failed`, `ECONNRESET`, socket hangup) occurs, before throwing 502.
- [ ] **FR-04 (Batch Logging Clarity):** In `generateBatchesStep`, log elapsed time, batch index, and detailed error messages on failure.

### Edge Cases & Failure Modes

- **Edge Case 1: Transient TCP socket reset / connection blip:**
  - *Behavior:* Automatically retried once after 1.5s backoff and succeeds without failing the user's request.
- **Edge Case 2: Genuine upstream Gemini service outage or hard timeout (> 180s):**
  - *Behavior:* Returns clean 502 JSON with CORS headers preserved, and logs the underlying `TimeoutError` or system error code.
- **Edge Case 3: Rate Limit / 429 Quota Exceeded:**
  - *Behavior:* Respects `retry-after` header and retries once up to 3,000ms delay.

---

## 3. Technical & Architectural Context

- **Affected Files:**
  - `app/sentinel-api/src/lib/gemini/gemini.provider.ts`: Add `thinkingConfig`, transient retry in `fetchWithThrottle`, and cause chaining in `createUpstreamException` and `fetchWithThrottle`.
  - `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`: Add unit tests for `thinkingBudget`, transient retry, and error cause retention.
  - `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`: Add batch timing and enhanced error reporting.

---

## 4. Scope & Boundaries

- **In Scope:**
  - `GeminiProvider` generation configuration (`thinkingConfig`).
  - Network transient retry and error cause retention in `fetchWithThrottle`.
  - Unit tests in `gemini.provider.test.ts`.
- **Out of Scope / Non-Goals:**
  - Modifying question generation prompts or schema structure.
  - Changing frontend client components or exam assessment player.

---

## 5. Decision Ledger & Grill Record

| Decision ID | Question / Fork | Chosen Option | Rationale & Trade-off |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Thinking token budget for structured JSON | **Set `thinkingConfig: { thinkingBudget: 0 }` for `gemini-2.5-flash`** | Cuts latency by ~50% (tested 13.3s -> 7.6s) and avoids proxy/socket timeouts during multi-question batch generation. |
| **DEC-02** | Handling transient network/socket failures | **Retry once with 1.5s backoff for transient network errors before throwing 502** | Recovers from transient connection resets without hanging the request or masking persistent failures. |
| **DEC-03** | Error cause preservation in `HTTPException` | **Always attach `{ cause: error }` and log structured diagnostic metadata** | Eliminates `[cause]: undefined` in server logs and enables immediate root cause diagnosis. |

---

## 6. Scenario Coverage Table

| Scenario ID | Description | Preconditions | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SC-01** | Multi-question batch generation from PDF | PDF uploaded, `gemini-2.5-flash` configured | Generation completes swiftly (< 20s) with `thinkingBudget: 0` | Ready |
| **SC-02** | Transient network drop on batch fetch | First fetch fails with `TypeError: fetch failed` | Retries once after 1.5s and succeeds | Ready |
| **SC-03** | Upstream timeout exceeded (> 180s) | Server unresponsive | Logs exact `TimeoutError` cause, returns clean 502 JSON | Ready |
| **SC-04** | Rate limit 429 quota error | Upstream returns 429 | Retries after delay specified in `retry-after` header | Ready |

---

## 7. References & External Context

- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`
- `docs/context/August/23/fix-001-ai-generation-timeout-and-env-config.md`
- Gemini API documentation for Thinking in Gemini 2.5 Flash
