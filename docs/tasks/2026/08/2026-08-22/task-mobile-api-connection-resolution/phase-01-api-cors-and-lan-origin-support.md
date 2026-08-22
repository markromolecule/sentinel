---
title: "Phase 1: Backend CORS & LAN Origin Validation in Development"
type: task-phase
status: completed
created: "2026-08-22"
tags: [task, phase, api, cors, security, backend]
parent: "task-mobile-api-connection-resolution"
---

# Phase 1: Backend CORS & LAN Origin Validation in Development

## 1. Objective

Update `sentinel-api`'s CORS origin resolver in `app/sentinel-api/src/app.ts` so that in development (`NODE_ENV !== 'production'`), requests originating from private LAN IP addresses (RFC 1918 subnets: `192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`) and Expo dev ports are accepted.

---

## 2. Changes Required

### 2.1 Modify `app/sentinel-api/src/app.ts`

- Enhance `resolveCorsOrigin(origin?: string | null)`:
  - Keep strict white-listing for production (`ALLOWED_CORS_ORIGINS`, `*.sentinelph.tech`, `*.vercel.app`).
  - In non-production environments (`process.env.NODE_ENV !== 'production'`), allow regex matching for:
    - `http://(localhost|127.0.0.1)(:\d+)?`
    - `http://192.168.\d{1,3}\.\d{1,3}(:\d+)?`
    - `http://10.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?`
    - `http://172.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?`
    - `exp://*` or custom mobile schemes if Origin header is provided.

### 2.2 Add Unit Tests in `app/sentinel-api`

- Create / update CORS resolution tests validating:
  - Public unknown origins are rejected in production.
  - LAN IP origins are accepted in development and rejected in production.
  - Production domains (`app.sentinelph.tech`, `sentinelph.tech`) are accepted in all environments.

---

## 3. Verification Commands

```bash
pnpm --filter sentinel-api test
```
