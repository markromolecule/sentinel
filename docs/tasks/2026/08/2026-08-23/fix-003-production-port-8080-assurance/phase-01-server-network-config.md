---
title: "Phase 1: Server Network Configuration and Port Resolution"
type: phase
parent: "fix-003-production-port-8080-assurance"
phase: "01"
status: completed
created: "2026-08-23"
tags: [task, phase, server, config, port, networking]
---

# Phase 1: Server Network Configuration and Port Resolution

## Objective

Extract and centralize server networking configuration into a dedicated module (`app/sentinel-api/src/server.config.ts`), ensuring `resolveServerPort()` defaults to `8080` in production (`NODE_ENV === 'production'`) and `3001` in local development, while honoring explicit `PORT` environment variables.

---

## Dependencies & Prerequisites

- Context specification: `docs/context/August/23/production-port-8080-configuration-and-assurance-spec.md`

---

## Impacted Files & Components

- `app/sentinel-api/src/server.config.ts` (NEW): Contains `resolveServerPort()`, `resolveBindHost()`, `resolveBaseUrl()`, and URL validation logic.
- `app/sentinel-api/src/server.ts` (MODIFY): Imports and uses configuration from `server.config.ts`.

---

## Implementation Tasks

- [x] **Task 1.1:** Create `app/sentinel-api/src/server.config.ts`:
  - `resolveServerPort(env?: NodeJS.ProcessEnv): number`
    - Checks `env?.PORT || process.env.PORT`
    - Trims and parses positive integer
    - If valid, returns parsed port
    - If invalid or empty:
      - If `isProduction(env)`: returns `8080`
      - Else: returns `3001`
  - `resolveBindHost(env?: NodeJS.ProcessEnv): string`
    - Validates IPv4, IPv6, localhost, or defaults to `0.0.0.0`
  - `resolveBaseUrl(port: number, env?: NodeJS.ProcessEnv): string`
    - In production returns `https://api.sentinelph.tech`
    - In development returns `http://localhost:${port}`
  - `validateProductionInviteUrls(env?: NodeJS.ProcessEnv): void`
- [x] **Task 1.2:** Update `app/sentinel-api/src/server.ts` to import `resolveServerPort`, `resolveBindHost`, `resolveBaseUrl`, and `validateProductionInviteUrls` from `./server.config`.

---

## Verification & Testing

- `app/sentinel-api/src/server.config.ts` created and verified.
- `app/sentinel-api/src/server.ts` refactored with enhanced startup diagnostic logging.

---

## Risks & Rollback

- **Risk:** None. Fallbacks strictly preserve `3001` in development while safeguarding `8080` in production.
- **Rollback:** Revert changes to `server.ts` and delete `server.config.ts`.
