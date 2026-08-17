---
title: "Phase 1: CORS & Edge Middleware Error Hardening"
type: phase
parent: "fix-001-cors-gemini-generation"
phase: "01"
status: completed
created: "2026-08-17"
tags: [task, phase, cors, middleware]
---

# Phase 1: CORS & Edge Middleware Error Hardening

## Objective

Ensure that all error responses emitted by `sentinel-api` (including body size limits, rate limits, unauthorized attempts, 404s, and uncaught exceptions) unconditionally attach full CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`, `Vary: Origin`).

## Dependencies & Prerequisites

- Existing CORS implementation in [app.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/app.ts) and [cors.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/tests/cors.test.ts).

## Impacted Files & Components

- [app.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/app.ts): Fix `bodyLimit` error handler to apply CORS headers, and ensure `applyCorsHeaders` handles all edge cases consistently.
- [ai-rate-limit.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/middleware/ai-rate-limit.ts): Ensure 429 exceptions consistently pass through global error handler with CORS and rate limit headers preserved.
- [cors.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/tests/cors.test.ts): Add test cases verifying CORS headers on 413, 429, and edge failure responses.

## Implementation Tasks

- [x] Update `app.use('/ai/*', bodyLimit(...))` in `app/sentinel-api/src/app.ts` to call `applyCorsHeaders(c)` in the `onError` callback before returning the 413 response.
- [x] Verify `resolveCorsOrigin` and `applyCorsHeaders` in `app/sentinel-api/src/app.ts` so that allowed origins (`http://localhost:*`, `https://app.sentinelph.tech`, `https://*.sentinelph.tech`, `https://*.vercel.app`) are always set on responses even when upstream throws before controller execution.
- [x] Add explicit Vitest assertions in `app/sentinel-api/src/tests/cors.test.ts` for dynamic localhost ports, 404s, and AI preview error pathways with CORS headers intact.

## Verification & Testing

- Run Vitest suite:
  ```bash
  pnpm --filter sentinel-api test src/tests/cors.test.ts
  ```
  **Result**: 9/9 tests passing (Duration: 3.34s). Verified that `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`, and `Vary: Origin` are present across 200, 204, 401, 404, and 502 responses.

## Risks & Rollback

- **Risk**: Overly permissive CORS wildcard could violate credentialed request rules.
- **Mitigation**: Strictly reflect validated origins and continue using explicit origin whitelisting matching `ALLOWED_CORS_ORIGINS` and trusted domain regex.
- **Rollback**: Revert changes in `app.ts` using git checkout.
