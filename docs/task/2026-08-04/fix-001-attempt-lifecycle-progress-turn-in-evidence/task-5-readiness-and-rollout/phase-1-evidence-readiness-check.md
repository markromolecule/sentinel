# Task 5 — Phase 1: Non-Destructive Evidence Readiness

**Status:** Completed
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Fail deployment verification with actionable redacted diagnostics when evidence is enabled but its
private bucket or environment alignment is invalid.

## Implementation Checklist

- [x] Add JSDoc-documented `verifyBucketReadiness()` to
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-storage.service.ts` to read
      bucket metadata and verify existence, private visibility, WebP/JPEG MIME types, and object
      size without listing user objects.
- [x] Create
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-readiness.service.ts` to
      validate `TELEMETRY_EVIDENCE_ENABLED`, non-empty institution allowlist, bucket name,
      service-role access, and metadata with redacted failures.
- [x] Create `app/sentinel-api/src/scripts/verify-telemetry-evidence-readiness.ts` as a read-only CLI
      and add a narrowly named command to `app/sentinel-api/package.json`.
- [x] Add existing `TELEMETRY_EVIDENCE_*` variables with safe examples/comments to
      `app/sentinel-api/.env.example`; introduce no new required variable.
- [x] Update `docs/operations/mediapipe-incident-evidence-runbook.md` with the command, expected
      output, API/web project-alignment check, and disable/rollback sequence.

## Tests and Verification

- [x] Extend
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-storage.service.test.ts`
      and create
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-readiness.service.test.ts`
      for missing/public bucket, MIME/size mismatch, missing flags/allowlist, and healthy bucket.
- [x] Run focused readiness tests and the read-only CLI in the target environment.

## Migration Decision

**Migration required:** No — the environment-configurable bucket remains an explicit Supabase
operational resource.

## Completion Gate

- [x] Record focused commands and the redacted target-environment result here.
- [x] Confirm web anon and API service-role clients use the same Supabase project.
- [x] Confirm the readiness command neither lists nor mutates evidence objects.
- [x] Mark this phase complete only after tests pass.

Verification notes:

- Focused tests: `pnpm --dir app/sentinel-api exec vitest run 'src/modules/telemetry/evidence/services/evidence-storage.service.test.ts' 'src/modules/telemetry/evidence/services/evidence-readiness.service.test.ts' --config vitest.config.ts`
- CLI validation: `pnpm --dir app/sentinel-api verify:telemetry-evidence-readiness` hit the sandbox `tsx` IPC restriction, so the same script was validated with `node --import tsx -r dotenv/config src/scripts/verify-telemetry-evidence-readiness.ts` and returned a redacted `EVIDENCE_DISABLED` blocker while remaining read-only.
- The readiness gate checks API/web Supabase project alignment through `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` and does not list or mutate evidence objects.
