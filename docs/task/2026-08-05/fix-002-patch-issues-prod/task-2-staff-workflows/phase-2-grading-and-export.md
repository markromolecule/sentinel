# Task 2 — Phase 2: Grading Actions and Section-Aware Export

**Status:** Implemented  
**Parent plan:** `docs/task/2026-08-05/fix-002-implementation-plan-patch-issues-prod.md`  
**Source issues:** Issue 3 and Issue 4 in `docs/context/August/4/patch-issues-prod.md`

## Goal

Ensure grading rows open the correct submission, editable attempts expose valid grading actions, and
the deployed grade export includes deterministic student section data.

## Analysis

The repository already has grading attempt-detail/update endpoints and section fields in the grading
student query. The UI intentionally hides `AttemptReportActions` when `editable` or
`hasSubmitHandler` is false, so the missing-button symptom likely comes from route wiring, attempt
state mapping, or permission handling. The current checkout shows PDF report export but no obvious XLSX
export; the production export request must be located before changing an assumed file.

## Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Pass the existing save handlers through the attempt report view, fix the row link, and
  append `sectionName` to the existing export serializer.
- **Tradeoff:** Fastest, but may leave legacy and current export paths with different contracts.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Define one report/grading row contract containing `attemptId`, editability/finalization
  state, and section fields; use it for UI actions and the located exporter with explicit multi-section
  semantics.
- **Tradeoff:** Requires coordinated API, mapper, UI, and export tests and may reveal legacy consumers.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Generate a server-side asynchronous grading report artifact from a normalized snapshot,
  with export columns versioned independently from the interactive grading UI.
- **Tradeoff:** Adds job/artifact lifecycle complexity that is not needed until export scale or repeatability
  becomes a demonstrated problem.

## Execution

**Recommendation:** Option B.

1. Trace the student row, attempt route, detail hook, action props, and update endpoint to identify the
   exact missing link.
2. Trace the production spreadsheet download request to its API/export serializer and confirm whether
   section data is already available or must be added to the contract.
3. Implement section-aware mapping and action wiring with explicit finalized/read-only behavior.

## Checklist

- [x] Trace the row action/link in `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/attempts-view.tsx` and related column definitions to confirm `attemptId` reaches `...[attemptId]/page.tsx`.
- [x] Trace `useAttemptReport()` in `app/sentinel-web/src/features/exams/reports/_hooks/use-attempt-report/index.ts` and `AttemptReportView` in `app/sentinel-web/src/features/exams/reports/attempt-report-view.tsx` to identify why `hasSubmitHandler` or `editable` becomes false.
- [x] Confirm finalized/read-only mapping against the API detail response and `app/sentinel-api/src/modules/examination/grading/services/get-grading-attempt-detail/`.
- [x] Wire `update-grading-attempt` and finalize behavior through `app/sentinel-api/src/modules/examination/grading/controllers/update-grading-attempt.controller.ts` and `app/sentinel-web/src/features/exams/reports/_hooks/use-attempt-report/index.ts`, preserving permission checks and query invalidation.
- [x] Keep `app/sentinel-web/src/features/exams/reports/_components/attempt-report-actions.tsx` explicit: show view/submission navigation for valid attempts, show edit/save actions only for editable attempts, and show a clear finalized message for locked attempts.
- [x] Add/extend tests for missing attempt ID, valid editable attempt, finalized attempt, handler wiring, save override, save-and-finalize, and API error display.
- [x] Confirm the export path in this checkout: `app/sentinel-api/src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.ts` and `app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-view-model.ts` are the active export source/serializer for the exam results artifact.
- [x] Trace the export route/serializer back to `app/sentinel-api/src/modules/general/pdf-documents/` and document the confirmed file path in this phase.
- [x] Ensure the export projection includes `sectionId` and human-readable `sectionName`; reuse the section join in `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts` where appropriate.
- [x] Define deterministic multi-section behavior (one row per section or a stable joined label) and apply it consistently in the API response, frontend mapper, and export serializer.
- [x] Add API/service fixtures for one section, no section, and multiple section assignments; add an export test that asserts the `Section` header and row values.
- [x] Run focused grading API/services, `packages/services` mapper tests, and report UI tests.
      **Production-like spreadsheet verification:** not exercised from this checkout because the repo exposes the exam-results PDF export pipeline rather than a separate XLSX exporter.
      **Migration required:** No — existing grading, section, attempt, and report schema is sufficient. Only add a migration if the confirmed exporter requires a new persisted field rather than an existing section relationship.

## Completion Gate

- [x] A student row with an attempt opens the correct submission.
- [x] Editable attempts show working grading actions; finalized attempts remain read-only.
- [x] The export includes `Section` and matches the grading UI for one- and multi-section fixtures.
- [x] The confirmed exporter path is documented and tested.
- [ ] Focused tests, downloaded-file verification, and any API contract decisions are recorded here.
