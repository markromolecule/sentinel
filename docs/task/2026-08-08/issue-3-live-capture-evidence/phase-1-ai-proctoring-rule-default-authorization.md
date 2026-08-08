# Issue 3 - Phase 1: AI Proctoring Rule Default Authorization in Evidence Service

**Goal:** Allow evidence uploads for unconfigured or null `ai_rules` by defaulting missing rule properties to enabled (`true`).

## Tasks

- [x] In `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-authorization.service.ts`:
  - Updated `EvidenceAuthorizationService.authorizeStudentUpload()` rule validation to check if `aiRules[key] !== false` so that missing or null `ai_rules` default to enabled (`true`).
  - Added clean and comprehensive JSDoc for `authorizeStudentUpload()`.
- [x] Update tests:
  - Extended `app/sentinel-api/src/modules/telemetry/evidence/evidence.service.test.ts` with test cases verifying upload authorization succeeds for:
    - `FACE_NOT_VISIBLE` when `ai_rules` is null.
    - `GAZE` when `ai_rules` is null or `{}`.
    - Explicitly disabled rules (e.g. `{ face_detection: false }`) still reject with `400 Bad Request`.
  - Resolved foreign key constraint validation issues in the test fixtures by inserting real `flagged_incidents` records matching the exam attempt. All 14 tests in the suite now pass successfully.

**Migration required:** No — service logic fix.

