---
title: "Fix AI Question Generation Timeout & Production Environment Configuration"
type: context
status: ready
created: "2026-08-23"
tags: [context, ai, gemini, timeout, railway, pooler, production, defect]
feature: "gemini-generation-timeout-fix"
---

# Fix AI Question Generation Timeout & Production Environment Configuration Context Specification

## 1. Overview & Objective

- **Problem Statement:** 
  1. AI question generation on production (`https://api.sentinelph.tech/ai/generate-preview`) intermittently fails with HTTP 502 and error: `ApiError: Gemini request timed out or failed to connect.` (`Batch generation model call failed: HTTPException [Error]: Gemini request timed out or failed to connect.`).
  2. Root cause investigation reveals that `app/sentinel-api/src/lib/gemini/gemini.provider.ts` had a hardcoded fallback timeout of **35,000 ms (35 seconds)** (legacy serverless cap), and only checked `AI_GEMINI_TIMEOUT_MS` statically.
  3. When configured in Railway or `.env` as `AI_GEMINI_TIMEOUT` (or when `AI_GEMINI_TIMEOUT_MS=45000` was used), complex multi-page PDF analysis and high-volume question generation with passage synthesis exceeded the 35s/45s window, triggering `AbortSignal.timeout` and causing the backend to return a 502 error.
  4. The user also requested double-checking database connection pooler configurations (port 6543 vs 5432) and production DNS / port configurations.

- **Business / User Value:** 
  - Instructors can reliably generate question previews from lesson PDFs of any size without encountering sudden 502 timeouts.
  - Production deployments on Railway have robust, adaptive timeout resolution and clear database pooler isolation.

- **Success Criteria:** 
  - `GeminiProvider` dynamically resolves timeout values from `AI_GEMINI_TIMEOUT_MS`, `AI_GEMINI_TIMEOUT`, `GEMINI_TIMEOUT_MS`, or `GEMINI_TIMEOUT`.
  - Values provided in seconds (e.g. `<= 1000`) are automatically converted to milliseconds.
  - The default timeout is raised to **180s (180,000 ms)** suited for persistent Railway containers.
  - Database pooler configuration guidelines (Transaction mode 6543 vs Direct 5432) are verified and documented.
  - Unit and integration tests verify the dynamic timeout resolution and error handling.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor on `https://app.sentinelph.tech`, I want to upload full-length lecture PDFs and generate assessments without encountering `Gemini request timed out or failed to connect` errors.*
- *As a DevOps / Platform Engineer, I want environment variables like `AI_GEMINI_TIMEOUT` or `AI_GEMINI_TIMEOUT_MS` to be parsed flexibly (whether in seconds or milliseconds) so that Railway environment settings take immediate effect.*
- *As a Backend Engineer, I want the Gemini provider timeout default to align with our containerized Railway backend (180s default) rather than obsolete 35s/45s limits.*

### Functional Requirements

- [ ] **FR-01 (Flexible Dynamic Timeout Resolution):** Implement `getGeminiTimeoutMs()` in `GeminiProvider` that dynamically checks `process.env.AI_GEMINI_TIMEOUT_MS`, `process.env.AI_GEMINI_TIMEOUT`, `process.env.GEMINI_TIMEOUT_MS`, and `process.env.GEMINI_TIMEOUT` at call time.
- [ ] **FR-02 (Unit Conversion for Seconds vs Milliseconds):** If a configured timeout value is `<= 1000` (e.g. `120`, `180`, `300`), interpret it as seconds and multiply by 1000.
- [ ] **FR-03 (Railway Container Default Timeout):** Set default fallback timeout to `180_000` ms (3 minutes).
- [ ] **FR-04 (Database Pooler Verification):** Document and verify `DATABASE_URL` (using Supabase transaction pooler on port 6543 or session pooler on 5432) vs `DIRECT_URL` (direct PostgreSQL connection on port 5432 for migrations).
- [ ] **FR-05 (DNS & Port Verification):** Document and verify Cloudflare DNS records for `api.sentinelph.tech` (CNAME to `5vrsgr1c.up.railway.app` with DNS Only / grey cloud) and Railway port binding.

### Edge Cases & Failure Modes

- **Edge Case 1: Timeout specified as string in seconds (e.g., `AI_GEMINI_TIMEOUT="180"`):**
  - *Behavior:* Correctly parsed as `180_000` ms.
- **Edge Case 2: Timeout specified in milliseconds (e.g., `AI_GEMINI_TIMEOUT_MS="180000"`):**
  - *Behavior:* Correctly parsed as `180_000` ms.
- **Edge Case 3: Timeout variable missing or invalid string (e.g., `""` or `"invalid"`):**
  - *Behavior:* Safely falls back to `180_000` ms default.
- **Edge Case 4: Upstream Gemini API genuinely times out (> 180s):**
  - *Behavior:* Backend cleanly catches timeout, preserves CORS headers, and returns structured 502 JSON with error message.

---

## 3. Technical & Architectural Context

- **Affected Layers:**
  - Backend API (`app/sentinel-api/src/lib/gemini/gemini.provider.ts`)
  - Unit Tests (`app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`)
  - Database Config (`packages/db/src/db.ts`, `app/sentinel-api/.env`, `app/sentinel-api/.env.example`)
- **Key Reference Files:**
  - `app/sentinel-api/src/lib/gemini/gemini.provider.ts`
  - `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`
  - `packages/db/src/db.ts`
  - `app/sentinel-api/src/server.ts`
- **Data Model & Schema Changes:** None.
- **Security & Authorization:** No authentication or authorization boundaries altered.

---

## 4. Scope & Boundaries

- **In Scope:**
  - Updating `GeminiProvider` timeout parsing logic to support both seconds and milliseconds across all standard env var names.
  - Raising default timeout to 180s.
  - Adding unit test coverage for dynamic timeout resolution.
  - Double-checking and documenting Database Pooler (6543 vs 5432) and Production Port / DNS settings.
- **Out of Scope / Non-Goals:**
  - Modifying the prompt generation schema or Bloom's taxonomy mapping.
  - Changing frontend UI components or student exam workflows.

---

## 5. Decision Ledger & Grill Record

| Decision ID | Question / Fork | Chosen Option | Rationale & Trade-off |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Default Gemini timeout duration | **180 seconds (180,000 ms)** | Accommodates large PDFs with multi-question batches on Railway container backend while preventing indefinite hanging. |
| **DEC-02** | Timeout environment variable naming | **Support `AI_GEMINI_TIMEOUT_MS`, `AI_GEMINI_TIMEOUT`, `GEMINI_TIMEOUT_MS`, `GEMINI_TIMEOUT`** | Eliminates configuration friction and handles both seconds (`<=1000`) and milliseconds (`>1000`) transparently. |
| **DEC-03** | Dynamic vs Static Evaluation | **Dynamic evaluation at request time** | Prevents module-loading order issues where `dotenv` or runtime overrides aren't populated at static import time. |

---

## 6. Scenario Coverage Table

| Scenario ID | Description | Given / Preconditions | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SC-01** | `AI_GEMINI_TIMEOUT=180` set in Railway | Railway container running | Gemini requests use 180,000 ms timeout | Specified |
| **SC-02** | `AI_GEMINI_TIMEOUT_MS=90000` set | Backend service running | Gemini requests use 90,000 ms timeout | Specified |
| **SC-03** | No timeout env var set | Default environment | Gemini requests use 180,000 ms fallback | Specified |
| **SC-04** | Gemini API call exceeds timeout | Network/Gemini delay > timeout | Returns clean 502 with CORS headers | Specified |

---

## 7. References & External Context

- [[docs/context/August/19/railway-backend-ai-generation.md|Railway Backend Migration Context]]
- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`
- Cloudflare DNS Configuration (`api.sentinelph.tech` -> `5vrsgr1c.up.railway.app`)
