---
title: "Production Port 8080 Configuration & Assurance"
type: task
status: completed
created: "2026-08-23"
tags: [task, railway, networking, port, production, deployment, hono, sentinel-api]
---

# Production Port 8080 Configuration & Assurance

## Outcome

Ensure `sentinel-api` deterministically binds to port **8080** in production on Railway (matching Railway's Public Networking proxy for `api.sentinelph.tech -> Port 8080`) while seamlessly defaulting to port `3001` in local development, complete with unit test coverage, environment validation, and startup diagnostic logging.

---

## Pre-planning record

### Actors and goals

- **Platform Engineer / DevOps**: Deploys `sentinel-api` to Railway and has traffic routed reliably from `api.sentinelph.tech` through Railway's port 8080 proxy without 502 connection errors.
- **Backend Engineer**: Runs `sentinel-api` locally on `http://localhost:3001` without needing to define or override `$PORT`.
- **System Operator**: Inspects startup logs to immediately confirm the bound host, port, active environment (`NODE_ENV`), and base URL.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | Production deployment on Railway | `NODE_ENV=production`, `PORT` injected as `8080` | Server binds to `0.0.0.0:8080`; logs confirmation | Startup logs explicit warning if port binding fails | Completed |
| **SC-02** | Production deployment with missing `PORT` variable | `NODE_ENV=production`, `PORT` is unset/empty | Server defaults to port `8080` with diagnostic notice; does NOT fallback to 3001 | Prevents 502 proxy mismatch in Railway | Completed |
| **SC-03** | Local development | `NODE_ENV=development` (or unset), `PORT` unset | Server defaults to port `3001` on `0.0.0.0` | Clean zero-config local dev | Completed |
| **SC-04** | Local development with custom port | `PORT="4000"` in `.env` | Server binds to `0.0.0.0:4000` | Fallback if invalid string passed | Completed |

---

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **DEC-01** | Production default fallback port | **8080** when `NODE_ENV === 'production'` | Railway Public Networking is configured for port 8080; defaulting to 8080 in production prevents 502 outages if `$PORT` is ever missing. | Defaulting to 3001 in production (causes 502); Hard-crashing on missing `$PORT` (brittle). | `README.md` |
| **DEC-02** | Modularity and testability | **Extract network/port resolution into `server.config.ts`** | Allows comprehensive unit testing in Vitest with mocked `process.env` without starting actual HTTP listeners. | Inline in `server.ts` (harder to test with unit tests). | `README.md` |
| **DEC-03** | Local development default | **3001** when `NODE_ENV !== 'production'` | Preserves existing local developer setup across monorepo and documentation. | Forcing 8080 locally (conflicts with common local services like proxy/docker). | `README.md` |

---

### Unknowns and blockers

None. Codebase inspection, Railway settings, and Hono server entry points are verified.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | SC-01, DEC-01 | In production (`NODE_ENV === 'production'`), port defaults to `8080` if `PORT` is unset | `resolveServerPort()` in `server.config.ts` | Vitest test case with `NODE_ENV=production` & unset `PORT` | Verified |
| **AC-02** | SC-01, SC-04 | Valid `process.env.PORT` string (e.g. `"8080"`, `" 4000 "`) is parsed as number | `resolveServerPort()` sanitization & parsing | Vitest test cases with numeric strings and whitespace | Verified |
| **AC-03** | SC-03, DEC-03 | In development/test (`NODE_ENV !== 'production'`), port defaults to `3001` if `PORT` is unset | `resolveServerPort()` default branch | Vitest test case with `NODE_ENV=development` & unset `PORT` | Verified |
| **AC-04** | SC-01, SC-02 | Startup logging outputs active port, host, environment, and base URL | Enhanced diagnostics in `server.ts` | Verified with startup logs | Verified |
| **AC-05** | DEC-02 | Full test suite passes for network configuration and API build | Vitest suite `server.config.test.ts` | 19/19 unit tests passing (100%) | Verified |

---

## Scope

- Create `app/sentinel-api/src/server.config.ts` encapsulating port resolution, bind host resolution, and server URL validation.
- Update `app/sentinel-api/src/server.ts` to consume `server.config.ts`.
- Create unit tests in `app/sentinel-api/src/server.config.test.ts`.
- Update `app/sentinel-api/.env.example` to document `PORT=8080` for production Railway deployments.

---

## Non-goals

- Altering Next.js frontend port configurations (`sentinel-web`).
- Modifying Cloudflare DNS CNAME records.

---

## Phases

- [x] `phase-01-server-network-config.md` — Phase 1: Implement modular server network configuration and port resolution
- [x] `phase-02-unit-tests-and-diagnostics.md` — Phase 2: Add Vitest unit test suite and startup diagnostic logging
- [x] `phase-03-env-docs-and-railway-alignment.md` — Phase 3: Update documentation, `.env.example`, and verify build

---

## Verification

- `pnpm --dir app/sentinel-api test src/server.config.test.ts`: **19/19 passed** (100%).
- `app/sentinel-api/.env.example` verified with clear port and bind host guidelines.

---

## Result

All 3 phases completed and verified. `sentinel-api` now deterministically uses port 8080 on Railway in production while preserving port 3001 for local development.
