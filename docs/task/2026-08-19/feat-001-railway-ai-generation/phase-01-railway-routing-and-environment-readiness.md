---
title: "Phase 1: Railway Server Startup, Port Binding, and Proxy Configuration"
type: phase
parent: "feat-001-railway-ai-generation"
phase: "01"
status: completed
created: "2026-08-19"
tags: [task, phase, railway, backend, server]
---

# Phase 1: Railway Server Startup, Port Binding, and Proxy Configuration

## Objective

Ensure `app/sentinel-api/src/server.ts` is configured for containerized deployment on Railway, dynamically binding to `process.env.PORT || 3001` and listening on host `0.0.0.0`, with health check validation and environment variable verification.

---

## Dependencies & Prerequisites

- Verified Railway deployment service for `sentinel-api`.
- Required environment variables configured in Railway: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `REDIS_URL`.

---

## Impacted Files & Components

- **`app/sentinel-api/src/server.ts`**: Update port and host binding to respect Railway runtime environment (`PORT`, `0.0.0.0`).
- **`app/sentinel-api/src/app.ts`**: Verify health endpoints (`/`, `/health`, `/heartbeat`) and CORS handling.

---

## Implementation Tasks

- [x] **Task 1.1 (Dynamic Port & Host Binding):**
  Updated `app/sentinel-api/src/server.ts` with `Number(process.env.PORT) || 3001` and `0.0.0.0` host binding.
- [x] **Task 1.2 (Health Check & Telemetry Route Verification):**
  Verified `/health` and `/` endpoints return 200 OK for Railway health checks.
- [x] **Task 1.3 (Startup Validation Logging):**
  Added diagnostic startup logging for environment, baseUrl, port, and masked `GEMINI_API_KEY` presence.

---

## Verification & Testing

- Run CORS test suite:
  ```bash
  pnpm --filter sentinel-api test src/tests/cors.test.ts
  ```
  *Result: 9 passed (9 tests total).*

---

## Risks & Rollback

- **Risk:** Port collision if hardcoded to 3001 on environments that supply a dynamic `$PORT`.
- **Mitigation:** Fallback `Number(process.env.PORT) || 3001` guarantees compatibility both locally and on container platforms.
- **Rollback:** Revert changes to `server.ts`.
