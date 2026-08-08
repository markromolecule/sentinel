# Issue 3 - Phase 1: AI Proctoring Rule Default Authorization in Evidence Service

**Goal:** Allow evidence uploads for unconfigured or null `ai_rules` by defaulting missing rule properties to enabled (`true`).

## Tasks

- [ ] In `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-authorization.service.ts`:
  - Update `EvidenceAuthorizationService.authorizeStudentUpload()` rule validation:
    - Check if `aiRules[key] !== false` (or merge `attempt.ai_rules` with `DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultAiRules`) so that missing or null `ai_rules` default to enabled (`true`).
    - Add JSDoc for `authorizeStudentUpload()`.
- [ ] Update tests:
  - Extend `app/sentinel-api/src/modules/telemetry/evidence/evidence.service.test.ts` with test cases verifying upload authorization succeeds for:
    - `FACE_NOT_VISIBLE` when `ai_rules` is null.
    - `GAZE` when `ai_rules` is null or `{}`.
    - Explicitly disabled rules (e.g. `{ face_detection: false }`) still reject with `400 Bad Request`.

**Migration required:** No — service logic fix.
