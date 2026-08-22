---
title: "Phase 5: Multi-Section Grading & Selective PDF Export"
type: phase
parent: "task-exam-scalability-integrity-architecture"
phase: "5"
status: completed
created: "2026-08-23"
tags: [task, phase, grading, multi-section, pdf-export, reporting]
---

# Phase 5: Multi-Section Grading & Selective PDF Export

## Objective

Enhance the examination grading dashboard and PDF export engine to support multi-section examinations. Allow instructors to filter student attempts by section and choose between generating a Master Exam Report (all sections combined with comparison tables) or a Section-specific PDF report.

---

## Dependencies & Prerequisites

- Phase 4 completed (Scoring integrity verified).
- Existing PDF generation queue and worker in `app/sentinel-api/src/modules/general/pdf-documents/`.
- Grading page and hooks in `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/` and reports export components.

---

## Impacted Files & Components

- [`app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.dto.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.dto.ts): DTO with optional `section_id` schema.
- [`app/sentinel-api/src/modules/general/pdf-documents/controllers/exam-reports/post-create-exam-report-export.controller.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/controllers/exam-reports/post-create-exam-report-export.controller.ts): PDF export endpoint.
- [`app/sentinel-api/src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.ts): Export data loader with optional section filtering.
- [`app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-view-model.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-view-model.ts): View model computing section stats.
- [`app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-renderer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-renderer.ts): PDF layout renderer.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/exam-report-pdf-export.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/reports/%5BexamId%5D/_components/exam-report-pdf-export.tsx): Reports export component with selective section payload support.
- [`app/sentinel-api/src/modules/general/pdf-documents/controllers/exam-reports/post-create-exam-report-export.controller.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/controllers/exam-reports/post-create-exam-report-export.controller.test.ts): PDF export tests.

---

## Implementation Tasks

- [x] **Task 5.1 (Extend PDF Export DTO with `section_id`):** In [`pdf-documents.dto.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.dto.ts), updated `createExamResultsReportExportBodySchema` and services interface to accept optional `section_id?: string`.
- [x] **Task 5.2 (Update Export Source Data Loader & View Model):** Updated [`getExamReportExportSource`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.ts) and [`mapSourceToViewModel`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-view-model.ts) to filter student rosters and format section titles when `section_id` is supplied, while computing full section comparison tables for master reports.
- [x] **Task 5.3 (Section Formatting & Page Breaks in PDF Renderer):** Verified that [`exam-results-report-renderer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-renderer.ts) renders section metrics, student section badges, and clean page breaks.
- [x] **Task 5.4 (Web UI Selective Export Integration):** Updated [`exam-report-pdf-export.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/reports/%5BexamId%5D/_components/exam-report-pdf-export.tsx) to accept an optional `sectionId` prop and pass it to the export mutation.
- [x] **Task 5.5 (Automated Tests for Selective PDF Export):** Added unit tests across [`post-create-exam-report-export.controller.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/controllers/exam-reports/post-create-exam-report-export.controller.test.ts), [`get-exam-report-export-source.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/pdf-documents/data/exam-reports/get-exam-report-export-source.test.ts), and [`exam-report-pdf-export.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/reports/%5BexamId%5D/_components/exam-report-pdf-export.test.tsx).

---

## Verification & Testing

```bash
# Run PDF documents test suite
pnpm --filter sentinel-api test src/modules/general/pdf-documents
# PASS: 32/32 test files passed, 164/164 tests passed

# Run web reports test suite
pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/exams/reports/
# PASS: 4/4 test files passed, 23/23 tests passed
```

---

## Risks & Rollback

- **Risk:** Older export requests without `section_id` payload failing in worker queue.
- **Mitigation:** Treat `section_id` as strictly optional with fallback to full master report.
- **Rollback:** Preserve current unpartitioned report builder logic.
