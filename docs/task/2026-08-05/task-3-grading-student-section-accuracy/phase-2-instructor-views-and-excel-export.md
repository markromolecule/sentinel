# Task 3 — Phase 2: Instructor Views and Excel Export

**Goal:** Display the canonical student section in both instructor grading applications and include the same value in every grades spreadsheet export.

- [x] Update `app/sentinel-core/src/app/(protected)/exams/grading/_components/student-columns.tsx` and `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/student-columns.tsx` to render `row.original.sectionName` from the corrected grading response; show the existing unassigned placeholder only when that API value is null.
- [x] Update `app/sentinel-core/src/app/(protected)/exams/grading/_hooks/use-export-grades.ts` and `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_hooks/use-export-grades.ts` so the `Section` worksheet column is sourced directly from `student.sectionName` and stays aligned with the rendered grading row.
- [x] Extend `app/sentinel-core/src/app/(protected)/exams/grading/_hooks/use-export-grades.test.tsx` and `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_hooks/use-export-grades.test.tsx` with a corrected multi-section response; assert the exported worksheet includes each student’s enrolled section, not `N/A` or the exam assignment section.
- [x] Extend the existing student-list tests in `app/sentinel-core/src/app/(protected)/exams/grading/[examId]/_components/grading-student-list.test.tsx` and `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/_components/grading-student-list.test.tsx` to render students from two sections and assert their section labels remain correct after filtering/searching.
- [ ] Run a manual instructor QA pass in both `sentinel-core` and `sentinel-web` using an examination assigned to multiple sections; compare the screen rows and downloaded Excel `Section` column against each student's enrollment.

**Migration required:** No — this phase consumes the corrected existing API data; no client contract or environment change is needed.
