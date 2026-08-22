---
title: "Phase 2: Mobile Environment-Aware URL Resolver & Client Centralization"
type: task-phase
status: completed
created: "2026-08-22"
tags: [task, phase, mobile, expo, dynamic-host, api-client]
parent: "task-mobile-api-connection-resolution"
---

# Phase 2: Mobile Environment-Aware URL Resolver & Client Centralization

## 1. Objective

Create a centralized API configuration module (`app/sentinel-mobile/lib/config/api-config.ts`) that intelligently resolves the backend base URL using Expo runtime constants (`Constants.expoConfig?.hostUri`), platform fallbacks (Android emulator `10.0.2.2`), environment variables (`EXPO_PUBLIC_API_URL`), and production defaults (`https://api.sentinelph.tech`). Refactor all mobile network consumers to use this centralized resolver and the unified `apiClient`.

---

## 2. Changes Required

### 2.1 Create `app/sentinel-mobile/lib/config/api-config.ts`

- Export `resolveApiBaseUrl()`:
  - Check if `process.env.EXPO_PUBLIC_API_URL` is set to an explicit valid URL. If set to a remote/LAN URL (not `localhost`), use it directly.
  - In `__DEV__` mode:
    - If `hostUri` is available from `expo-constants` (e.g. `"192.168.1.102:8081"`), extract the host IP (`"192.168.1.102"`) and construct `http://${hostIp}:3001`.
    - If running on Android emulator (`Platform.OS === 'android'` and no physical hostUri), use `http://10.0.2.2:3001`.
    - Fall back to `http://localhost:3001` with a development warning if no packager host can be detected.
  - In production (`!__DEV__`):
    - Default to `https://api.sentinelph.tech` (or explicit `EXPO_PUBLIC_API_URL` if defined in EAS production secret).
  - Strip trailing slashes and normalize.
- Export `getApiBaseUrl()` and diagnostic logger `logApiConfiguration()`.

### 2.2 Refactor `app/sentinel-mobile/lib/api-client.ts`

- Use `resolveApiBaseUrl()` for initializing `apiClient`:
  ```ts
  import { resolveApiBaseUrl } from './config/api-config';
  
  export const apiClient = createApiClient({
      baseUrl: resolveApiBaseUrl(),
      getToken: async () => { ... }
  });
  ```

### 2.3 Refactor `features/exam/lib/mobile-telemetry-client.ts` & `features/exam/lib/mobile-exam-session.ts`

- Update `mobile-exam-session.ts` to use `apiClient` or `resolveApiBaseUrl()` instead of raw un-sanitized `process.env.EXPO_PUBLIC_API_URL`.
- Ensure `mobile-telemetry-client.ts` consistently uses `resolveApiBaseUrl()`.

### 2.4 Add Unit Tests for URL Resolution

- Create `app/sentinel-mobile/lib/config/api-config.test.ts` testing:
  - Explicit custom URL override.
  - Auto-detection from `hostUri`.
  - Android emulator fallback.
  - Production fallback to `https://api.sentinelph.tech`.

---

## 3. Verification Commands

```bash
pnpm --filter sentinel-mobile test
```
