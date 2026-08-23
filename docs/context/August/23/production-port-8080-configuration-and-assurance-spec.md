---
title: "Production Port 8080 Configuration & Assurance"
type: context
status: ready
created: "2026-08-23"
tags: [context, railway, networking, port, production, deployment, hono, sentinel-api]
feature: "production-port-8080-assurance"
---

# Production Port 8080 Configuration & Assurance Context Specification

## 1. Overview & Objective

- **Problem Statement:** 
  The production API deployment on Railway (`sentinel-api-production` serving `api.sentinelph.tech`) routes external traffic to container port **8080** as configured in Railway Public Networking settings. We must ensure the backend application (`sentinel-api`) deterministically and reliably binds to `0.0.0.0:8080` in production without breaking local development (which defaults to port `3001`).
- **Business / User Value:** 
  Eliminates 502 Bad Gateway / Connection Refused deployment outages caused by port mismatches between Railway's ingress proxy (port 8080) and the Node.js / Hono server process.
- **Success Criteria:** 
  - The API service deterministically listens on `0.0.0.0:8080` when deployed in production on Railway.
  - Local development continues to run seamlessly on port `3001` (or custom `$PORT`).
  - Startup diagnostics log active port, bind host, environment mode, and networking validation.
  - Fail-fast or explicit fallback mechanisms prevent silent port misalignments in production.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As a DevOps / Platform Engineer, I want the production container to guarantee binding to port 8080 (or the Railway `$PORT` environment variable) so that Railway's public proxy to `api.sentinelph.tech` routes traffic without 502 errors.*
- *As a Fullstack Developer, I want local `pnpm dev` and tests to continue defaulting to port 3001 without manual environment variable overrides.*
- *As an Operator, I want clear startup logs and a health check endpoint verifying the bound port and environment status.*

### Functional Requirements

- [ ] **FR-01 (Deterministic Port Resolution):** Implement a dedicated `resolveServerPort()` helper in `app/sentinel-api/src/server.config.ts` that prioritizes `process.env.PORT`, and if in production (`NODE_ENV === 'production'`), falls back to `8080` (instead of `3001`).
- [ ] **FR-02 (Bind Host Validation):** Retain and enforce `0.0.0.0` bind host for container environments so external/proxy traffic from Railway reaches the process.
- [ ] **FR-03 (Railway Variables & Configuration):** Ensure Railway service variables document and enforce `PORT=8080` (alongside native Railway `$PORT` injection).
- [ ] **FR-04 (Startup Verification & Diagnostics):** Add structured startup logging verifying `port`, `hostname`, `NODE_ENV`, and URL base mapping.
- [ ] **FR-05 (Unit & Regression Tests):** Create unit tests in `server.config.test.ts` covering production fallback (8080), explicit custom port, invalid string handling, and development fallback (3001).

### Edge Cases & Failure Modes

- **Edge Case 1: `PORT` environment variable is omitted in production:**
  - *Behavior:* In production (`NODE_ENV === 'production'`), fallback default is `8080`, logging a diagnostic note.
- **Edge Case 2: `PORT` is passed as a string with whitespace or non-numeric characters (e.g., `" 8080 "`, `"invalid"`):**
  - *Behavior:* Trimmed and safely validated; invalid values fallback to the environment default (8080 in prod, 3001 in dev).
- **Edge Case 3: Local development running `NODE_ENV=development`:**
  - *Behavior:* Preserves default port `3001` without requiring `.env` overrides.

---

## 3. Technical & Architectural Context

- **Affected Layers:** Backend (`app/sentinel-api`), Infrastructure/Deployment (Railway).
- **Existing Files to Inspect / Modify:**
  - `app/sentinel-api/src/server.config.ts`: Modular server network and port resolution configuration.
  - `app/sentinel-api/src/server.ts`: Entry point where `@hono/node-server` `serve({ fetch, port, hostname })` is invoked.
  - `app/sentinel-api/src/server.config.test.ts`: Vitest test suite for network and port resolution.
  - `app/sentinel-api/.env.example`: Reference documentation for environment variables.
- **Railway Infrastructure Context:**
  - Service: `sentinel-api-production`
  - Public Domain: `api.sentinelph.tech` -> Port 8080
  - Private Domain: `sentinel-api.railway.internal`

---

## 4. Scope & Boundaries

- **In Scope:**
  - Code-level port resolution logic and tests in `app/sentinel-api/src/`.
  - Verification of Railway configuration and environment variables.
  - Documentation and `.env.example` updates.
- **Out of Scope / Non-Goals:**
  - Altering Next.js frontend port configurations (`sentinel-web` on Vercel/Railway).
  - Modifying external Cloudflare DNS records.

---

## 5. References & External Context

- Railway Networking Documentation (Public Networking & Custom Domains).
- Codebase: `app/sentinel-api/src/server.ts`.
