# Phase 1: Contracts, RBAC, and Export Schema

### Phase 1: Contracts, RBAC, and Export Schema

**Goal:** Establish the typed `EXAM_RESULTS_REPORT` contract, least-privilege permission, and durable
export lifecycle table before any renderer or UI depends on them.

## Tasks

- [ ] Extend `DocumentKindSchema` in
      `packages/shared/src/schema/pdf-documents/pdf-document-schema.ts` with
      `EXAM_RESULTS_REPORT`; keep the Sentinel-logo constraint specific to `ANALYTICS_OVERALL` and add
      JSDoc to any new exported schema/helper.
- [ ] Add examination-report export lifecycle schemas and inferred types in
      `packages/shared/src/schema/pdf-documents/pdf-document-schema.ts` for `PENDING`, `GENERATING`,
      `READY`, `FAILED`, and `EXPIRED`, excluding raw storage coordinates and report-body/student data
      from client responses.
- [ ] Extend `packages/shared/src/schema/pdf-documents/pdf-document-schema.test.ts` for the new
      document kind, lifecycle records, invalid status, and proof that analytics-only co-branding rules
      are not accidentally applied to examination reports.
- [ ] Extend `documentKindEnum`, template preview/draft DTOs, and examination-report create/list/
      status response schemas in
      `app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.dto.ts`; make create accept only
      `exam_id` plus an optional title because institution ownership must be derived server-side.
- [ ] Add `EXAM_RESULTS_REPORT` built-in header/footer defaults to
      `app/sentinel-api/src/modules/general/pdf-documents/services/resolve-pdf-template.service.ts` and
      update its exhaustive `Record<DocumentKind, ...>` without changing analytics or answer-key
      fallback precedence.
- [ ] Add `EXAM_RESULTS_REPORT` template-resolution coverage in a new colocated test
      `app/sentinel-api/src/modules/general/pdf-documents/services/resolve-pdf-template.service.test.ts`
      for institution override, global fallback, and built-in fallback.
- [ ] Register `EXAMINATIONS_EXPORT_RESULTS_REPORT` with key
      `examinations:export_results_report`, module `examinations`, action `export_results_report`,
      category `EXAM`, and institution scope in `packages/shared/src/constants/permissions.ts`; add it
      to Support, superadmin, admin, and instructor system-role blueprints but not student blueprints.
- [ ] Extend
      `app/sentinel-api/src/modules/security/permission/data/sync-system-permissions.test.ts` to prove
      the new permission is synchronized once, appears in the Permission Registry catalog, has the
      intended defaults, and remains absent from student/unrelated roles.
- [ ] Add `exam_report_exports` to `packages/db/prisma/schema.prisma` with `export_id`, `exam_id`,
      `institution_id`, required `template_id`/`template_snapshot`, status/failure/retry fields,
      `request_snapshot`, creator and lifecycle timestamps, `expires_at`, and nullable private storage
      coordinates; add inverse relations on `exams`, `institutions`, `pdf_templates`, and `users`.
- [ ] Create
      `packages/db/prisma/migrations/20260801090000_add_exam_report_pdf_exports/migration.sql` with the
      table, foreign keys (`exam`/`institution` cascade, `template` restrict, creator set null), and
      indexes on `exam_id`, `institution_id`, `template_id`, `status`, and `expires_at`.
- [ ] Add migration comments documenting allowed status values and the private-artifact expectation;
      do not create or make any storage bucket public in
      `packages/db/prisma/migrations/20260801090000_add_exam_report_pdf_exports/migration.sql`.
- [ ] Regenerate Prisma/Kysely output so `exam_report_exports` is present in
      `packages/db/src/generated/types.ts`, and extend
      `app/sentinel-api/src/modules/general/pdf-documents/data/pdf-document-schema.integration.test.ts`
      to insert/read relations and verify required fields and indexes against the migrated schema.
- [ ] Update every exhaustive document-kind union in
      `app/sentinel-api/src/modules/general/pdf-documents/queue/pdf-generation.worker.ts`,
      `pdf-generation-job-processor.service.ts`,
      `queue/processors/pdf-document-processor.interface.ts`, and
      `queue/processors/pdf-processor.registry.ts` to compile with `EXAM_RESULTS_REPORT`; use a temporary
      explicit unsupported processor assertion until Phase 3 registers the processor.

**Migration required:** Yes — the report export lifecycle must persist exam ownership, template
snapshot, job state, private artifact coordinates, retry state, and expiry independently from
period-based analytics reports.

## Validation

- [ ] Run `pnpm --dir packages/db generate` and confirm generated output contains
      `exam_report_exports`.
- [ ] Run `pnpm --dir packages/shared test -- src/schema/pdf-documents/pdf-document-schema.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/security/permission/data/sync-system-permissions.test.ts src/modules/general/pdf-documents/data/pdf-document-schema.integration.test.ts src/modules/general/pdf-documents/services/resolve-pdf-template.service.test.ts`.
- [ ] Run `pnpm --dir packages/shared lint` and `pnpm --dir app/sentinel-api lint` for the changed
      contract/RBAC/schema-adjacent files.

## Exit criteria

- The migration applies cleanly to an empty/test database and the generated DB type is available.
- The new document kind compiles across shared and API unions.
- Permission defaults and exclusion from student roles are proven by tests.
- No renderer, endpoint, or UI work begins until this phase passes.

## Rollback note

Before production data exists, remove the new permission declaration/blueprints, revert the shared
document-kind additions, and drop `exam_report_exports` with its relations and indexes. After data
exists, follow the artifact/audit preservation process in the parent plan before dropping the table.
