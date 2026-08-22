---
title: "Sentinel Mobile Backend API Connection & Dynamic Host Resolution"
type: context
status: approved
created: "2026-08-22"
tags: [context, mobile, expo, api-client, network, cors, environment, dynamic-host]
feature: "mobile-api-connection"
---

# Sentinel Mobile Backend API Connection & Dynamic Host Resolution Context Specification

## 1. Overview & Objective

- **Problem Statement:** 
  1. `sentinel-mobile` fails to connect to `sentinel-api` during local mobile development because the mobile application's network configuration relies on a hardcoded IP in `app/sentinel-mobile/.env` (`EXPO_PUBLIC_API_URL=http://192.168.1.202:3001`), which easily becomes stale when switching local networks or DHCP leases (e.g. current host LAN IP is `192.168.1.102`).
  2. In production container and cloud deployments, `sentinel-api` binds dynamically using `PORT` / `BIND_HOST` (defaulting to `https://api.sentinelph.tech`), while in development mobile devices requires either direct LAN IP resolution or automated Expo packager host discovery.
  3. API URL resolution in `sentinel-mobile` is currently fragmented across multiple files (`app/sentinel-mobile/lib/api-client.ts`, `features/exam/lib/mobile-telemetry-client.ts`, and `features/exam/lib/mobile-exam-session.ts`), leading to inconsistent fallbacks and ad-hoc `fetch` invocations.
  4. In `app/sentinel-api/src/app.ts`, CORS origin validation (`resolveCorsOrigin`) only accepts `localhost`, `127.0.0.1`, `.sentinelph.tech`, and `.vercel.app`. Any requests originating from private LAN IPs (such as Expo Web, mobile webviews, or local dev tools originating from `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) are rejected by CORS in development mode.

- **Business / User Value:** 
  - Mobile developers and QA testers can seamlessly launch Expo Go or standalone dev client builds on physical iOS/Android devices without experiencing silent network disconnects or having to manually rewrite `.env` every time network conditions shift.
  - Production mobile builds reliably target `https://api.sentinelph.tech` with zero risk of accidentally defaulting to unreachable `localhost:3001` endpoints.

- **Success Criteria:** 
  - `sentinel-mobile` establishes reliable HTTP and WebSocket/SSE connectivity with `sentinel-api` in development across physical devices (Expo Go / Dev Client), simulators/emulators, and Expo Web.
  - Development builds dynamically auto-detect the host machine's LAN IP from Expo's runtime context (`Constants.expoConfig?.hostUri`) when `EXPO_PUBLIC_API_URL` contains `localhost` or is not explicitly overridden.
  - Production builds (`!__DEV__`) strictly default to the canonical production API endpoint `https://api.sentinelph.tech`.
  - `sentinel-api` CORS policy safely permits private network origins (RFC 1918) in non-production environments.
  - API client instantiation and URL resolution are unified across all mobile features.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As a Mobile Developer running Expo Go on a physical device, I want the mobile app to automatically communicate with my local `sentinel-api` without manual IP re-configuration whenever my router assigns a new local IP.*
- *As a Mobile Tester on an Android Emulator, I want the app to resolve `10.0.2.2:3001` or the host LAN IP automatically so API requests succeed out of the box.*
- *As a Release Engineer compiling production standalone APK/IPA builds, I want the app to default securely to `https://api.sentinelph.tech` without exposing or requiring local development host references.*

### Functional Requirements

- [ ] **FR-01 (Dynamic API Base URL Resolver):** Create a robust, centralized `resolveApiBaseUrl()` utility in `app/sentinel-mobile` that:
  - Honors `process.env.EXPO_PUBLIC_API_URL` if set to a valid non-localhost URL.
  - In development (`__DEV__`), extracts host IP from Expo Constants (`Constants.expoConfig?.hostUri`) to construct `http://<host-ip>:3001` if `localhost` or no URL is configured.
  - Handles Android emulator loopback (`http://10.0.2.2:3001`) and iOS simulator loopback (`http://localhost:3001`) gracefully.
  - In production (`NODE_ENV === 'production'` or `!__DEV__`), defaults to `https://api.sentinelph.tech`.
- [ ] **FR-02 (Centralize API Client & Telemetry/Session Handlers):** Refactor `lib/api-client.ts`, `mobile-telemetry-client.ts`, and `mobile-exam-session.ts` to utilize the centralized URL resolver and shared `apiClient` instance instead of scattered `process.env.EXPO_PUBLIC_API_URL` reads.
- [ ] **FR-03 (Backend CORS Support for LAN Origins):** Update `resolveCorsOrigin` in `app/sentinel-api/src/app.ts` to allow private RFC 1918 IPv4 ranges (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`) during development (`NODE_ENV !== 'production'`).
- [ ] **FR-04 (Environment & Documentation Alignment):** Update `app/sentinel-mobile/.env` to reflect the active local development IP (`http://192.168.1.102:3001`), and update `app/sentinel-mobile/.env.example` with instructions on dynamic vs explicit IP configuration.
- [ ] **FR-05 (Connection Health Check & Diagnostics):** Add lightweight startup network diagnostics in `sentinel-mobile` (e.g. pinging `/` or `/health` on `sentinel-api`) with clear console feedback during development.

### Edge Cases & Failure Modes

- **Edge Case 1: Expo Go disconnected from packager / standalone offline:**
  - *Behavior:* If `hostUri` is unavailable and `EXPO_PUBLIC_API_URL` is unset, dev mode falls back to `http://localhost:3001` with a descriptive warning.
- **Edge Case 2: Custom port specified in `EXPO_PUBLIC_API_URL`:**
  - *Behavior:* Custom port (e.g. `:3001`, `:4000`) is preserved and respected.
- **Edge Case 3: Trailing slashes in API URLs:**
  - *Behavior:* URL resolver sanitizes and strips trailing slashes to prevent malformed endpoint concatenation (e.g. `http://192.168.1.102:3001//api`).
- **Edge Case 4: Android physical device vs Android emulator:**
  - *Behavior:* Physical devices use `hostUri` LAN IP; Android emulator without `hostUri` uses `10.0.2.2`.

---

## 3. Technical & Architectural Context

- **Affected Domains / Layers:**
  - Mobile App (`app/sentinel-mobile`): `lib/api-client.ts`, `lib/config/api-config.ts` (new), `features/exam/lib/mobile-telemetry-client.ts`, `features/exam/lib/mobile-exam-session.ts`, `.env`, `.env.example`.
  - Backend API (`app/sentinel-api`): `src/app.ts` (CORS origin resolution).
  - Shared Services (`packages/services`): `createApiClient` consumption.
- **Existing Files & Reference Symbols:**
  - `app/sentinel-mobile/lib/api-client.ts`
  - `app/sentinel-mobile/features/exam/lib/mobile-telemetry-client.ts`
  - `app/sentinel-mobile/features/exam/lib/mobile-exam-session.ts`
  - `app/sentinel-api/src/app.ts` -> `resolveCorsOrigin`
  - `app/sentinel-api/src/server.ts` -> `resolveBindHost`
- **Data Model & Schema Changes:**
  - None (Network and configuration refactor only).
- **Security & Authorization:**
  - Production CORS strictness is preserved (`*.sentinelph.tech`, `*.vercel.app`).
  - Private IP CORS allowance is strictly scoped to `NODE_ENV !== 'production'`.

---

## 4. Scope & Boundaries

- **In Scope:**
  - Creating `resolveApiBaseUrl()` utility in `sentinel-mobile` leveraging `expo-constants`.
  - Updating `sentinel-mobile`'s `api-client.ts`, `mobile-telemetry-client.ts`, and `mobile-exam-session.ts`.
  - Updating CORS origin validation in `sentinel-api` for non-production LAN origins.
  - Aligning `app/sentinel-mobile/.env` and `.env.example`.
  - Adding startup connection diagnostic check in development.
  - Verifying connectivity with automated and manual checks.

- **Out of Scope:**
  - Modifying Supabase authentication flows or token exchange protocols.
  - Altering production domain DNS or TLS certificate configurations.

---

## 5. Verification Strategy & Risks

- **Verification Steps:**
  1. Unit tests for `resolveApiBaseUrl` testing:
     - `__DEV__` with explicit LAN URL.
     - `__DEV__` with `localhost` and `hostUri` set (verifies dynamic IP replacement).
     - `__DEV__` on Android platform fallback (`10.0.2.2`).
     - Production environment returning `https://api.sentinelph.tech`.
  2. Unit tests for `sentinel-api` `resolveCorsOrigin` testing:
     - Allowed production domains.
     - `localhost` and `127.0.0.1`.
     - Private IP origins (`http://192.168.1.102:8081`, `http://10.0.0.5:3000`).
     - Disallowed public origins in development/production.
  3. Integration test: `sentinel-mobile` fetch requests to `sentinel-api` endpoints successfully return responses.
