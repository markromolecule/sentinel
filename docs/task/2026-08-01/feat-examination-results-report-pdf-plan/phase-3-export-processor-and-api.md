# Phase 3: Export Processor and Protected Lifecycle API

### Phase 3: Export Processor and Protected Lifecycle API

**Goal:** Connect examination report rendering to the existing sync/Redis processor framework and
expose a fully scoped create/list/status/retry/download/delete lifecycle.

## Prerequisite

- [ ] Confirm the Phase 2 full-source and renderer test/visual gate is complete.

## Tasks

- [ ] Create
      `app/sentinel-api/src/modules/general/pdf-documents/queue/processors/exam-results-report.processor.ts`
      implementing `PdfDocumentProcessor` for `exam_report_exports`, loading the full report source,
      rendering it, writing to `exam-reports/{institutionId}/{examId}/{exportId}.pdf`, setting seven-day
      expiry, and classifying missing/scope-invalid source data as unrecoverable.
- [ ] Register `ExamResultsReportDocumentProcessor` in
      `app/sentinel-api/src/modules/general/pdf-documents/queue/processors/pdf-processor.registry.ts`
      and remove the Phase 1 temporary unsupported assertion.
- [ ] Update document-kind unions in
      `app/sentinel-api/src/modules/general/pdf-documents/queue/pdf-generation-job-processor.service.ts`,
      `pdf-generation-queue.service.ts`, `pdf-generation.worker.ts`, and
      `processors/pdf-document-processor.interface.ts`; keep `PENDING/FAILED -> GENERATING -> READY`
      idempotency and template snapshot behavior shared.
- [ ] Extend `queue/processors/pdf-processor.registry.test.ts`,
      `queue/pdf-generation-queue.service.test.ts`, and `queue/pdf-generation.worker.test.ts` for the
      new kind, sync/Redis submission, duplicate-ready skip, failure status, and retry-count behavior.
- [ ] Add
      `app/sentinel-api/src/modules/general/pdf-documents/queue/processors/exam-results-report.processor.test.ts`
      for source mapping, private storage path, seven-day expiry, template snapshot, and recoverable/
      unrecoverable errors.
- [ ] Add a JSDoc-documented `requireAllPdfDocumentPermissions()` assertion to
      `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-document-authorization.service.ts`
      and extend `pdf-document-authorization.service.test.ts` to distinguish any-of template access
      from all-of permission checks plus resource-scope checks.
- [ ] Create controller files under
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/exam-reports/` for
      `post-create-exam-report-export`, `get-exam-report-exports`,
      `get-exam-report-export-status`, `post-exam-report-export-retry`,
      `get-exam-report-export-download`, and `delete-exam-report-export`.
- [ ] In the create controller, require `examinations:export_results_report`, load the exam to
      derive its institution, call the same instructor ownership/assignment visibility logic used by
      reporting, resolve/snapshot `EXAM_RESULTS_REPORT`, insert `PENDING`, submit the job, and audit only
      identifiers—not report/student body data.
- [ ] In list/status/retry/download/delete controllers, require the same dedicated permission,
      load the export before responding, and enforce institution plus examination visibility; return
      `404` rather than leaking existence when resource scope fails where repository conventions
      require it.
- [ ] In the download controller, accept only `READY` and non-expired records with storage
      coordinates, generate a short-lived signed URL, and never return `storage_bucket` or
      `storage_path` in the public record DTO.
- [ ] In retry, allow only `FAILED`; clear failure/storage state and resubmit without changing the
      originally requested exam. In delete, remove the private object first when present, then delete
      the record transactionally/idempotently and audit identifiers.
- [ ] Register all six routes in
      `app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.routes.ts` and ensure OpenAPI
      responses cover 202/200/400/403/404/409/410/500 as applicable.
- [ ] Add one colocated controller test beside each new controller for permission denial, wrong
      institution/exam scope, valid response, invalid lifecycle transition, signed-download gating,
      and storage deletion failure behavior.
- [ ] Extend
      `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-document-api.integration.test.ts`,
      `pdf-document-scope-authorization.test.ts`, and
      `pdf-generation-queue-and-cleanup.integration.test.ts` with a create-to-ready-to-download flow,
      instructor assignment checks, cross-institution denial, failed retry, delete, and both generation
      modes.

**Migration required:** No — Phase 3 uses the `exam_report_exports` migration created and applied
in Phase 1.

## Validation

- [ ] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/general/pdf-documents/queue src/modules/general/pdf-documents/controllers/exam-reports src/modules/general/pdf-documents/tests/pdf-document-api.integration.test.ts src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts src/modules/general/pdf-documents/tests/pdf-generation-queue-and-cleanup.integration.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-api lint` and `pnpm --dir app/sentinel-api build`.
- [ ] Exercise one sync-mode request locally and confirm the record transitions to `READY`, the
      object is private, and a newly requested signed URL downloads the expected PDF.

## Exit criteria

- All lifecycle transitions and failure cases are tested.
- Every endpoint enforces both dedicated permission and exam/resource scope.
- Sync and Redis submission use the same processor contract.
- No student body, PDF content, signed URL, or storage credential appears in logs.
