# Phase 7: Retention, Operations, and Release Validation

### Phase 7: Retention, Operations, and Release Validation

**Goal:** Complete expiry/cleanup behavior and prove the feature is secure, operable, performant,
and visually ready for release.

## Prerequisite

- [ ] Confirm both application integrations and Phase 6 tests pass.

## Tasks

- [ ] Refactor `PdfCleanupService` in
      `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-cleanup.service.ts` with a
      JSDoc-documented examination-report cleanup path that selects expired `READY` records from
      `exam_report_exports`, deletes only `exam-reports/...` private objects, marks records `EXPIRED`,
      clears storage coordinates, and preserves metadata.
- [ ] Add examination-report cases to
      `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-cleanup.service.test.ts` for
      successful cleanup, already-missing object, storage failure policy, metadata preservation,
      answer-key exclusion, and protection against deleting a path outside `exam-reports/`.
- [ ] Add a JSDoc-documented `PdfCleanupService.purgeExpiredPdfArtifacts()` orchestrator in
      `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-cleanup.service.ts` that invokes
      analytics and examination-report cleanup independently and returns per-kind counts/errors; test
      that one kind failing does not silently skip the other.
- [ ] Create `app/sentinel-api/src/pdf-cleanup-process.ts` as a one-shot process that obtains the
      repository DB client, calls `purgeExpiredPdfArtifacts()`, reports counts without sensitive data,
      and exits nonzero on cleanup errors; add `pdf:cleanup` to `app/sentinel-api/package.json` so the
      deployment scheduler has a concrete command.
- [ ] Extend `docs/operations/pdf-generation.md` with the new document kind, storage prefix,
      seven-day retention, lifecycle states, permission/scope investigation steps, retry rules,
      cleanup/reconciliation safeguards, metrics, and a representative large-cohort load test.
- [ ] Update `app/sentinel-api/.env.example` comments to clarify that existing PDF queue, bucket,
      timeout, size, and signed-URL values also govern examination reports; do not add an unused
      environment variable.
- [ ] Add/extend
      `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-generation-queue-and-cleanup.integration.test.ts`
      for expiry-to-410/download denial, cleanup metadata state, and storage prefix isolation.
- [ ] Run a mixed-state fixture (absent, in progress, ungraded essay, finalized, superseded,
      remediated, all incident outcomes) and a 250+ student fixture through sync mode; record render
      time, file size, page count, and peak process memory in the implementation execution note.
- [ ] Repeat one representative generation in Redis mode when Redis is available; otherwise record
      the environment limitation and rely on the worker/queue integration suite before release.
- [ ] Perform a visual PDF review for common long names/sections, null scores, repeated headings,
      deliberate insights page break, branding variants, header/footer collision, page numbering,
      contrast, and selectable/extractable text.
- [ ] Perform an authorization matrix check for Support, superadmin, admin, assigned instructor,
      unassigned instructor, revoked custom role, student, wrong institution, parent/branch scope, stale
      signed URL, expired record, and guessed export ID.
- [ ] Run `pnpm format:check`, the focused suites from Phases 1–6, then `pnpm lint`, `pnpm test`, and
      `pnpm build`; record unrelated pre-existing failures separately and do not mark the plan complete
      until feature-specific failures are resolved.

**Migration required:** No — this phase validates and operates the Phase 1 schema; no additional
schema change is planned.

## Validation

- [ ] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/general/pdf-documents/services/pdf-cleanup.service.test.ts src/modules/general/pdf-documents/tests/pdf-generation-queue-and-cleanup.integration.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-api pdf:cleanup` against a seeded test environment containing
      expired analytics and examination-report records, then verify per-kind counts and private-object
      deletion.
- [ ] Complete the large-cohort, security-matrix, and visual checks above and attach their evidence
      to the implementation execution note.

## Release gate

- [ ] Confirm the Phase 1 migration has a reviewed rollback procedure and is included in deployment
      ordering before API/worker/frontend rollout.
- [ ] Deploy database, API/worker, Support, then Core/Web; keep the UI action disabled until the API
      accepts `EXAM_RESULTS_REPORT` jobs.
- [ ] Confirm no new required environment variable and verify existing private buckets in the
      target environment before enabling the action.
- [ ] Confirm no breaking change to analytics or answer-key document kinds through their existing
      regression suites.
- [ ] Mark every checkbox in all seven phase files only after its test evidence is recorded.

## Exit criteria

- Expired report objects are removed safely and cannot produce signed downloads.
- Performance and memory remain within configured worker limits for the agreed large cohort.
- Security matrix, visual inspection, all focused tests, lint, formatting, and builds pass.
- Operations documentation and deployment/rollback order are ready for reviewers.
