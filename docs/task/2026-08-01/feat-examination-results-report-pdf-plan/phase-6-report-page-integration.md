# Phase 6: Web and Core Report-Page Integration

### Phase 6: Web and Core Report-Page Integration

**Goal:** Expose the same permission-aware examination-report PDF lifecycle from both detailed
report pages without allowing UI pagination or filters to change export scope.

## Prerequisite

- [ ] Confirm Support template preview/publish and Phase 5 tests pass.

## Tasks

- [ ] Add an `ExamReportPdfExport` client component under
      `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/exam-report-pdf-export.tsx`
      that composes the Phase 4 hooks and lifecycle panel using only `examId`; require
      `examinations:export_results_report` for visible/enabled actions.
- [ ] Render the Web export component in
      `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/overview-view.tsx`
      beside Refresh Report with the label **Export Results PDF**; do not pass search, section, active
      tab, or student page state into the create payload.
- [ ] Add
      `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/exam-report-pdf-export.test.tsx`
      for hidden/denied permission, create, polling statuses, ready download, failed retry, expired,
      delete, popup-blocked/error feedback, and unchanged full-exam request payload.
- [ ] Extend
      `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx` to verify
      the action is available on the overview and does not alter/refetch the paginated report table as
      a source for generation.
- [ ] Add the equivalent component at
      `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/exam-report-pdf-export.tsx`
      using the same shared hooks/presentation and permission.
- [ ] Render it in `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.tsx` beside Refresh
      Report with identical labels and lifecycle copy.
- [ ] Add
      `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/exam-report-pdf-export.test.tsx`
      and extend `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.test.tsx` for the same
      permission, create, terminal, retry, download, delete, and error states.
- [ ] Handle API `403` after a stale client permission by closing/disabling export actions,
      invalidating active-permissions data through the existing permission hook pattern, and displaying
      a non-sensitive denial message in both app components.
- [ ] Ensure signed URLs are opened with `noopener,noreferrer`, are requested only on explicit
      download, and are never stored in query cache/local storage or included in toast/error text.

**Migration required:** No — both apps consume the established Phase 3/4 contracts.

## Validation

- [ ] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/reports/[examId]'`.
- [ ] Run `pnpm --dir app/sentinel-core exec vitest run 'src/app/(protected)/exams/[id]/report'`.
- [ ] Run targeted lint and TypeScript/build validation in `sentinel-web` and `sentinel-core`.
- [ ] Manually verify an authorized assigned instructor and administrator can create/download, while
      a user lacking the permission and an instructor not assigned to the exam cannot do so even by
      calling the API directly.

## Exit criteria

- Web and Core present identical lifecycle semantics and labels.
- Export requests contain only the route examination ID and always represent the complete report.
- UI denial and stale-permission states match API enforcement with no signed-URL leakage.
