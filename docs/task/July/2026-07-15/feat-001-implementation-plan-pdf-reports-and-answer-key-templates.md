# Implementation Plan — PDF Overall Reports and Examination Answer Keys

> **Task summary:** repair the broken analytics PDF flow and add Support-managed, institution-overridable header/footer templates for institution-scoped overall analytics reports and examination answer keys, using asynchronous generation and private Supabase Storage.

## 1. The Context

The current analytics endpoint inserts a `READY` `analytics_reports` row with a null `file_url` but
never renders or uploads a file, so the Support UI correctly displays **No file available**. The
feature also needs explicit institution ownership, truthful job state, private downloads, seven-day
analytics retention, persistent answer-key/template assets, Support-only management permissions,
and fixed-body PDF renderers whose header and footer can be overridden per institution.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Render PDFKit documents synchronously inside the existing analytics and exam HTTP
  handlers, upload them to Supabase Storage, store only one mutable template per institution, and
  return a signed URL immediately.
- **Tradeoff:** This is fastest, but large reports or answer keys can exhaust request timeouts, a
  failed upload leaves difficult recovery states, and mutable templates make historical output
  impossible to reproduce.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Use a dedicated BullMQ PDF queue and worker, immutable published template versions,
  explicit institution-owned export records, deterministic PDFKit renderers, private Supabase
  buckets, authorization-checked short-lived signed downloads, and a scheduled retention cleanup.
- **Tradeoff:** This adds a worker process, migrations, queue lifecycle code, and more integration
  tests than synchronous generation.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Build HTML/CSS document pages and use a headless Chromium service to print them,
  with template previews and production exports sharing the browser rendering pipeline.
- **Tradeoff:** Browser output is visually flexible, but Chromium deployment, sandboxing, SSRF
  controls, memory consumption, font packaging, and browser-version drift add substantial
  operational surface for header/footer-only customization.

## 1. The Execution

**The Recommendation:** Option B — The Strategic Path.

**The Justification:** Sentinel already depends on BullMQ, Redis, Supabase, DTO/controller/service/
data boundaries, shared service clients, and React Query hooks. A dedicated low-concurrency worker
fits those patterns, keeps CPU-heavy document rendering outside API requests, supports idempotent
retries, and avoids introducing Chromium for a fixed body whose only configurable areas are the
header and footer. Private Supabase buckets and server-issued signed URLs also match the sensitivity
of incident data and correct answers.

**Next Steps:**

1. Add institution-owned export, immutable template-version, branding, permission, and retention
   schema contracts.
2. Build and test the shared renderer, storage, queue, analytics snapshot, and answer-key pipelines.
3. Connect Support-only services, hooks, report generation, template administration, permission
   registry, branding, preview, download, retry, and expiry UX.

---

## Approved Decisions and Recommended Defaults

- The examination export is an **answer key**, not a student submission, blank question paper,
  attempt report, or exam-level results summary.
- Analytics produces one `OVERALL` PDF containing executive, exam, incident, and integrity sections;
  section-specific PDFs are out of scope.
- Report-period presets are **last 7, 30, or 90 local calendar days**, with **30 days as default**,
  plus an inclusive custom date range capped at **366 days**.
- Period boundaries use `Asia/Manila` in the first release. The API converts local inclusive dates
  to a half-open UTC interval `[startAt, endAtExclusive)` and stores both UTC values and the timezone
  on the export record.
- Support selects the target institution. The API must verify that the authenticated Support user
  has cross-institution authority; it must not infer ownership from the creator's profile.
- A globally published template is the fallback, and an institution-published template overrides it.
- Only authorized Support staff can upload or remove institution logos.
- Customization is limited to **header and footer configuration**. Analytics and answer-key body
  layout and section order remain fixed.
- The Sentinel logo is mandatory in analytics reports. It is not required in answer keys, which may
  use institution-only branding.
- Generation is asynchronous through BullMQ. Start with **global concurrency 2**, **three total
  attempts**, **exponential backoff seeded at 5 seconds**, and a **120-second per-attempt timeout**.
  Keep each job idempotent and use the export UUID as the BullMQ `jobId`.
- Use private Supabase Storage buckets. Analytics artifacts expire seven days after successful
  generation; metadata remains for audit/status display and transitions to `EXPIRED` after object
  deletion. Generate download URLs on demand with a five-minute lifetime.
- Published templates and institution logos have no time-based expiry. Answer-key PDFs have no
  automatic expiry in this release and remain private until explicitly deleted or their parent exam
  is permanently deleted.
- Only the Support role receives the new generation, template-management, branding-management, and
  answer-key-export permissions. Existing report-view permissions are not silently revoked from
  other roles, but they do not authorize these new Support workflows.
- PDF is the only generated artifact format. Remove `csv` and `xlsx` from the create-export contract;
  preserve legacy database strings only for historical-row compatibility.

The queue settings follow BullMQ's guidance to use retries with backoff and idempotent jobs. Low
concurrency is deliberate because PDF rendering is CPU/memory intensive; it can be raised only from
production measurements. Supabase private buckets and short-lived signed URLs are required because
public bucket URLs bypass download access control.

## Scope Boundaries

### In scope

- Overall institutional analytics PDF generation.
- Examination answer-key PDF generation for all current Sentinel question types.
- Global template fallback and per-institution override.
- Header/footer configuration, institution logo management, and deterministic preview.
- Support-only generation and administration workflows.
- Private storage, signed download, retry, expiry, audit logging, and cleanup.
- Permission catalog and Support role blueprint updates visible on the Permission page.

### Out of scope

- CSV or XLSX generation.
- Student submissions, blank question papers, attempt reports, result summaries, or answer sheets.
- Arbitrary HTML, CSS, JavaScript, custom fonts, drag-and-drop body design, or body section reordering.
- Institution self-service template/logo management outside Sentinel Support.
- Automatic email delivery or external sharing links.
- Retrofitting PDFs into `sentinel-web`, `sentinel-core`, or `sentinel-mobile` in this release.

## Metric and Document Contracts

### Overall analytics period semantics

- Exams: count non-draft exams whose `scheduled_date` falls inside the selected period; active exam
  count is evaluated at the report's `endAtExclusive` snapshot boundary.
- Attempts: count attempts by `exam_attempts.started_at` inside the selected period.
- Completed/dropped: classify the period's attempts by durable attempt status.
- Incidents: count `flagged_incidents.timestamp` inside the selected period; flagged-attempt count is
  distinct by `attempt_id` within those incidents.
- Department integrity: compute completed, flagged, and dropped counts from period-scoped attempts
  and incidents, retaining zero-valued departments.
- Trends: bucket in `Asia/Manila`; use daily buckets through 31 days, weekly buckets through 180
  days, and monthly buckets above 180 days.
- Integrity index: retain the existing mapped formula, but apply it only to the same period-scoped
  attempts and incidents used by the other sections.

### Fixed analytics body order

1. Cover/identity and period.
2. Executive summary.
3. Exam activity.
4. Incident analysis.
5. Integrity overview.
6. Empty-data explanation when a section has no rows.

### Fixed answer-key body contract

- Institution, exam title, subject, schedule, duration, total points, and generation metadata.
- Exam section headings and descriptions in saved order.
- Questions in `order_index` order within their section.
- `MULTIPLE_CHOICE`: prompt, choices, and correct choice.
- `MULTIPLE_RESPONSE`: prompt, choices, and every correct choice.
- `TRUE_FALSE`: prompt and correct boolean answer.
- `IDENTIFICATION` and `ENUMERATION`: prompt, accepted answers, and case-sensitivity note where set.
- `MATCHING`: prompt and correct left/right pairs.
- `FILL_BLANK`: prompt and ordered blank answers.
- `ESSAY`: prompt and rubric; show **Instructor-evaluated — no fixed answer** when no rubric exists.
- Passage content and source image/text must appear before the first related question. HTML passages
  must be converted through a safe allowlisted text model rather than injected into the PDF.
- Never use `sanitizeQuestionForStudentAttempt()` for answer-key source data because it deliberately
  removes correct answers; enforce Support-only authorization before loading unsanitized questions.

## Impacted Workspaces, Modules, and Data

### Database

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260715120000_add_pdf_exports_and_templates/migration.sql`
- `packages/db/src/generated/types.ts` (regenerated by the existing database build flow)
- `analytics_reports` (extended)
- `pdf_templates` (new)
- `institution_pdf_branding` (new)
- `exam_answer_key_exports` (new)
- `institutions`, `exams`, `exam_questions`, `exam_sections`, `user_profiles` (foreign keys/read data)
- `rbac_permissions`, `rbac_role_permissions` (synced through the system catalog/role blueprint)

### Shared packages

- `packages/shared/src/constants/permissions.ts`
- `packages/shared/src/constants/analytics.ts`
- `packages/shared/src/schema/pdf-documents/pdf-document-schema.ts` (new)
- `packages/shared/src/schema/pdf-documents/pdf-document-schema.test.ts` (new)
- `packages/shared/src/schema/pdf-documents/index.ts` (new)
- `packages/shared/src/schema/index.ts`
- `packages/shared/src/types/index.ts`
- `packages/services/src/api/pdf-documents.ts` (new)
- `packages/services/src/api/pdf-documents.test.ts` (new)
- `packages/services/src/api/analytics.ts`
- `packages/hooks/src/query/pdf-documents/` (new query/mutation hooks)
- `packages/hooks/src/query/analytics/` (report generation/list polling changes)

### Sentinel API

- `app/sentinel-api/package.json`
- `app/sentinel-api/.env.example`
- `app/sentinel-api/src/app.ts`
- `app/sentinel-api/src/modules/general/analytics/`
- `app/sentinel-api/src/modules/general/pdf-documents/` (new DTO/controller/service/data module)
- `app/sentinel-api/src/modules/general/pdf-documents/rendering/` (new shared PDF renderer)
- `app/sentinel-api/src/modules/general/pdf-documents/storage/` (new Supabase adapter)
- `app/sentinel-api/src/modules/general/pdf-documents/queue/` (new BullMQ queue/worker)
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-questions.ts` (reuse or wrap for
  unsanitized answer-key projection)
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-sections.ts`
- `app/sentinel-api/src/modules/examination/exams/data/get-exam-by-id.ts`
- `app/sentinel-api/src/modules/general/logs/logs.service.ts` (reuse only)

### Sentinel Support

- Existing analytics report page/list and tests.
- New `/pdf-templates/reports` and `/pdf-templates/examinations` workspace.
- Support sidebar constants/tests.
- Existing institution and exam query hooks reused for Support selectors.
- Existing Access Control Permission/Role pages consume the expanded shared permission catalog.

**Migration required:** Yes — report ownership/lifecycle fields, template versions, institution
branding, answer-key export records, indexes, constraints, and storage buckets do not exist.

---

## Phase 1: Add Schema, Storage Buckets, and Support Permissions

**Goal:** Establish explicit institution ownership, immutable template versions, export lifecycles,
private storage, and Support-only capabilities before exposing any new endpoint.

- [x] Add `pdf_templates` to `packages/db/prisma/schema.prisma` with `template_id`, nullable
      `institution_id` for global fallback, `document_kind` (`ANALYTICS_OVERALL` or `EXAM_ANSWER_KEY`),
      positive `version`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), JSON `header_config`, JSON
      `footer_config`, creator/updater/publisher references, and timestamps; published rows are immutable.
- [x] Add `institution_pdf_branding` to `packages/db/prisma/schema.prisma` with one row per
      institution and private logo bucket/path, normalized MIME type, byte size, SHA-256 checksum,
      original display filename, updater, and timestamps.
- [x] Extend `analytics_reports` in `packages/db/prisma/schema.prisma` with nullable-for-legacy but
      application-required `institution_id`, `period_start_at`, `period_end_at`, `timezone`,
      `template_id`, immutable JSON `template_snapshot`, `storage_bucket`, `storage_path`, `status`,
      `failure_code`, `failure_message`, `started_at`, `completed_at`, `expires_at`, `retry_count`, and
      `request_snapshot`; retain `file_url` only as deprecated legacy data.
- [x] Add `exam_answer_key_exports` to `packages/db/prisma/schema.prisma` with immutable `exam_id`,
      `institution_id`, `template_id`, `template_snapshot`, private storage coordinates, lifecycle/
      failure/timing fields, creator, and a nullable `expires_at` that remains null by default.
- [x] Create
      `packages/db/prisma/migrations/20260715120000_add_pdf_exports_and_templates/migration.sql` to add
      tables/columns/check constraints/FKs/indexes, including partial unique indexes that permit only one
      published global template per document kind and one published institution override per institution
      and document kind.
- [x] In the migration, backfill `analytics_reports.institution_id` from the creator's profile where
      possible; mark unresolved legacy placeholder rows `EXPIRED`, retain their null institution for
      audit only, and exclude them from institution-scoped downloads.
- [x] In the migration, create private `sentinel-pdf-artifacts` and `sentinel-pdf-assets` Supabase
      buckets idempotently; restrict artifact MIME type to `application/pdf`, logo MIME types to PNG,
      JPEG, and WebP, and define server-managed access policies without creating public read access.
- [x] Add `reports:generate`, `pdf_templates:view`, `pdf_templates:manage`,
      `institution_branding:manage`, and `examinations:export_answer_key` definitions to
      `packages/shared/src/constants/permissions.ts`; add them only to the `support` system role
      blueprint so system permission sync makes them visible on `/control/permissions` and assignable
      from the role matrix.
- [x] Extend `app/sentinel-api/src/modules/security/permission/data/sync-system-permissions.test.ts`
      and `app/sentinel-api/src/modules/security/roles/data/sync-system-role-permissions.test.ts` to prove
      all five permissions are registered and assigned to Support but not to other system roles.
- [x] Add
      `app/sentinel-api/src/modules/general/pdf-documents/data/pdf-document-schema.integration.test.ts`
      to prove template publication uniqueness, institution FKs, legacy backfill behavior, and valid
      export status constraints.

**Migration required:** Yes — this phase owns the forward schema/storage migration.

### Phase 1 Verification

- [x] Run `pnpm db:migrate` against a disposable database and regenerate `@sentinel/db` types.
- [x] Confirm both buckets remain private and a public URL cannot retrieve a fixture object.
- [x] Confirm `/control/permissions` groups the new system permissions under their expected modules.
- [x] Roll the migration back in a disposable database using the rollback SQL documented below, then
      reapply it to prove forward/rollback ordering.

---

## Phase 2: Define Shared Contracts and Period Semantics

**Goal:** Make template configuration, export status, date ranges, and response payloads consistent
across API, service clients, hooks, worker, and Support UI.

- [x] Create `packages/shared/src/schema/pdf-documents/pdf-document-schema.ts` with exported,
      JSDoc-documented Zod schemas/types for document kind, lifecycle status, template scope/status,
      header/footer configuration, branding metadata, report period, template records, generation
      requests, preview requests, download responses, retry responses, and answer-key export records.
- [x] In `packages/shared/src/schema/pdf-documents/pdf-document-schema.ts`, limit header configuration
      to logo visibility/placement/maximum size, title/subtitle text and alignment, divider visibility/
      color, and accent color; limit footer configuration to safe plain text, confidentiality label,
      divider, page-number visibility, and page-number format.
- [x] In `packages/shared/src/schema/pdf-documents/pdf-document-schema.ts`, enforce analytics-specific
      rules: Sentinel logo visibility is always true and body configuration/order fields are rejected;
      enforce answer-key rules independently without a mandatory Sentinel logo.
- [x] Define generation requests as `institutionId`, title, preset or custom inclusive local dates,
      and `timezone: 'Asia/Manila'`; accept only `format: 'pdf'` if format remains present for backward
      compatibility and reject `csv`/`xlsx`.
- [x] Add `resolvePdfReportPeriod()` in
      `app/sentinel-api/src/modules/general/pdf-documents/services/resolve-pdf-report-period.ts` to map
      7/30/90-day presets and custom dates into a validated half-open UTC interval capped at 366 days.
- [x] Update `packages/shared/src/constants/analytics.ts` so report list/status keys include the full
      pagination/filter payload and add stable PDF-template, branding, preview, answer-key, download,
      and retry keys.
- [x] Export the new schemas/types through `packages/shared/src/schema/pdf-documents/index.ts`,
      `packages/shared/src/schema/index.ts`, and `packages/shared/src/types/index.ts` without duplicating
      local DTO types.
- [x] Write `packages/shared/src/schema/pdf-documents/pdf-document-schema.test.ts` for valid global
      and institution templates, forbidden body/reordering fields, unsafe text/URLs, analytics Sentinel
      logo enforcement, PDF-only format, invalid timezone, and the 366-day maximum.
- [x] Write `resolve-pdf-report-period.test.ts` beside the resolver for DST-independent Manila day
      boundaries, leap year, inclusive custom end date, exact 366-day boundary, reversed dates, and
      over-limit ranges.

**Migration required:** No — this phase defines application contracts on the Phase 1 schema.

### Phase 2 Verification

- [x] Run focused shared-schema and period-resolver Vitest files.
- [x] Confirm a local date range round-trips through JSON while the database stores canonical UTC
      boundaries and the original timezone.

---

## Phase 3: Implement Template Versioning and Institution Branding APIs

**Goal:** Allow Support to manage global defaults, institution overrides, and safe institution logos
without mutating published versions.

- [x] Create `app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.dto.ts` and
      `pdf-documents.routes.ts`, then register `/pdf-documents` in `app/sentinel-api/src/app.ts`.
- [x] Add `get-pdf-templates.ts`, `upsert-pdf-template-draft.ts`, `publish-pdf-template.ts`, and
      `delete-pdf-template-override.ts` under
      `app/sentinel-api/src/modules/general/pdf-documents/data/templates/` to list resolved/global/
      institution templates, create or update one draft per scope/kind, publish a new immutable version
      transactionally, archive the previous publication, and delete/reset an unpublished override.
- [x] Add
      `app/sentinel-api/src/modules/general/pdf-documents/services/resolve-pdf-template.service.ts` to
      apply precedence: institution-published override,
      global-published template, then a code-owned built-in default; return the immutable template ID
      and normalized snapshot used by renderers.
- [x] Add `app/sentinel-api/src/modules/general/pdf-documents/pdf-template.service.ts` and controllers
      under `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/` for
      `GET /templates`, `PUT /templates/draft`,
      `POST /templates/:templateId/publish`, and `DELETE /templates/override`; require role `support` plus
      `pdf_templates:view` or `pdf_templates:manage` and verify every supplied institution exists.
- [x] Add
      `app/sentinel-api/src/modules/general/pdf-documents/services/institution-branding.service.ts`
      and controllers under `app/sentinel-api/src/modules/general/pdf-documents/controllers/branding/`
      for reading, uploading, replacing, and
      deleting `/institutions/:institutionId/branding`; require role `support` plus
      `institution_branding:manage` for writes.
- [x] Add `sharp` to `app/sentinel-api/package.json` as a direct dependency and implement validation in
      `app/sentinel-api/src/modules/general/pdf-documents/services/institution-branding.service.ts`;
      accept at most 2 MB PNG/JPEG/WebP uploads,
      decode the real image, reject malformed/polyglot content, cap dimensions at 2000x2000, normalize
      to metadata-stripped PNG, use a generated object key, and delete the superseded object only after
      the database transaction points to the replacement.
- [x] In `app/sentinel-api/src/modules/general/pdf-documents/storage/pdf-storage.service.ts`, store
      branding objects under
      `institutions/{institutionId}/branding/{brandingUuid}.png` in `sentinel-pdf-assets`; never accept a
      client-provided storage path or arbitrary remote image URL.
- [x] Add audit logs through `LogsService.createLog()` for draft save, publication, override reset,
      logo upload/replacement/removal, and rejected cross-institution actions.
- [x] Add `pdf-template.service.test.ts`, `institution-branding.service.test.ts`, and controller tests
      beside their source files for Support permission gates, non-Support denial,
      missing institution, precedence, draft isolation, atomic publication, immutable published rows,
      reset fallback, logo signature/size/dimension validation, replacement cleanup, and audit payloads.

**Migration required:** No — this phase consumes the Phase 1 template and branding tables.

### Phase 3 Verification

- [x] Run focused PDF template/branding API Vitest files.
- [x] Publish a global template and one institution override in a disposable environment and confirm
      another institution continues to resolve the global template.
- [x] Upload a renamed non-image fixture and confirm content decoding rejects it before Storage.

---

## Phase 4: Build the Deterministic PDF Rendering and Preview Foundation

**Goal:** Render valid, paginated PDFs from typed view models with the same code used by preview and
production jobs.

- [x] Add `pdfkit`, `@types/pdfkit`, and any minimal PDFKit SVG adapter needed only for the trusted
      bundled Sentinel logo to `app/sentinel-api/package.json`; do not add Chromium or permit uploaded
      SVG branding.
- [x] Create `render-pdf-buffer.ts`, `pdf-page-layout.ts`, `pdf-header-renderer.ts`, and
      `pdf-footer-renderer.ts` under
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/`; include JSDoc on every exported
      function and centralize margins, fonts, safe colors, page breaks, page numbering, and maximum
      output size.
- [x] Reuse `app/sentinel-support/public/icons/sentinel-logo.svg` only as the design source; copy one
      canonical trusted logo into an API-owned renderer asset path so worker deployment does not depend
      on a frontend workspace at runtime.
- [x] Create fixed `analytics-overall-renderer.ts` and `exam-answer-key-renderer.ts`; allow templates
      to influence header/footer only and make body ordering constants non-configurable.
- [x] Create `analytics-overall-view-model.ts` and `exam-answer-key-view-model.ts` to normalize
      numbers, dates, question answers, passages, long text, empty values, and branding before drawing;
      keep database queries out of renderers.
- [x] Add
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/safe-passage-to-pdf-blocks.ts` that
      accepts plain text and a small allowlist of HTML structural
      elements, strips scripts/styles/URLs/event handlers, and emits PDF text blocks; never feed raw HTML
      to a browser or PDF engine.
- [x] Add `POST /pdf-documents/templates/preview` to render bounded deterministic sample data through
      the same renderer and stream `application/pdf` without persisting an export record or object;
      require Support plus `pdf_templates:view` and cap preview payload/response size.
- [x] Add `analytics-overall-renderer.test.ts` and `exam-answer-key-renderer.test.ts` beside the
      renderers to assert `%PDF-` magic bytes, `application/pdf`, non-zero content,
      page count, selected extracted text, repeated header/footer/page numbers, no-data sections, long
      pagination, and fixed section order for both document kinds.
- [x] Add answer-key fixtures to
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/fixtures/exam-answer-key.ts` and
      cover all eight question types, passages, images, rubrics, missing
      essay rubric, special characters, long options, and orphan/page-break behavior.

**Migration required:** No — rendering is application code and trusted assets.

### Phase 4 Verification

- [x] Run focused renderer/view-model tests and inspect generated fixture PDFs with a PDF parser.
- [x] Compare a preview response and a production-render invocation using the same snapshot and prove
      their extracted header/footer/body content matches.

---

## Phase 5: Add Private Storage, Asynchronous Jobs, Retry, and Retention

**Goal:** Generate artifacts outside HTTP requests and make upload, status, retry, download, and
cleanup behavior idempotent and truthful.

- [x] Create `pdf-storage.service.ts` under
      `app/sentinel-api/src/modules/general/pdf-documents/storage/` to upload, verify, sign, and delete
      objects from private buckets; store bucket/path only and never persist signed or public URLs.
- [x] Use artifact keys
      `analytics/{institutionId}/{reportId}.pdf` and
      `answer-keys/{institutionId}/{examId}/{exportId}.pdf`; upload with `application/pdf`,
      `upsert: false`, and a low cache TTL appropriate for revocable private documents.
- [x] Create `pdf-generation-queue.config.ts`, `pdf-generation-queue.service.ts`,
      `pdf-generation-job-processor.service.ts`, and `pdf-generation.worker.ts` under
      `app/sentinel-api/src/modules/general/pdf-documents/queue/`, reusing
      `app/sentinel-api/src/lib/redis/redis.service.ts`.
- [x] Configure the queue with export UUID `jobId`, three attempts, exponential five-second backoff,
      global concurrency two, age/count-based completed/failed job cleanup, and a tested 120-second
      processor timeout; throw `UnrecoverableError` for invalid/missing source data and retry only
      transient database, Redis, renderer, and Storage errors.
- [x] Make the processor transactional at state boundaries: claim `PENDING`/retryable `FAILED`, set
      `GENERATING`, resolve and snapshot the template/data, render, upload/verify, then set `READY` only
      after object verification; on final failure store a safe code/message and set `FAILED`.
- [x] In `pdf-generation-job-processor.service.ts`, make retries idempotent: lock the export row,
      detect an already verified expected object, avoid double upload, preserve one immutable request/
      template snapshot, and increment `retry_count` once per processing attempt.
- [x] Add
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/get-pdf-export-download.controller.ts`
      to return a five-minute Supabase signed download
      URL only for `READY`, unexpired records within the Support user's authorized institution scope;
      return `410 Gone` for expired analytics artifacts and never return storage coordinates.
- [x] Add retry endpoints that create a fresh BullMQ job for a `FAILED` record after clearing safe
      failure state; reject retry for `PENDING`, `GENERATING`, `READY`, or `EXPIRED`.
- [x] Add a daily `purge-expired-analytics-reports` scheduled BullMQ job that deletes analytics
      objects with `expires_at <= now()`, changes their rows to `EXPIRED`, clears storage coordinates,
      and safely retries partial delete/update failures; do not purge templates, branding, or answer keys.
- [x] Add `dev:pdf-worker` and `start:pdf-worker` scripts to `app/sentinel-api/package.json` and
      document the worker as a separately deployed process rather than starting it inside the API server.
- [x] Add co-located `*.test.ts` files beside the queue, storage, processor, and cleanup services for
      duplicate submissions, worker concurrency config,
      transient retry, unrecoverable failure, timeout, upload-before-status ordering, crash after upload,
      signed URL TTL, expired download denial, seven-day boundary, cleanup idempotence, and persistent
      answer-key exclusion.

**Migration required:** No — lifecycle fields and buckets were added in Phase 1.

### Phase 5 Verification

- [x] Run focused queue, storage, processor, and cleanup Vitest files with mocked Redis/Storage, then
      run one disposable Redis + Supabase integration scenario.
- [x] Kill the worker after upload but before `READY`, restart it, and confirm one object and one ready
      export record result.
- [x] Advance the test clock to exactly seven days and prove analytics is purged while the matching
      answer-key object remains.

---

## Phase 6: Implement Period-Scoped Overall Analytics Generation

**Goal:** Produce one institution-consistent overall snapshot and replace placeholder analytics
records with queued PDF generation.

- [x] Extend `get-analytics-kpis.ts`, `get-exam-completions.ts`, `get-incident-trends.ts`,
      `get-analytics-incident-severity.ts`, `get-analytics-incident-type.ts`, and
      `get-analytics-department-integrity.ts` under
      `app/sentinel-api/src/modules/general/analytics/data/` to accept required `institutionId`,
      `startAt`, `endAtExclusive`, and timezone/bucket granularity where relevant; remove the incident-
      trend fallback that silently reads data outside the requested period.
- [x] In the analytics data functions listed above, apply the approved field-specific date semantics
      to KPIs, attempts, incidents, trends, and
      department integrity, using half-open timestamp predicates to avoid end-of-day and duplicate-
      boundary errors.
- [x] Create `build-overall-analytics-snapshot.service.ts` in the analytics services directory to
      load all metrics against one explicit institution/period contract and return the typed renderer
      view model with institution name/branding.
- [x] Refactor `generateAnalyticsReportBodySchema` and response types in
      `app/sentinel-api/src/modules/general/analytics/analytics.dto.ts` to accept one overall PDF request
      with target institution and period; remove create-time `completion`/`incident`/`performance` and
      `csv`/`xlsx` choices while continuing to map legacy list rows.
- [x] Replace `AnalyticsService.generateReport()` so it creates a `PENDING` institution-owned row,
      sets `expires_at` only after successful completion to `completed_at + 7 days`, enqueues the UUID,
      and returns `202 Accepted` without setting `READY` or `file_url`.
- [x] Update generation/list/status/download/retry controllers to require role `support` and the
      appropriate `reports:generate`, `reports:view`, or `reports:export` permission; validate target
      institution scope consistently and filter legacy null-institution rows out of normal lists.
- [x] Update `getAnalyticsReportsData()` to filter directly on `analytics_reports.institution_id`,
      expose status/failure/expiry/retry fields, and stop deriving ownership from the creator's current
      profile while retaining the creator join only for display names.
- [x] In `app/sentinel-api/src/modules/general/analytics/analytics.service.ts` and
      `pdf-generation-job-processor.service.ts`, call `LogsService.createLog()` for requested, ready,
      failed, retried, downloaded, expired, and purged actions with report,
      institution, period, template, and actor IDs but without signed URLs or report contents.
- [x] Extend the co-located tests under `app/sentinel-api/src/modules/general/analytics/` for period
      boundaries, timezone buckets,
      institution isolation, one-snapshot mapping, `202 PENDING`, no `READY` before upload, PDF-only
      validation, legacy-row exclusion, status/download/retry permissions, and no-data reports.

**Migration required:** No — Phase 1 already extends `analytics_reports`.

### Phase 6 Verification

- [x] Run all `app/sentinel-api/src/modules/general/analytics` tests.
- [x] Generate 7-, 30-, 90-, and 366-day reports for two institutions and prove every extracted
      metric stays inside the selected institution and period.
- [x] Confirm the existing **No file available** state no longer occurs for a `READY` record.

---

## Phase 7: Implement Examination Answer-Key Generation

**Goal:** Generate long-lived, private answer-key PDFs from authorized unsanitized exam definition
data without exposing answers through ordinary exam-read contracts.

- [x] Add an answer-key-specific data loader under
      `app/sentinel-api/src/modules/general/pdf-documents/data/answer-keys/get-answer-key-source.ts` that
      verifies `exams.institution_id`, loads exam metadata/sections/questions directly from existing exam
      data functions, and returns unsanitized answers only after Support authorization.
- [x] Preserve `sanitizeQuestionForStudentAttempt()` in
      `app/sentinel-api/src/modules/examination/exams/services/student-question-sanitizer.service.ts`;
      do not add correct answers to general student/staff exam list responses or reuse the
      `viewer=student` route; keep the source loader private to the answer-key export service.
- [x] Add answer-key DTOs/routes to `pdf-documents.dto.ts` and `pdf-documents.routes.ts`, plus
      controllers under `app/sentinel-api/src/modules/general/pdf-documents/controllers/answer-keys/`,
      to create/list/status/download/retry/delete answer-key exports under
      `/pdf-documents/answer-keys`; require role `support` plus
      `examinations:export_answer_key`, validate the selected institution/exam relationship, and enqueue
      the export UUID with document kind `EXAM_ANSWER_KEY`.
- [x] In `pdf-generation-job-processor.service.ts`, resolve and snapshot the institution answer-key
      template and branding at request-processing time; retain the resulting PDF without automatic
      expiry and preserve historical output when the exam or published template later changes.
- [x] Update `app/sentinel-api/src/modules/examination/exams/services/delete-exam.service.ts` so an
      authorized Support answer-key delete removes its object/record and a hard exam deletion performs
      Storage cleanup before/after the database cascade, leaving no orphaned private object.
- [x] In the answer-key service and `pdf-generation-job-processor.service.ts`, call
      `LogsService.createLog()` for request, ready/failure/retry/download/delete and include exam,
      institution, template, export, and actor IDs without logging answer content.
- [x] Add `get-answer-key-source.test.ts`, answer-key service tests, and co-located controller tests
      for every question type, institution mismatch, non-Support
      denial, missing/deleted exam, unsanitized source availability only inside the service, template
      snapshot immutability, no automatic expiry, private download, deletion cleanup, and audit redaction.

**Migration required:** No — Phase 1 added `exam_answer_key_exports` and its relationships.

### Phase 7 Verification

- [x] Run focused answer-key API and renderer tests.
- [x] Generate an answer key for a mixed-question exam and confirm correct answers/rubrics appear in
      the PDF but remain absent from a student exam-detail response.
- [x] Delete the export and confirm the private object is removed and its old signed URL stops
      working after Storage propagation.

---

## Phase 8: Add Shared Service Clients and React Query Hooks

**Goal:** Expose typed PDF workflows to Sentinel Support without direct API calls or stale cross-
institution caches.

- [x] Create `packages/services/src/api/pdf-documents.ts` with exported, JSDoc-documented clients for
      templates, preview blobs, branding multipart upload/remove, answer-key create/list/status/download/
      retry/delete, and export signed-download responses; export it from the service package barrel.
- [x] Update `packages/services/src/api/analytics.ts` to use the overall PDF generation request,
      `202` lifecycle response, full status metadata, status/download/retry functions, and PDF-only types.
- [x] Create hooks under `packages/hooks/src/query/pdf-documents/` for resolved/global/institution
      templates, draft save, publish, reset, preview, branding, answer-key lists/status/create/retry/
      download/delete; export them through the hook package barrels.
- [x] Update `useGenerateAnalyticsReportMutation()` to accept institution/period, invalidate only the
      relevant report list, and show **Report queued** rather than claiming generation succeeded.
- [x] Update `useAnalyticsReportsQuery()` to include page/limit/institution/status in its query key
      and poll every five seconds only while the current page contains `PENDING` or `GENERATING` rows;
      stop polling when all rows are terminal.
- [x] Add `useAnalyticsReportDownloadMutation()` and retry mutation hooks that request signed URLs at
      click time rather than caching URLs beyond their five-minute lifetime.
- [x] Write `pdf-documents.test.ts` and co-located hook tests for URL/method/body/multipart contracts,
      blob preview handling, institution-specific cache keys, targeted invalidation, conditional polling,
      signed URL freshness, retry/delete behavior, and custom mutation callback preservation.

**Migration required:** No — clients and hooks consume existing API contracts.

### Phase 8 Verification

- [x] Run focused `packages/services` and `packages/hooks` Vitest files.
- [x] Switch between two institutions and prove cached templates, branding, report rows, and answer-
      key rows never cross-populate.

---

## Phase 9: Build the Support Report and PDF Template Workspaces

**Goal:** Give authorized Support staff a clear institution-scoped UI for report generation,
template overrides, branding, preview, answer-key export, status, retry, and download.

- [x] Update `app/sentinel-support/src/app/(protected)/analytics/reports/page.tsx` to use an overall-
      report dialog with required institution selector, title, 7/30/90/custom period controls, default
      30-day range, validation summary, and duplicate-submit prevention.
- [x] Update `analytics-reports-list.tsx` to show institution, period, truthful lifecycle, expiry,
      safe failure message, download, retry, and expired states; request signed URLs only when Support
      selects Download and remove the direct persisted `href` assumption.
- [x] Create `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/layout.tsx` and layout
      components modeled on Subject Management with persistent desktop sidebar and compact mobile nav;
      add **Report Template** and **Examination Answer Key** destinations.
- [x] Add `/pdf-templates/reports/page.tsx` with institution selector, global/institution scope
      indicator, header/footer form, institution-logo upload/remove, draft state, publish confirmation,
      reset-to-global action, unsaved-changes warning, and embedded/downloadable preview.
- [x] Add `/pdf-templates/examinations/page.tsx` with the separate answer-key header/footer form and
      preview plus an institution/exam selector and Generate Answer Key action; list persistent answer-
      key exports with status/download/retry/delete controls.
- [x] Extract shared form components under `pdf-templates/_components/` for header fields, footer
      fields, branding upload, template status/version, preview pane, publication dialog, and export
      status actions; do not expose body ordering controls.
- [x] Reuse `useInstitutionsQuery()` and `useExamsQuery({ institutionId, viewer: 'staff' })` for
      selectors, but disable exam queries until an institution is chosen and validate that returned exams
      belong to that institution.
- [x] Add **PDF Templates** to `app/sentinel-support/src/components/sidebar/support/constants/index.ts`
      under Configuration; update `support-sidebar.test.tsx` and new workspace-nav tests for active
      states, mobile layout, and permission-aware visibility.
- [x] Gate `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/reports/page.tsx`,
      `examinations/page.tsx`, and report-generation actions with the new active permissions and show a
      denied state when absent; the API
      remains authoritative and must still reject non-Support requests.
- [x] Update tests beside
      `app/sentinel-support/src/app/(protected)/(support)/control/_components/views/permission-registry-view.tsx`
      and the existing role-matrix tests where catalog grouping or Support blueprint display
      snapshots change; confirm the five permissions can be found by search and appear in the role matrix.
- [x] Add co-located `page.test.tsx` and component tests under the analytics reports and
      `pdf-templates` route directories for preset/custom dates, exact 366-day error, institution change reset,
      queued/generating/ready/failed/expired rows, polling stop, download freshness, retry, template
      fallback/override badges, draft/publish/reset, logo validation, preview, answer-key exam filtering,
      delete confirmation, access denial, and responsive navigation.

**Migration required:** No — Support UI consumes previous phases.

### Phase 9 Verification

- [x] Run `pnpm --dir app/sentinel-support test` and resolve only task-introduced failures.
- [ ] Manually verify the workflows at 375px, 768px, and 1280px widths for a Support account with and
      without each new permission.
- [x] Confirm no Support page imports an API client directly; all network access uses shared services
      and hooks.

---

## Phase 10: Cross-Layer Verification and Release Readiness

**Goal:** Prove secure, recoverable end-to-end generation and document the worker, retention, and
rollback operations before release.

- [ ] Add `app/sentinel-api/src/tests/pdf-documents/overall-report.integration.test.ts` that creates an
      overall report, processes its BullMQ job, validates
      the private Supabase object and extracted PDF content, authorizes download, expires it at seven
      days, runs cleanup, and receives `410` afterward.
- [ ] Add `app/sentinel-api/src/tests/pdf-documents/answer-key.integration.test.ts` that publishes an
      institution answer-key override, generates an
      answer key, changes the active template/exam afterward, and proves the original artifact/snapshot
      remains unchanged and unexpired.
- [ ] Add `app/sentinel-api/src/tests/pdf-documents/pdf-document-authorization.test.ts` proving
      Support permission checks, institution/exam ownership,
      template scope, branding scope, list, status, download, retry, delete, and signed URL issuance all
      reject mismatched institutions.
- [x] Add operational documentation at `docs/operations/pdf-generation.md` covering worker startup,
      queue metrics, failed-job investigation, safe retry, bucket privacy, seven-day cleanup, answer-key
      retention, orphan-object reconciliation, and service-key secrecy.
- [x] Update `app/sentinel-api/.env.example` with the variables below and document which have safe
      defaults versus required production values.
- [ ] Run `pnpm --dir app/sentinel-api test`, `pnpm --dir app/sentinel-support test`, focused shared
      package tests, `pnpm lint`, `pnpm format:check`, and affected workspace builds/typechecks.
- [ ] Verify PDF accessibility basics: meaningful text rather than screenshot-only pages, readable
      contrast, predictable heading order, repeated page numbers, logo text fallback, and no clipped text.
- [ ] Load-test representative 30-day and maximum 366-day reports plus a large mixed-question answer
      key; record render time, peak worker memory, PDF bytes/pages, queue latency, and whether concurrency
      two remains safe before tuning defaults.
- [x] Confirm logs contain no correct answers, report contents, signed URLs, service keys, or raw
      institution logo bytes.
- [x] Update this plan's checkboxes and verification notes throughout implementation as required by
      `.agents/workflows/to-do-workflow.md`.

**Migration required:** No — release verification uses the Phase 1 migration.

### Phase 10 Verification

- [ ] A `READY` record always has a verified private object and can obtain an authorized signed URL.
- [ ] `PENDING`, `GENERATING`, `FAILED`, and `EXPIRED` records never expose a download.
- [ ] Analytics artifacts are deleted at seven days and answer keys/templates/branding are not.
- [ ] Per-institution templates override the global publication without affecting other institutions.
- [ ] Analytics contains the mandatory Sentinel header and fixed overall body; answer keys contain
      correct answers and may use institution-only branding.
- [ ] Only Support with the new permissions can execute the new workflows.

<!-- NOTE: Phase 10 currently includes API hardening for template/branding/report/answer-key institution-scope checks, a focused route-level authorization test in `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts`, local non-DB queue/worker/cleanup verification in `queue/pdf-generation-queue.config.test.ts`, `queue/pdf-generation-queue.service.test.ts`, `queue/pdf-generation.worker.test.ts`, and `services/pdf-cleanup.service.test.ts`, plus log-hardening changes that remove storage object paths from `PDF_EXPORT_COMPLETED` audit details and trim report titles / branding storage coordinates from request-time audit payloads. The full DB-backed integration tests listed above remain open in this workspace because `testWithDbClient` cannot currently reach the configured Supabase/Prisma database. -->

<!-- VERIFICATION SNAPSHOT: locally verified in this workspace — worker startup/processing/shutdown behavior, queue defaults/submission/close behavior, analytics cleanup behavior, route-level institution-scope authorization, and log-payload minimization around report requests, answer-key requests, branding uploads, and PDF completion events. Still pending and environment-blocked here — DB-backed artifact creation/download/expiry assertions, end-to-end snapshot persistence checks, and release-only checks such as load testing, accessibility review, and full workspace validation. -->

### Phase 10 Remaining Work Handoff

- Restore database connectivity for `testWithDbClient`, then implement the three DB-backed PDF tests listed above:
    - overall report lifecycle/integration
    - answer-key snapshot persistence/integration
    - full PDF document authorization coverage
- After DB access is restored, run the broader validation set:
    - `pnpm --dir app/sentinel-api test`
    - `pnpm --dir app/sentinel-support test`
    - focused shared package tests
    - `pnpm lint`
    - `pnpm format:check`
    - affected builds/typechecks
- Perform release-only verification that cannot be proven from local unit tests:
    - PDF accessibility review
    - load testing for 30-day, 366-day, and large answer-key cases
    - final audit that lifecycle/download behavior matches the six Phase 10 verification bullets
- Keep the current log-minimization posture:
    - do not reintroduce signed URLs, storage paths, report titles, correct answers, or raw branding bytes into audit details or console logs unless a new operational requirement explicitly justifies it.

---

## Breaking API Changes

- `POST /analytics/reports` changes from `201 READY` with `{ title, type, format }` to `202 PENDING`
  with `{ institutionId, title, periodPreset | customDates, timezone }`.
- Analytics generation accepts only the overall PDF variant; `completion`, `incident`,
  `performance`, `csv`, and `xlsx` are rejected for new requests.
- Report list records stop treating `fileUrl` as durable state and expose lifecycle/expiry metadata;
  clients must call the authorized download endpoint to obtain a short-lived URL.
- Existing analytics metric endpoints may gain optional period fields, but their current callers must
  retain documented default behavior unless explicitly migrated in this task.
- New answer-key endpoints intentionally expose correct answers only through generated private PDFs;
  ordinary exam-detail response contracts do not change.

## New Dependencies

- `pdfkit` and `@types/pdfkit` for server-side deterministic PDF generation.
- `sharp` for authoritative raster image decoding, dimension enforcement, metadata stripping, and PNG
  normalization.
- A minimal PDFKit SVG adapter only if the trusted Sentinel SVG cannot be converted into and committed
  as an API-owned raster asset during implementation.

Do not add Puppeteer/Playwright/Chromium, client-side PDF generators, or arbitrary HTML renderers.

## Environment Variables

- `PDF_ARTIFACTS_BUCKET=sentinel-pdf-artifacts`
- `PDF_ASSETS_BUCKET=sentinel-pdf-assets`
- `PDF_GENERATION_QUEUE_NAME=pdf-generation`
- `PDF_WORKER_CONCURRENCY=2`
- `PDF_GLOBAL_CONCURRENCY=2`
- `PDF_JOB_ATTEMPTS=3`
- `PDF_JOB_BACKOFF_MS=5000`
- `PDF_JOB_TIMEOUT_MS=120000`
- `PDF_SIGNED_URL_TTL_SECONDS=300`
- `ANALYTICS_REPORT_RETENTION_DAYS=7`
- `PDF_MAX_REPORT_RANGE_DAYS=366`
- `PDF_MAX_ARTIFACT_BYTES` with a conservative documented default derived from load testing.
- Existing `REDIS_URL`, Supabase URL, and server-side Supabase service credentials remain required.

Production must not silently fall back to synchronous generation when Redis is absent. Startup or
job submission should fail clearly so records do not remain indefinitely `PENDING` without an
operator-visible error.

## Migration and Rollback Notes

- Forward migration must be additive first: create template/branding/answer-key tables, extend
  `analytics_reports`, backfill institution ownership, mark only unresolved legacy placeholders
  expired, add indexes/constraints, and create private buckets idempotently.
- Before rollback, stop the PDF worker and cleanup scheduler, prevent new generation requests, and
  export template/branding metadata needed for recovery.
- Rollback SQL must drop new FKs/indexes/tables, remove added analytics columns, and remove bucket
  policies. Do not automatically drop non-empty Storage buckets; first inventory and explicitly
  delete/migrate objects to prevent silent data loss.
- Application rollback must restore the old analytics request/response client and UI together. It
  must not restore the false behavior that marks null-file rows `READY`; disable generation instead
  if the new worker cannot run.
- Publishing is append/version based, so rolling back a template means publishing a new version from
  the previous snapshot rather than mutating history.

## Done Criteria

- Every phase's automated tests and verification checklist pass.
- Migrations apply and roll back safely in a disposable environment.
- The broken Generate New Report flow produces a real, private, downloadable overall PDF.
- All metrics are scoped to one explicit institution, one approved period, and Manila boundaries.
- `READY` is impossible before verified upload; failures are safe, visible, retryable, and audited.
- Analytics PDFs expire after seven days; answer keys and published templates persist as approved.
- Support can manage global and institution header/footer templates, institution logos, previews,
  report generation, and answer-key generation from the sidebar workspace.
- The Permission page and Support role matrix expose the five new capabilities, assigned only to
  Support by default.
- All question types and no-data/long-content/page-break fixtures render valid PDFs.
- No public report URL, correct answer, signed URL, service credential, or cross-institution data is
  exposed.

## Technical References

- Supabase private buckets require authenticated download or a time-limited signed URL:
  https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase signed URLs accept an explicit expiry in seconds:
  https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl
- BullMQ retry/backoff behavior:
  https://docs.bullmq.io/guide/retrying-failing-jobs
- BullMQ idempotent-job guidance and unique job IDs:
  https://docs.bullmq.io/patterns/idempotent-jobs and
  https://docs.bullmq.io/guide/jobs/job-ids
- BullMQ concurrency guidance for CPU-intensive processors:
  https://docs.bullmq.io/guide/workers/concurrency
- OWASP defense-in-depth file upload validation:
  https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
