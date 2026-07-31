# Implementation Plan: Examination Results Report PDF

**Task summary:** Add a permission-controlled, examination-scoped PDF export that captures the
complete report dataset, renders a branded multi-page document, persists its lifecycle privately,
and is configurable from Sentinel Support.

## 1. The Context (1 Unified Definition)

The detailed examination report already calculates the required student, score, incident-outcome,
and action-queue data, but its HTTP projection is paginated and there is no examination-report PDF
document kind, renderer, export record, or lifecycle API. The implementation must reuse the existing
PDF template/queue/storage framework while preserving examination ownership, institution scope,
private artifacts, deterministic report data, and phase-by-phase test gates.

## 3. The Triad (3 Distinct Options)

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Store examination report jobs in `analytics_reports`, distinguish them through its
  existing `type` field, and add conditional rendering to the analytics processor and endpoints.
- **Tradeoff:** This is fast but couples period-based analytics and examination-scoped student
  reports to one ambiguous table, authorization model, retention path, and API contract.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add an `EXAM_RESULTS_REPORT` document kind, a dedicated `exam_report_exports`
  lifecycle table and processor, an unpaginated server-side report snapshot builder, shared client
  contracts/hooks, Support template controls, and report-page export actions.
- **Tradeoff:** This requires a migration and more initial files, but keeps report semantics,
  least-privilege authorization, retries, retention, and future report evolution explicit.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Stream a fresh PDF synchronously from the report endpoint on every click without
  storing export metadata or artifacts.
- **Tradeoff:** This avoids persistence but loses durable retries, history, auditability, worker
  isolation, signed-download behavior, and protection from large-cohort request timeouts.

## 1. The Execution (1 Chosen Path)

**The Recommendation:** Choose **Option B: The Strategic Path**.

- **The Justification:** A dedicated lifecycle fits the existing processor registry without
  overloading analytics semantics, isolates sensitive student report retention, and supports both
  sync and Redis generation modes without new dependencies. The additional migration is justified
  because examination ownership, template snapshots, retry state, and artifact expiry are durable
  domain data rather than transient UI state.
- **Next Steps:**
    1. Execute [Phase 1](phase-1-contracts-rbac-and-schema.md) to establish contracts, RBAC, and the
       export table.
    2. Execute [Phase 2](phase-2-report-source-and-renderer.md) to build a complete report view model
       and verified renderer.
    3. Execute [Phase 3](phase-3-export-processor-and-api.md) to add queue processing and protected
       lifecycle endpoints.
    4. Execute [Phase 4](phase-4-shared-client-lifecycle.md) to add shared services, hooks, and the
       reusable export lifecycle UI.
    5. Execute [Phase 5](phase-5-support-template-workspace.md) to add Support configuration and
       preview.
    6. Execute [Phase 6](phase-6-report-page-integration.md) to expose the flow in Web and Core.
    7. Execute [Phase 7](phase-7-retention-operations-and-release-validation.md) to close retention,
       operational, load, security, and visual verification.

## Pre-planning findings

- `getExamReport()` builds the complete report before applying search/section filters and slicing
  `students` to a maximum page size of 100. PDF generation must reuse the complete server-side
  representation, not repeatedly call the paginated HTTP endpoint.
- Student rows already contain `incidentOutcomes.pending`, `reviewed`, `confirmed`, and `dismissed`,
  plus remediation, lifecycle, score, and finalization data needed by the requested PDF.
- PDFKit rendering already stamps configured headers and footers over all buffered pages through
  `renderPdfDocumentBuffer()`.
- The PDF queue processor registry currently supports only `ANALYTICS_OVERALL` and
  `EXAM_ANSWER_KEY`; each has different persistence semantics.
- `pdf_templates.document_kind` is a string and its partial unique indexes already support another
  kind, but shared/API enums and built-in defaults must be extended.
- Existing report pages are `/exams/reports/[examId]` in `sentinel-web` and
  `/exams/[id]/report` in `sentinel-core`; both already use `useExamReportQuery()`.

## Chosen product and policy decisions

- New document kind: `EXAM_RESULTS_REPORT`.
- New permission: `examinations:export_results_report`, institution-scoped, initially included in
  Support, superadmin, admin, and instructor system-role blueprints. Exam visibility/assignment
  checks remain mandatory in addition to the permission.
- New persistence: `exam_report_exports`, not `analytics_reports`.
- Data semantics: build the complete report in a server-side consistent read at processing time;
  persist request/template metadata but do not duplicate the student report body as JSON in the
  database. The immutable PDF plus `completed_at` is the generated snapshot.
- Template precedence: institution-published override, global-published fallback, then a built-in
  `EXAM_RESULTS_REPORT` default.
- Retention: seven days after successful generation, matching analytics report artifacts; metadata
  remains for audit and the private object is removed on expiry.
- Surfaces: add the same export lifecycle to both Web and Core detailed report pages.
- Filtering: the initial PDF always represents the complete examination report. UI search,
  section filters, and table pagination do not alter export content.

## Phase map and stop rule

| Phase | Outcome                                           | Migration | Required stop gate                                      |
| ----- | ------------------------------------------------- | --------- | ------------------------------------------------------- |
| 1     | Contracts, permission, schema, generated DB types | Yes       | Schema/RBAC tests and DB generation pass                |
| 2     | Complete report source and multi-page renderer    | No        | Reporting and renderer tests pass; sample PDF inspected |
| 3     | Queue processor and protected lifecycle API       | No        | Processor/controller/integration tests pass             |
| 4     | Shared service, hook, and lifecycle presentation  | No        | Service/hook/UI tests pass                              |
| 5     | Support template configuration and preview        | No        | Support page/nav/permission tests pass                  |
| 6     | Web and Core report-page actions                  | No        | Both app page tests pass                                |
| 7     | Expiry, runbook, load/security/release validation | No        | Full targeted suite and manual release checklist pass   |

Do not begin a later phase until the current phase's validation commands and exit criteria pass or
the failure is recorded and explicitly accepted.

## Files, services, and tables in scope

- Shared contracts/RBAC: `packages/shared/src/schema/pdf-documents/`,
  `packages/shared/src/constants/permissions.ts`, and `packages/shared/src/constants/analytics.ts`.
- Database: `packages/db/prisma/schema.prisma`, a new Prisma migration, generated Kysely types,
  `exam_report_exports`, `pdf_templates`, `exams`, `institutions`, and `auth.users`.
- Reporting source: `app/sentinel-api/src/modules/examination/reporting/services/`.
- PDF backend: `app/sentinel-api/src/modules/general/pdf-documents/`.
- Shared clients: `packages/services/src/api/pdf-documents.ts`,
  `packages/hooks/src/query/pdf-documents/`, and a generic lifecycle component in `packages/ui`.
- Support: `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/`.
- Report pages: `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/` and
  `app/sentinel-core/src/app/(protected)/exams/[id]/report/`.
- Operations: `docs/operations/pdf-generation.md`, `app/sentinel-api/.env.example`,
  `app/sentinel-api/src/pdf-cleanup-process.ts`, and `app/sentinel-api/package.json`.

## Migration, API, environment, and rollback decisions

- **Migration required:** Yes. Add `exam_report_exports` with foreign keys, lifecycle timestamps,
  template/request snapshots, private storage coordinates, expiry, retries, and indexes on
  `exam_id`, `institution_id`, `template_id`, `status`, and `expires_at`.
- **Migration rollback:** Before production artifacts exist, drop `exam_report_exports` and remove
  its relations. After release, first delete `exam-reports/...` private objects and archive/export
  required audit metadata; then drop foreign keys, indexes, and the table. Removing the string
  document kind requires no PostgreSQL enum rollback.
- **API compatibility:** Additive endpoints and document-kind values only. Existing analytics and
  answer-key routes remain unchanged. Clients that exhaustively switch on `DocumentKind` must be
  updated in Phase 1.
- **Environment variables:** No new required variable. Reuse the existing PDF generation mode,
  queue, private artifact bucket, size, timeout, and signed-URL configuration. Retention is seven
  days in the initial implementation, matching the existing analytics policy.
- **Dependencies:** No new runtime dependency. Reuse PDFKit, BullMQ/direct processing, Kysely,
  Supabase private storage, TanStack Query, and Vitest.

## Overall done criteria

- Every phase file is complete and its validation gate passes.
- The selected exam produces an all-student report with explicit incident outcome counts and a
  deliberate page break before additional insights.
- Headers, footers, page numbers, empty states, and long rows render without clipping.
- Permission, exam ownership/assignment, institution scope, artifact scope, and signed-download
  rules are enforced by the API.
- Support can manage and preview the independent examination-results report template.
- Both Web and Core show consistent lifecycle states and can download the completed private PDF.
- Migration status, rollback, retention, no-new-environment decision, and operational verification
  are recorded.
