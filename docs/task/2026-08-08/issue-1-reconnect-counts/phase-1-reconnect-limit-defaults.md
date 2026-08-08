# Issue 1 - Phase 1: Reconnect Limit Defaults in Query Services

**Goal:** Ensure backend lobby, entitlement, and monitoring services fall back to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts` when `max_reconnect_attempts` is null or unconfigured.

## Tasks

- [ ] In `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts`:
  - Import `DEFAULT_EXAMINATION_GLOBAL_SETTINGS` from `@sentinel/shared/constants`.
  - Fallback `maxReconnectAttempts` to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts` when `examConfiguration?.max_reconnect_attempts` is null or undefined.
  - Add JSDoc to `getWaitingList()`.
- [ ] In `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.ts`:
  - Fallback `maxReconnectAttempts` to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts` when `exam.max_reconnect_attempts` is null or undefined.
- [ ] In `app/sentinel-api/src/modules/examination/access/data/entitlements.repository.ts` & `evaluate-student-exam-eligibility.service.ts`:
  - Resolve `maxReconnectAttempts` with global fallback so `runtimeAccess` receives proper `totalReconnectAttempts`.
- [ ] Update tests:
  - Extend `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.test.ts` to verify null `max_reconnect_attempts` returns configured default (e.g. 2 or 3).
  - Extend `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.test.ts` for null `max_reconnect_attempts` handling.

**Migration required:** No — query logic fallback update only.
