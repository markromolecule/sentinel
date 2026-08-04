# Task 4 — Phase 2: Evidence Before Automatic Close

**Status:** Not started  
**Depends on:** `phase-1-deferred-incident-side-effects.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Issue one exact upload target for the threshold-crossing event, then always apply automatic lifecycle
policy even when target creation fails.

## Implementation Checklist

- [ ] Update `EvidenceCandidateService.process()` in
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.ts` to
      persist authoritative severity, initialize eligible evidence while active, and run deferred
      effects in `finally`.
- [ ] Return `UNAVAILABLE` without suppressing auto-close when target generation fails; retain
      `LOW`, ignored, duplicate, and `ALREADY_AVAILABLE` decisions.
- [ ] Keep `EvidenceAuthorizationService.authorizeStudentUpload()` in
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-authorization.service.ts`
      strict; do not accept arbitrary `CLOSED` attempts.
- [ ] Preserve `(attempt_id, event_id)` compatibility/quotas in
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-upload.service.ts` and store
      authoritative `incident_id` before closure effects.

## Tests and Verification

- [ ] Extend
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.test.ts`
      for target-before-close ordering, all severity branches, target failure plus closure, duplicate
      retry, and stale post-close denial.
- [ ] Add a DB-backed regression to
      `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
      proving one `PENDING_UPLOAD` row and `exam_attempts.lifecycle_state = CLOSED` for one event.
- [ ] Extend `app/sentinel-api/src/modules/telemetry/evidence/evidence.service.test.ts` proving an
      unrelated later event cannot initialize after closure.
- [ ] Run focused evidence, storage, and lifecycle tests.

## Migration Decision

**Migration required:** No — current evidence state and idempotency columns are sufficient.

## Completion Gate

- [ ] Record focused command results here during implementation.
- [ ] Record ordering for one event: persisted, target prepared, evidence row created, closed.
- [ ] Confirm target failure never prevents required closure.
- [ ] Mark this phase complete only after tests pass.
