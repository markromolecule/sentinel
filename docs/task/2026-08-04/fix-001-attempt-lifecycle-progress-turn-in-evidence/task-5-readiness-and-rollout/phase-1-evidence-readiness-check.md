# Task 5 — Phase 1: Non-Destructive Evidence Readiness

**Status:** Not started  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Fail deployment verification with actionable redacted diagnostics when evidence is enabled but its
private bucket or environment alignment is invalid.

## Implementation Checklist

- [ ] Add JSDoc-documented `verifyBucketReadiness()` to
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-storage.service.ts` to read
      bucket metadata and verify existence, private visibility, WebP/JPEG MIME types, and object
      size without listing user objects.
- [ ] Create
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-readiness.service.ts` to
      validate `TELEMETRY_EVIDENCE_ENABLED`, non-empty institution allowlist, bucket name,
      service-role access, and metadata with redacted failures.
- [ ] Create `app/sentinel-api/src/scripts/verify-telemetry-evidence-readiness.ts` as a read-only CLI
      and add a narrowly named command to `app/sentinel-api/package.json`.
- [ ] Add existing `TELEMETRY_EVIDENCE_*` variables with safe examples/comments to
      `app/sentinel-api/.env.example`; introduce no new required variable.
- [ ] Update `docs/operations/mediapipe-incident-evidence-runbook.md` with the command, expected
      output, API/web project-alignment check, and disable/rollback sequence.

## Tests and Verification

- [ ] Extend
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-storage.service.test.ts`
      and create
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-readiness.service.test.ts`
      for missing/public bucket, MIME/size mismatch, missing flags/allowlist, and healthy bucket.
- [ ] Run focused readiness tests and the read-only CLI in the target environment.

## Migration Decision

**Migration required:** No — the environment-configurable bucket remains an explicit Supabase
operational resource.

## Completion Gate

- [ ] Record focused commands and the redacted target-environment result here.
- [ ] Confirm web anon and API service-role clients use the same Supabase project.
- [ ] Confirm the readiness command neither lists nor mutates evidence objects.
- [ ] Mark this phase complete only after tests pass.
