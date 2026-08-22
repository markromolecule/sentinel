---
title: "Resolve Sentinel Mobile API Connection, Dynamic Host Resolution & CORS Compatibility"
type: task
status: completed
created: "2026-08-22"
tags: [task, mobile, expo, network, api-client, cors, dynamic-host]
---

# Resolve Sentinel Mobile API Connection, Dynamic Host Resolution & CORS Compatibility

## Outcome

Enable robust, resilient, and zero-friction API connectivity between `sentinel-mobile` and `sentinel-api` across local development environments (Expo Go on physical devices, iOS simulators, Android emulators, Expo Web) and production builds. Eliminate fragile hardcoded IP configuration by introducing intelligent Expo packager host auto-discovery, centralizing API client instantiation, and allowing private network LAN origins in `sentinel-api` development CORS policies.

---

## Pre-planning record

### Actors and goals

- **Mobile Developer / QA**: Runs Expo Go or development client on physical devices and emulators across changing WiFi networks without manual IP edits in `.env` every time network conditions change.
- **Backend Developer**: Runs `sentinel-api` locally on `0.0.0.0:3001` or deployed environments with confidence that CORS policies support local LAN testing while remaining strictly locked down in production.
- **Production User**: Uses the mobile release connected reliably to `https://api.sentinelph.tech`.

### Domain language

- **`EXPO_PUBLIC_API_URL`**: Expo environment variable defining the target Sentinel API base URL.
- **Expo `hostUri`**: Packager host address provided at runtime by `expo-constants` (e.g. `192.168.1.102:8081`), identifying the developer's computer IP on the local subnet.
- **RFC 1918 Private Address Space**: IPv4 subnets reserved for private local networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- **`resolveCorsOrigin`**: Backend CORS middleware function determining allowed origins based on environment and pattern matching.
- **`resolveApiBaseUrl`**: Client-side utility resolving the appropriate backend URL based on environment, platform, and available runtime metadata.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Developer starts Expo Go on physical phone | Developer machine on WiFi (`192.168.1.102:3001`), `sentinel-api` running | App dynamically resolves `http://192.168.1.102:3001` via `hostUri` or `.env` and succeeds on API calls | Falls back to explicit `.env` or logs diagnostic warning | Verified |
| SC-02 | Developer tests on Android Emulator | Android emulator has virtual loopback `10.0.2.2` | App resolves host IP or `http://10.0.2.2:3001` seamlessly | Connection diagnostic reports API connectivity | Verified |
| SC-03 | Developer runs Expo Web or webview on LAN | Origin header set to `http://192.168.1.102:8081` | `sentinel-api` CORS middleware accepts private LAN origin in dev mode | Emits valid `Access-Control-Allow-Origin` header | Verified |
| SC-04 | Release engineer creates production build | `NODE_ENV=production` or `!__DEV__` | App defaults securely to `https://api.sentinelph.tech` | Never exposes or falls back to `localhost` in production | Verified |
| SC-05 | Developer changes WiFi network with stale `.env` | Stale IP in `.env` (e.g. `192.168.1.202`) | App detects `hostUri` mismatch or provides instant diagnostic log pointing to active host IP | Clear warning logged in console with current detected IP | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How should mobile dynamically resolve local API host in development? | Extract packager host from `Constants.expoConfig?.hostUri` when running in `__DEV__` and `EXPO_PUBLIC_API_URL` is unset or contains `localhost` | `expo-constants` is already installed in `sentinel-mobile` and provides reliable packager IP across Expo Go and dev clients on physical devices. | Requiring developers to manually edit `.env` on every WiFi change. | Phase 2 |
| DEC-02 | What should the production fallback URL be? | `https://api.sentinelph.tech` | Canonical production API URL defined across the monorepo. | Defaulting to `localhost:3001` in production (which crashes standalone mobile builds). | Phase 2 |
| DEC-03 | How should `sentinel-api` handle CORS for LAN origins? | Allow RFC 1918 private IPv4 addresses (`192.168.*`, `10.*`, `172.16-31.*`) strictly when `NODE_ENV !== 'production'` | Allows Expo Web and mobile webviews on LAN to communicate with backend while preserving strict production origin white-listing. | Disabling CORS checks completely or hardcoding individual developer IPs. | Phase 1 |
| DEC-04 | How should API calls be organized across `sentinel-mobile`? | Centralize all API client calls through a single `apiClient` instance powered by `resolveApiBaseUrl()`, refactoring raw `fetch` calls in telemetry and exam sessions | Prevents configuration drift and ensures all network calls benefit from auth headers, error normalization, and unified URL resolution. | Keeping duplicate `fetch` logic and independent `EXPO_PUBLIC_API_URL` reads in separate feature files. | Phase 2 |

### Unknowns and blockers

- *None.*

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-03 / DEC-03 | `sentinel-api` CORS accepts private LAN origins in non-production environments | Update `resolveCorsOrigin` in `app/sentinel-api/src/app.ts` with RFC 1918 regex guard | Automated Vitest CORS tests in `src/tests/cors.test.ts` (11 passing tests) & live curl OPTIONS check | Verified |
| AC-02 | SC-01 / SC-02 / DEC-01 | `resolveApiBaseUrl()` dynamically resolves host IP in development using `expo-constants` and respects platform defaults | Create `app/sentinel-mobile/lib/config/api-config.ts` | Unit tests in `lib/config/api-config.test.ts` (8 passing tests) | Verified |
| AC-03 | DEC-04 | `api-client.ts`, `mobile-telemetry-client.ts`, and `mobile-exam-session.ts` utilize unified URL resolver and shared client | Refactor files to import `resolveApiBaseUrl` and `apiClient` | Vitest test suite passing across `sentinel-mobile` (144 passing tests across 30 files) | Verified |
| AC-04 | SC-05 | Current `.env` and `.env.example` in `app/sentinel-mobile` updated to active host IP (`192.168.1.102:3001`) | Synchronize `.env` files with active network IP | Inspection and live curl test returning 200/401 with Access-Control headers | Verified |

---

## Scope

- **In Scope:**
  - `app/sentinel-api/src/app.ts`: CORS origin resolver for private network IPs in development.
  - `app/sentinel-mobile/lib/config/api-config.ts`: Centralized API configuration and dynamic host resolver.
  - `app/sentinel-mobile/lib/api-client.ts`: Integration with centralized URL resolver.
  - `app/sentinel-mobile/features/exam/lib/mobile-telemetry-client.ts` & `mobile-exam-session.ts`: Adoption of unified API client / base URL.
  - `app/sentinel-mobile/.env` and `.env.example`: Configuration updates for active local LAN IP.
  - Test suites and diagnostics.

- **Non-goals:**
  - Modifying Supabase authentication secrets or flows.
  - Changing API endpoint schemas or payload formats.

---

## Constraints and decisions

- Zero downtime or breaking changes for existing web applications (`sentinel-web`, `sentinel-core`, `sentinel-support`).
- Strict security isolation: private IP CORS origins are never permitted in `NODE_ENV === 'production'`.
- Production mobile builds strictly point to `https://api.sentinelph.tech`.

---

## Phases

- [x] `phase-01-api-cors-and-lan-origin-support.md` — Phase 1: Backend CORS & LAN origin validation in development
- [x] `phase-02-mobile-url-resolver-and-client-centralization.md` — Phase 2: Mobile environment-aware URL resolver & client centralization
- [x] `phase-03-environment-configuration-and-verification.md` — Phase 3: Environment configuration alignment & connectivity verification

---

## Verification

| Command / Check | Target Criterion | Outcome / Evidence | Status |
|---|---|---|---|
| `pnpm --filter sentinel-api test src/tests/cors.test.ts` | AC-01 | 11 tests passed in 23ms (including LAN IP origins, dynamic localhost, and production checks) | Verified |
| `pnpm --filter sentinel-mobile test` | AC-02, AC-03 | 144 tests passed across 30 test files | Verified |
| `curl -i -X OPTIONS http://192.168.1.102:3001/ -H "Origin: http://192.168.1.102:8081"` | AC-01, AC-04 | Returns HTTP 204 with `Access-Control-Allow-Origin: http://192.168.1.102:8081` | Verified |
| `curl -i http://192.168.1.102:3001/heartbeat -H "Origin: http://192.168.1.102:8081"` | AC-04 | Returns valid HTTP response with Access-Control headers on active LAN IP | Verified |

---

## Deviations

None.

---

## Result

All phases executed and verified. `sentinel-mobile` seamlessly connects to `sentinel-api` both dynamically via packager host auto-discovery and via configured LAN IP `http://192.168.1.102:3001`, with backend CORS properly supporting private LAN subnets in development mode.
