# Issue 3 - Phase 2: Evidence Upload Verification and Integration Tests

**Goal:** Verify live capture frame evidence candidate ingestion and signed URL generation across API evidence routes.

## Tasks

- [ ] In `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.ts`:
  - Verify `EvidenceCandidateService.processEvidenceCandidate` cleanly returns `UPLOAD` decisions with signed URLs and tokens when authorization succeeds.
- [ ] Run focused Vitest suites:
  - Run `pnpm --dir app/sentinel-api test` for evidence, telemetry, flow, and access test suites.
  - Run `pnpm lint` and `pnpm format:check` to ensure no linting or formatting regressions.

**Migration required:** No — verification and test suite phase.
