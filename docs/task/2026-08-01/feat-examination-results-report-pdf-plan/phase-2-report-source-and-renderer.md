# Phase 2: Complete Report Source and PDF Renderer

### Phase 2: Complete Report Source and PDF Renderer

**Goal:** Produce a deterministic, unpaginated examination-report view model and a readable
multi-page PDF containing every assigned student and the required integrity-review detail.

## Prerequisite

- [ ] Confirm Phase 1 schema, shared contract, RBAC, and migration validation is complete.

## Tasks

- [ ] Refactor `getExamReport()` in
      `app/sentinel-api/src/modules/examination/reporting/services/get-exam-report.ts` so a new exported,
      JSDoc-documented `buildCompleteExamReport()` returns the sorted full report plus sections before
      search, section filter, or pagination; retain `getExamReport()` as the existing paginated HTTP
      projection to avoid an API behavior change.
- [ ] Extend
      `app/sentinel-api/src/modules/examination/reporting/services/map-reporting-response.test.ts` and
      add `get-exam-report.test.ts` beside the service to prove the complete builder contains more than
      100 students, preserves incident outcomes/remediations/finalization, and the existing page still
      slices/filter results correctly.
- [ ] Add
      `app/sentinel-api/src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.ts`
      with an exported, JSDoc-documented loader that calls the reporting access/context path, derives
      the institution/exam metadata and generator display name, and builds the full report without
      using the paginated HTTP client.
- [ ] Execute the source reads through one database transaction/consistent snapshot in
      `get-exam-report-export-source.ts`; keep student/report body data in memory only and return an
      unrecoverable error for a missing or out-of-scope examination.
- [ ] Add
      `app/sentinel-api/src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.test.ts`
      for complete-cohort loading, institution mismatch, assigned-instructor visibility, empty cohort,
      incident outcomes, lifecycle/remediation values, and generator identity fallback.
- [ ] Create
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-view-model.ts`
      with typed metadata, summary, students, sections, action totals, incident distributions, and a
      `generatedAt` value; add JSDoc to exported normalizers and use explicit null/empty formatting.
- [ ] Add a clearly sample-labelled fixture at
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/fixtures/exam-results-report.ts` for
      Support template preview only; include submitted, absent, in-progress, flagged, finalized,
      superseded, makeup, retake, and all incident-outcome states.
- [ ] Create
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-renderer.ts`
      using `renderPdfDocumentBuffer()`: render exam identity and summary first, then a repeated-heading
      student table with score/attempt/flag columns and pending/reviewed/confirmed/dismissed counts.
- [ ] In `exam-results-report-renderer.ts`, add an unconditional `doc.addPage()` after the student
      section before rendering additional insights; include incident type/severity distributions,
      section/outcome summaries derivable from the view model, action-queue totals, and examination
      window details without inventing unavailable values.
- [ ] In `exam-results-report-renderer.ts`, calculate row heights before drawing, repeat table
      headings after page breaks, split/shorten only explicitly allowed long fields, and render defined
      empty states for no students, no attempts, no incidents, and incomplete scores.
- [ ] Add
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/tests/exam-results-report-view-model.test.ts`
      for normalization, summaries, empty/null fields, and source-to-view-model mapping.
- [ ] Add
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/tests/exam-results-report-renderer.test.ts`
      that extracts PDF text and asserts report identity, all student names, flag outcome labels,
      additional-insights content, multiple pages, header/footer text, and no `[object Object]` output.
- [ ] Add a large-cohort renderer case (at least 250 students with long names/sections) to
      `exam-results-report-renderer.test.ts` and assert generation completes within the test timeout,
      every student identifier is extractable, and the output remains below the configured artifact
      size ceiling.

**Migration required:** No — this phase consumes the Phase 1 table/contracts and adds in-memory
source/view-model/rendering logic only.

## Validation

- [ ] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/reporting/services/get-exam-report.test.ts src/modules/examination/reporting/services/map-reporting-response.test.ts src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.test.ts src/modules/general/pdf-documents/rendering/tests/exam-results-report-view-model.test.ts src/modules/general/pdf-documents/rendering/tests/exam-results-report-renderer.test.ts`.
- [ ] Generate the sample fixture PDF through the renderer test helper, visually inspect every page
      for clipping/table headings/page break/header/footer/page numbers, and record the artifact path in
      the phase execution note.
- [ ] Run targeted ESLint on every new/changed Phase 2 TypeScript file and verify all exported
      helpers have JSDoc.

## Exit criteria

- The renderer receives every assigned student independently of HTTP pagination.
- Incident-review outcomes and action/remediation states appear in extractable PDF text.
- Additional insights start on a new page and all pages receive configured header/footer stamps.
- Empty and 250-student fixtures pass automated and visual checks before queue/API work begins.
