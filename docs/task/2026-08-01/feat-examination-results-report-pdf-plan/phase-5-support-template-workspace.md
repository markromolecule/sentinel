# Phase 5: Support Examination-Report Template Workspace

### Phase 5: Support Examination-Report Template Workspace

**Goal:** Let authorized Support users configure, preview, publish, and reset an independent
examination-results report template using established global/institution fallback behavior.

## Prerequisite

- [x] Confirm Phase 4 shared client packages pass tests and builds.

## Tasks

- [x] Add `examination-reports` to `PdfTemplateSection` and `NAV_ITEMS` in
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/pdf-template-nav.tsx`
      with the label **Examination Report** and route `/pdf-templates/examination-reports`; keep
      **Overall Report** and **Examination Answer Key** labels unambiguous.
- [x] Update
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/pdf-template-nav.test.tsx`
      and the workspace shell/layout resolution to assert all four destinations and correct active
      state.
- [x] Create
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/examination-reports/page.tsx`
      using `ReportTemplateEditor` and the existing draft/publish/reset hooks with document kind
      `EXAM_RESULTS_REPORT`.
- [x] In the new page, provide global fallback plus accessible institution override selection
      constrained by `useAcademicScope()`; require `pdf_templates:view` to view and
      `pdf_templates:manage` to save/publish/reset, without conflating those permissions with report
      export permission.
- [x] Extend `previewPdfTemplateBodySchema` and
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/preview-pdf-template.controller.ts`
      so `EXAM_RESULTS_REPORT` preview renders the clearly sample-labelled Phase 2 fixture with the
      unsaved header/footer settings; keep analytics and answer-key branches unchanged.
- [x] In `preview-pdf-template.controller.ts`, apply the same global/institution template scope
      rules used by the new page and ensure preview logs/errors contain no fixture student names or PDF
      body content.
- [x] Create
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/preview-pdf-template.controller.test.ts`
      for new-kind permission, scope, sample label, and PDF content response.
- [x] Add
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/examination-reports/page.test.tsx`
      for permission denied, view-only controls, global fallback, institution override, dirty draft,
      preview payload, publish, reset, errors, and popup-blocked behavior.
- [x] Extend
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/report-template-editor.test.tsx`
      only where the new page exposes a reusable editor state not already covered.
- [x] Verify the catalog-driven Permission Registry and Role Matrix render
      `examinations:export_results_report`; add assertions to the existing Support permission/role page
      tests rather than hardcoding a duplicate permission list in the PDF template page.

**Migration required:** No — the `EXAM_RESULTS_REPORT` document kind uses the existing string-based
`pdf_templates` table and Phase 1 schema migration.

## Validation

- [x] Run `pnpm --dir app/sentinel-support exec vitest run 'src/app/(protected)/(support)/pdf-templates'`.
- [x] Run the focused API preview controller test for `EXAM_RESULTS_REPORT`.
- [x] Run `pnpm --dir app/sentinel-support lint` and `pnpm --dir app/sentinel-support build`.
- [x] Manually preview global and institution override configurations and inspect header, footer,
      branding, confidentiality text, sample label, page break, and page numbers.

Validation note: `pnpm --dir app/sentinel-support build` passed on August 1, 2026, but
`pnpm --dir app/sentinel-support lint` is still failing because of unrelated pre-existing Support
workspace issues outside this Phase 5 scope.

## Exit criteria

- The examination report has an independent, clearly named Support template destination.
- Draft/publish/reset/fallback and preview work under correct permissions and institution scope.
- The preview is explicitly sample data and cannot be confused with an actual exam export.
