---
title: "Fix AI Question Generation Timeout & Production Environment Configuration"
type: task
status: completed
created: "2026-08-23"
tags: [task, ai, gemini, timeout, railway, pooler, production, defect]
---

# Fix AI Question Generation Timeout & Production Environment Configuration

## Outcome

Eliminate HTTP 502 timeouts during AI question preview generation on production (`api.sentinelph.tech`) by making `GeminiProvider` timeout parsing adaptive, resilient, and dynamically evaluated, raising the default container fallback timeout from 35s to 180s (3 minutes), and documenting production database pooler and DNS alignment.

## Pre-planning record

### Actors and goals

- **Instructor**: Uploads multi-page lesson PDFs (up to 25MB+) and generates 10–80 structured questions without encountering timeout errors.
- **Platform Engineer / DevOps**: Configures `AI_GEMINI_TIMEOUT` or `AI_GEMINI_TIMEOUT_MS` in Railway and has it immediately respected by the containerized backend.
- **Backend API**: Gracefully runs multi-batch LLM extraction over persistent HTTP connections without artificial serverless cutoff limits.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | Instructor triggers 30-question generation from a 12MB PDF | Backend on Railway, `AI_GEMINI_TIMEOUT` unset | Generation runs for ~55s; completes with 200 OK preview JSON within 180s default window | Clean 502 JSON with CORS headers if upstream genuinely fails | Planned |
| **SC-02** | DevOps sets `AI_GEMINI_TIMEOUT=180` (seconds) in Railway | Railway container running | `GeminiProvider` detects `<=1000` and converts to 180,000 ms timeout | Clean fallback if env var is malformed | Planned |
| **SC-03** | DevOps sets `AI_GEMINI_TIMEOUT_MS=90000` (ms) in Railway | Railway container running | `GeminiProvider` detects `>1000` and uses 90,000 ms timeout | Clean fallback if env var is malformed | Planned |
| **SC-04** | Upstream Gemini API hangs or exceeds configured timeout | Network/Gemini delay > timeout | Backend catches `AbortError`, applies CORS headers, and returns structured 502 JSON | Frontend displays actionable error toast | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **DEC-01** | Default container Gemini timeout | **180 seconds (180,000 ms)** | Complex PDF extraction with Bloom's taxonomy often takes 40–80s; 180s provides ample headroom on persistent Railway backend | 35s (too short, legacy Vercel limit); Infinity (risks socket leaks) | `README.md` |
| **DEC-02** | Env var naming & unit flexibility | **Support `AI_GEMINI_TIMEOUT_MS`, `AI_GEMINI_TIMEOUT`, `GEMINI_TIMEOUT_MS`, `GEMINI_TIMEOUT` with auto second/ms detection** | Prevents subtle configuration bugs when users specify seconds vs ms or omit `_MS` suffix | Strict single env var name (causes silent fallback bugs) | `README.md` |
| **DEC-03** | Dynamic vs static evaluation | **Evaluate dynamically at request time via `getGeminiTimeoutMs()`** | Prevents module-import timing issues with `dotenv` and allows hot env changes | Static module-level `const` | `README.md` |

### Unknowns and blockers

None. Source code, error trace, and DNS records have been verified.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | SC-01, DEC-01 | Default timeout in `GeminiProvider` is 180,000 ms | `GeminiProvider.getGeminiTimeoutMs()` | Vitest test suite asserting 180,000 ms fallback | Planned |
| **AC-02** | SC-02, DEC-02 | `AI_GEMINI_TIMEOUT="180"` resolves to 180,000 ms | Second-to-millisecond conversion when value $\le 1000$ | Unit test with seconds env input | Planned |
| **AC-03** | SC-03, DEC-02 | `AI_GEMINI_TIMEOUT_MS="90000"` resolves to 90,000 ms | Millisecond pass-through when value $> 1000$ | Unit test with millisecond env input | Planned |
| **AC-04** | DEC-03 | Dynamic evaluation on each request | Runtime function call rather than static module-level constant | Vitest test modifying `process.env` dynamically | Planned |
| **AC-05** | SC-04 | Safe 502 mapping on abort/timeout with CORS headers | `fetchWithThrottle` abort catch block | Vitest unit tests in `gemini.provider.test.ts` & `cors.test.ts` | Planned |

## Scope

- Updating `app/sentinel-api/src/lib/gemini/gemini.provider.ts` to implement `getGeminiTimeoutMs()`.
- Updating `app/sentinel-api/.env.example` with clear documentation for AI timeout variables.
- Adding comprehensive test coverage in `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts`.
- Running verification across all affected Gemini and CORS test suites.

## Non-goals

- Altering question prompt generation, JSON schemas, or Bloom's taxonomy mappings.
- Changing frontend UI components or student exam workflows.
- Altering database schemas or Prisma models.

## Constraints and decisions

- **Persistent Backend Reality**: Sentinel's API runs in a persistent Node.js container on Railway (`src/server.ts`), not in a 60s Vercel serverless function.
- **Backward Compatibility**: All existing environment variable names (`AI_GEMINI_TIMEOUT_MS`) continue to work seamlessly alongside new flexible aliases (`AI_GEMINI_TIMEOUT`, `GEMINI_TIMEOUT`).

## Phases

- [x] [`phase-01-gemini-provider-dynamic-timeout.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-001-ai-generation-timeout-and-env-config/phase-01-gemini-provider-dynamic-timeout.md) — Phase 1: Dynamic Timeout Resolution & Env Hardening
- [x] [`phase-02-unit-tests-and-verification.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-001-ai-generation-timeout-and-env-config/phase-02-unit-tests-and-verification.md) — Phase 2: Unit Tests & Suite Verification
- [x] [`phase-03-production-environment-readiness.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-001-ai-generation-timeout-and-env-config/phase-03-production-environment-readiness.md) — Phase 3: Production Environment Documentation & Readiness

## Verification

Commands executed:
```bash
# 1. Gemini Provider Unit Tests (PASS: 10/10 passed)
pnpm --dir app/sentinel-api test src/lib/gemini/gemini.provider.test.ts

# 2. Gemini Route & Integration Tests (PASS: 11/11 passed)
pnpm --dir app/sentinel-api test src/tests/gemini/gemini-route.test.ts

# 3. CORS and Middleware Tests (PASS: 11/11 passed)
pnpm --dir app/sentinel-api test src/tests/cors.test.ts

# 4. Question Generator Orchestrator Tests (PASS: 3/3 passed)
pnpm --dir app/sentinel-api test src/lib/gemini/services/question-generator/orchestrator.test.ts
```

All 35 tests passed successfully with 0 failures.

## Deviations

None.

## Result

- Dynamic timeout resolution in `GeminiProvider` supports `AI_GEMINI_TIMEOUT_MS`, `AI_GEMINI_TIMEOUT`, `GEMINI_TIMEOUT_MS`, and `GEMINI_TIMEOUT` with automatic second/millisecond conversion.
- Baseline container timeout raised from 35s to 180s (3 minutes).
- Full suite of 35 tests across AI generation, routing, CORS, and orchestration verified.
- Production documentation for Railway, Supabase Pooler (`DATABASE_URL`), and Cloudflare DNS completed.

