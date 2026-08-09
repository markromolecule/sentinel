# Issue 1 - Phase 1: Reconnect Limit Defaults in Query Services

**Goal:** Ensure backend lobby, entitlement, and monitoring services fall back to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts` when `max_reconnect_attempts` is null or unconfigured.

## Tasks

- [x] In `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts`:
    - Import `DEFAULT_EXAMINATION_GLOBAL_SETTINGS` from `@sentinel/shared/constants`.
    - Fallback `maxReconnectAttempts` to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts` when `examConfiguration?.max_reconnect_attempts` is null or undefined.
    - Add JSDoc to `getWaitingList()`.
- [x] In `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.ts`:
    - Fallback `maxReconnectAttempts` to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts` when `exam.max_reconnect_attempts` is null or undefined.
- [x] In `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`:
    - Resolve `maxReconnectAttempts` with global fallback so `runtimeAccess` receives proper `totalReconnectAttempts`.
- [x] Update tests:
    - Extended `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.test.ts` with two additional cases: null `max_reconnect_attempts` column and missing config row — both assert global default is returned.
    - Extended `app/sentinel-api/src/modules/examination/monitoring/services/get-monitoring-exam-context.test.ts` with a null `max_reconnect_attempts` fallback case.

**Migration required:** No — query logic fallback update only.

## Completion Notes

- All three backend services now consistently return `defaultMaxReconnectAttempts` (3) when the column is null.
- `evaluate-student-exam-eligibility.service.ts` now passes the global default to `resolveExamRuntimeAccess` instead of `undefined`, ensuring `totalReconnectAttempts` and `reconnectAttemptsRemaining` are correct for unconfigured exams.
- Tests extended; `pnpm --dir app/sentinel-api test` confirms all pass.
