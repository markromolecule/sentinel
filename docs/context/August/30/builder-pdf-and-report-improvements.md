---
title: "Exam Builder, PDF Report Score, and Attempt Summary Enhancements"
type: context
status: ready
created: "2026-08-30"
tags: [context, builder, pdf, reports, sentinel-web, sentinel-core, sentinel-api]
feature: "builder-pdf-and-report-improvements"
---

# Exam Builder, PDF Report Score, and Attempt Summary Enhancements Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Exam Builder Header:** The `Publish` button on the exam builder header is premature in this workspace view; instructors require a clear `Back` navigation button to return to the exam management list while keeping `Save Draft`.
  2. **Blank Section Question Type Flow:** When a section in the exam builder has no questions and no question type selected, displaying the `Import from Bank` and `Add Question` buttons causes confusion and errors (since questions cannot be added without a question type). The question type selection dropdown should be prioritized on the right, and the action buttons should be suppressed until a type is chosen.
  3. **PDF Report Score Generation:** The student performance table in the generated Examination Results Report PDF erroneously appends a `%` sign directly to the raw points earned (e.g. displaying `14%` for a student who scored 14 out of 30 points, rather than `14 / 30`), and checks pass/fail against raw points rather than percentage.
  4. **Attempt Summary Search & Badging:** Typing in the search bar on the Attempt Summary report unmounts the entire page with a full-screen skeleton, disrupting user typing flow and losing input focus. Additionally, action badges (`Review`, `Retake`, `Makeup`) under the Student column duplicate information in the Status column.

- **Business / User Value:**
  - Streamlines the exam authoring flow, preventing invalid state creation by new instructors.
  - Generates accurate, professional assessment PDF reports with correct grade presentation for academic accreditation.
  - Delivers a responsive, non-jarring search experience in the reports dashboard and eliminates repetitive UI badges.

- **Success Criteria:**
  - The `Publish` button and related builder mutation triggers are removed from the Exam Builder header in both `sentinel-web` and `sentinel-core`, replaced with a `Back to Exams` button.
  - For empty/untyped sections, the question type dropdown is positioned prominently on the right, and `Import from Bank` and `Add Question` buttons are hidden until a question type is selected.
  - PDF report exports display student scores as `score / totalScore` (Format A: e.g., `14 / 30`), evaluate pass/fail against percentage, and correctly distinguish raw scores from percentage metrics.
  - Search input on Attempt Summary retains focus and displays table-level skeletons (`isLoading={isFetching}`) without unmounting the page.
  - Badges for `Review`, `Retake`, `Makeup`, `Locked`, etc. are cleanly positioned in the `Status` column, keeping the `Student` column clean.

---

## 2. Requirements & User Stories

### User Stories / Scenarios
- *As an instructor*, I want a "Back to Exams" button in the Exam Builder header, so that I can easily navigate back to my exam list after saving my draft.
- *As an instructor creating a new exam*, I want to be prompted to select a question type for an empty section first before seeing question creation actions, so that I understand sections must be type-scoped.
- *As an administrator or dean reviewing a PDF report*, I want the student score column to show the student's actual score out of total points (`14 / 30`), so that I do not mistake raw points for percentages.
- *As an instructor searching through hundreds of student attempts*, I want the search bar to remain interactive while the table updates smoothly with inline loading indicators, so that my typing is never interrupted.

### Functional Requirements
- [ ] **FR-1 (Builder Header Navigation):** Replace the `Publish` button in `ExamBuilderHeader` with a `Back to Exams` navigation button (pointing to `/exams`) across `sentinel-web` and `sentinel-core`. Retain the `Save Draft` button.
- [ ] **FR-2 (Builder Header Cleanup):** Remove unused `isPublishing` and `handlePublish` props from builder header components and hooks.
- [ ] **FR-3 (Section Type Selection Priority):** In `QuestionSectionCard`, when `!section.questionType`:
  - Place the question type dropdown on the right side of the section header.
  - Hide `Import from Bank` and `Add Question` header buttons.
  - In `EmptySectionState`, update the card body to guide the user to select a question type first instead of showing dead-end action buttons.
- [ ] **FR-4 (Section Action Restoration):** When `section.questionType` is selected, restore `Import from Bank` and `Add Question` buttons.
- [ ] **FR-5 (PDF Report Score Data Contract):** Include `totalScore` and `percentage` on `StudentAttemptRow` in `exam-results-report-view-model.ts`.
- [ ] **FR-6 (PDF Report Score Rendering):** In `exam-results-report-renderer.ts`, render the student's score in Format A as `${student.score} / ${student.totalScore ?? '—'}` and evaluate fail highlighting using `student.percentage !== null && student.percentage < data.passingScore`.
- [ ] **FR-7 (Attempt Summary Smooth Search):** Configure `useExamReportQuery` with `placeholderData: (prev) => prev` (or `keepPreviousData`) and update `ExamReportPageContent` to only trigger full-page skeleton if `isLoading && !report`. Pass `isLoading={isFetching}` to `DataTable` inside `AttemptsView`.
- [ ] **FR-8 (Attempt Summary Status Column Unification):** Remove `Review`, `Retake`, `Makeup`, and lifecycle badges from the `Student` column in `columns.tsx` and consolidate them into the `Status` column alongside the base status badge.

### Edge Cases & Failure Modes
- **Section with 0 questions but question type already selected:** Shows the action buttons (`Add Question`, `Import from Bank`) and allows changing the question type.
- **Section with > 0 questions:** Disables question type changing and maintains all question actions.
- **PDF Student with null score (Absent / In Progress):** Renders `—` in score column without crashing or displaying `null / null`.
- **Search Query with Rapid Keystrokes:** Input remains focused and debounce/deferred search prevents flickering or request race conditions.

---

## 3. Technical & Architectural Context

### Affected Domains & Layers
- **Web Frontend (`app/sentinel-web`):**
  - `src/app/(protected)/(instructor)/exams/[id]/builder/_components/exam-builder-header.tsx`
  - `src/app/(protected)/(instructor)/exams/[id]/builder/_components/exam-builder-screen.tsx`
  - `src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/use-builder-workspace-actions.ts`
  - `src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/_types.ts`
  - `src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx`
  - `src/features/exams/builder/_components/question-bucket-table/shared.tsx`
  - `src/features/exams/builder/_components/question-bucket-table/sectioned-question-bucket-table.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_components/columns.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_components/attempts-view.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_components/exam-report-page-content.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/index.ts`
- **Core Frontend (`app/sentinel-core`):**
  - `src/app/(protected)/exams/[id]/builder/_components/exam-builder-header.tsx`
  - `src/app/(protected)/exams/[id]/builder/_components/exam-builder-screen.tsx`
  - `src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/use-builder-workspace-actions.ts`
  - `src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/_types.ts`
  - `src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx`
  - `src/features/exams/builder/_components/question-bucket-table/shared.tsx`
  - `src/features/exams/builder/_components/question-bucket-table/sectioned-question-bucket-table.tsx`
- **Hooks Package (`packages/hooks`):**
  - `src/query/exams/use-exam-report-query.ts`
- **API Backend (`app/sentinel-api`):**
  - `src/modules/general/pdf-documents/rendering/exam-results-report-view-model.ts`
  - `src/modules/general/pdf-documents/rendering/exam-results-report-renderer.ts`

---

## 4. UI/UX & Interaction Guidelines

- **Exam Builder Header:**
  - Top Left: Exam Title (editable inline) and description.
  - Top Right: `Status Badge` (Draft / Published), `Save Draft` Button (`variant="outline"`), `Back to Exams` Button (`variant="outline"` with `ArrowLeft`).
- **Question Section Card (Untyped / Empty):**
  - Title: Section name (editable if custom).
  - Right: `Select question type` combobox / dropdown.
  - Action buttons (`Import from Bank`, `Add Question`) are hidden.
  - Empty body text: "Please select a question type for this section to start adding questions."
- **Question Section Card (Typed):**
  - Header: Section title and static type instruction.
  - Right: `Import from Bank` (`variant="outline"`) and `Add Question` (`variant="default"`), followed by Delete Section button.
- **Attempt Summary Table:**
  - `Student` column: Student Full Name (font-medium), Student Number (muted-foreground text-sm).
  - `Status` column: Status badge (Needs review / Submitted / Absent / In Progress) stacked with any secondary action flags (`Review`, `Retake`, `Makeup`, `Locked`, `Finalized`).
  - Search feedback: Keystrokes filter without unmounting search input; table shows skeleton rows while query fetches in background.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Removing Publish button and adding Back button in Exam Builder header.
  - Restructuring empty/untyped section header to prioritize question type dropdown on the right and hiding add/import buttons until selected.
  - Fixing PDF student row score formatting to Format A (`score / totalScore`) and fixing passing threshold evaluation.
  - Optimizing Attempt Summary search re-rendering using React Query placeholder data and table skeletons.
  - Consolidating student column tags into the status column.
  - Synchronizing changes across `sentinel-web`, `sentinel-core`, `sentinel-api`, and `packages/hooks`.
- **Out of Scope / Non-Goals:**
  - Modifying exam publishing logic in the backend (the exam publishing endpoint remains intact for publish flows from exam settings / list).
  - Altering student exam-taking runtime or question response scoring logic.

---

## 6. References & External Context

- Reference Screenshots:
  - Exam Builder Header & Empty Section: `media_1788099916823.png`, `media_1788100098766.png`
  - PDF Generation Score Column: `media_1788100403763.png`
  - Attempt Summary Search & Columns: `media_1788100446948.png`, `media_1788100471225.png`
