---
title: "Dashboard Name Normalization, Adjust Score Dialog UX & Sidebar Navigation Refinement"
type: context
status: ready
created: "2026-09-06"
tags: [context, enhancement, ui-ux, dashboard, reports, grading, navigation]
feature: "dashboard-name-score-dialog-sidebar-refinement"
---

# Dashboard Name Normalization, Adjust Score Dialog UX & Sidebar Navigation Refinement Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **All-Caps Dashboard Greeting Names:** In `sentinel-web`, `sentinel-core`, and `sentinel-support`, the dashboard greeting displays raw uppercase text from auth or database sources (e.g., `"Good evening, KEANNA!"` instead of `"Good evening, Keanna!"`). The formatting utility capitalizes the first letter but does not convert subsequent characters to lowercase.
  2. **Cramped Adjust Score Dialog for Long Essays:** In `sentinel-web` and `sentinel-core`, the `AttemptReportOverrideDialog` modal is constrained to `sm:max-w-3xl` (~768px) with a 50/50 two-column split and a restrictive `max-h-60` (240px) monospace container for student responses. For essay questions with extensive paragraphs, the text is severely crowded, difficult to read, and lacks proper reading ergonomics, word/character metrics, and scoring context.
  3. **Sidebar Label Length & Redundancy:** In the exam runtime/report sidebar (`exam-session-nav.tsx`) across `sentinel-web` and `sentinel-core`, "Attempt Summary" is unnecessarily verbose, and "Action Queue" takes two words where a concise single-word label is required to streamline the navigation hierarchy.

- **Business / User Value:**
  - Delivers a polished, human-centered welcome experience across instructor, core administrator, and support portals by presenting properly capitalized display names.
  - Significantly improves instructor grading and score adjustment productivity when reviewing long-form student essays, preventing visual fatigue, horizontal squishing, and vertical scroll claustrophobia.
  - Simplifies the exam session sidebar navigation with tight, consistent single-word labels (`Summary`, `Actions`).

- **Success Criteria:**
  - Dashboard greetings across all three web portals (`sentinel-web`, `sentinel-core`, `sentinel-support`) format names in Title Case / First-letter capitalized (`"KEANNA"` -> `"Keanna"`, `"support@sentinelph.tech"` -> `"Support"`).
  - The `Adjust Score` dialog expands to a spacious, responsive layout (`w-[92vw] max-w-5xl`, `max-h-[88vh]`) featuring:
    - An asymmetric 2-column layout:
      - Left column (~62% width): Dedicated Reader Panel with Question Header Badge (Question Number, Type, Points), readable high-contrast Question Prompt, and a Student Answer reader equipped with word/char count badges, clean sans-serif typography (`leading-relaxed`), and smooth vertical scrolling (`max-h-[48vh]`).
      - Right column (~38% width): Grading & Adjustment Card displaying Current vs. Max Score, numeric Override Score input, and an expanded Override Reason textarea (`min-h-[140px]`).
    - Sticky header and sticky footer (`Cancel` and `Done`) ensuring actions never scroll off-screen.
    - Full implementation available and shared/synchronized across both `sentinel-web` and `sentinel-core`.
  - The sidebar navigation items in `sentinel-web` and `sentinel-core`:
    - "Attempt Summary" is renamed to "Summary".
    - "Action Queue" is renamed to "Actions".
    - Active tab highlighting and URL parameters (`?section=attempts`, `?section=queue`) continue to function without regression.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- **US-01 (Clean Dashboard Personalization):**
  *As an authenticated user (instructor, core administrator, or support agent), I want my name on the dashboard greeting to be displayed in proper title case rather than all-caps, so that the greeting feels professional and personalized.*

- **US-02 (Comfortable Essay Review & Score Adjustment):**
  *As an instructor reviewing an exam attempt report, I want the Adjust Score dialog to provide an expansive, clear view of the student's essay answer and the question prompt with word/character metrics, so that I can read long student essays without struggling in a tiny, cramped box.*

- **US-03 (Concise Exam Session Navigation):**
  *As an instructor navigating between exam runtime monitoring and completed reports, I want the sidebar items to have clear, single-word labels ("Summary", "Actions"), so that the navigation rail is clean, scannable, and uncluttered.*

### Functional Requirements

1. **Dashboard Greeting Name Normalization (`sentinel-web`, `sentinel-core`, `sentinel-support`):**
   - Update `formatDisplayName` in:
     - `app/sentinel-web/src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.tsx`
     - `app/sentinel-core/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`
     - `app/sentinel-support/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`
   - Normalize word casing: ensure `firstName` transforms character 0 to uppercase and all subsequent characters to lowercase (e.g., `KEANNA` -> `Keanna`, `KEANNA CRUZ` -> `Keanna`, `MARC-ANTOINE` -> `Marc-antoine` or hyphen-split capital).
   - Update corresponding unit tests in all three apps to verify uppercase normalization.

2. **Adjust Score Dialog UX & Layout Overhaul (`sentinel-web`, `sentinel-core`):**
   - In `AttemptReportOverrideDialog`:
     - Expand modal dialog sizing: `w-[92vw] max-w-5xl` with `max-h-[88vh]` flex layout.
     - Asymmetric 2-column layout on desktop (`md:grid-cols-12` with 7/5 or 8/4 split):
       - **Left Panel (col-span-7 or 8, ~62% width): Reader Panel**
         - Header badges: Question Number (`Question 2`), Question Type (`ESSAY`, `MULTIPLE_CHOICE`, etc.), and Max Points (`5 pts`).
         - Question Prompt Card: High contrast text, clear visual hierarchy.
         - Student's Answer Section:
           - Header displaying word count and character count chips (e.g. `42 words • 286 characters`).
           - Comfortable reading typography: Sans-serif (`text-sm font-sans leading-relaxed text-slate-800 dark:text-slate-200`) instead of cramped monospace.
           - Smooth vertical scrolling (`max-h-[48vh]`) that comfortably handles essays of 500–2,000+ words.
           - Empty/unanswered state indicator (*"No answer provided"* italicized badge).
       - **Right Panel (col-span-5 or 4, ~38% width): Grading Adjustment Panel**
         - Current Score display (automated or awarded score vs max score).
         - Override Score numeric input with min/max bounds and validation.
         - Override Reason textarea with expanded minimum height (`min-h-[140px]`, `resize-none`) and helpful placeholder.
     - Sticky dialog header with title, subtitle, and close button.
     - Sticky dialog footer with `Cancel` and `Done` buttons.
   - Synchronize/share this component across both `sentinel-web` and `sentinel-core`.

3. **Sidebar Label Renaming (`sentinel-web`, `sentinel-core`):**
   - In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`:
     - Rename `'Attempt Summary'` -> `'Summary'`.
     - Rename `'Action Queue'` -> `'Actions'`.
   - In `app/sentinel-core/src/app/(protected)/exams/[id]/_components/exam-session-nav.tsx`:
     - Rename `'Attempt Summary'` -> `'Summary'`.
     - Rename `'Action Queue'` -> `'Actions'`.
   - Update navigation unit tests in both `sentinel-web` and `sentinel-core`:
     - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx`
     - `app/sentinel-core/src/app/(protected)/exams/[id]/_components/exam-session-nav.test.tsx`
     - `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx`

### Edge Cases & Failure Modes

- **Extremely Long Essays (1,000+ words):**
  - Content scrolls smoothly inside the student answer container without expanding the modal past `88vh`.
  - Dialog footer buttons (`Done`, `Cancel`) and header close icon remain fixed/sticky and accessible at all times.
- **Empty / Unanswered Questions:**
  - If a student left the essay blank, display an italicized empty badge (*"No answer provided"*) rather than an empty box.
- **Unusual Name Formats in Greeting:**
  - Names with special characters, prefixes, hyphens (e.g. `JEAN-LUC`, `D'ANGELO`, `support@sentinelph.tech`, `KEANNA`) normalize gracefully without crashing on empty strings or malformed inputs.
- **Sidebar Active Route Resolution:**
  - Renaming labels must NOT break the URL mapping or `resolveActiveSection` route matching logic (which relies on `id` and query params `?section=attempts` / `?section=queue`, not the display label).

---

## 3. Technical & Architectural Context

- **Affected Domains / Layers:**
  - Frontend UI components:
    - `app/sentinel-web`
    - `app/sentinel-core`
    - `app/sentinel-support`
- **Existing Files & Reference Symbols:**
  - Dashboard Greeting:
    - `app/sentinel-web/src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.tsx`
    - `app/sentinel-core/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`
    - `app/sentinel-support/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`
  - Score Override Dialog:
    - `app/sentinel-web/src/features/exams/reports/_components/attempt-report-override-dialog.tsx`
    - `app/sentinel-web/src/features/exams/reports/attempt-report-view.tsx`
    - `app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx`
  - Exam Session Navigation:
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/_components/exam-session-nav.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/_components/exam-session-nav.test.tsx`
- **Data Model & Schema Changes:** None. This is a pure UI/UX refinement.
- **Security & Authorization:** No trust boundary or permission changes.

---

## 4. UI/UX & Interaction Guidelines

- **Typography:**
  - Student essay responses switch from monospace (`font-mono`) to a clean, readable sans-serif font (`font-sans`) with generous line-height (`leading-relaxed`) and subtle background (`bg-slate-50/60 dark:bg-slate-900/50`) to maximize legibility.
- **Dialog Ergonomics:**
  - Responsive dialog modal: `w-[92vw] max-w-5xl` with `max-h-[88vh]`.
  - Word & character counter chip placed at top right of the student response container.
  - Clearly separated panels with distinct visual weighting.
- **Navigation:**
  - Compact, single-word labels in the exam sidebar: `Summary` and `Actions`.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Casing normalization in `dashboard-greeting.tsx` and unit tests across all 3 web apps (`sentinel-web`, `sentinel-core`, `sentinel-support`).
  - Dialog redesign and layout improvements for `AttemptReportOverrideDialog` in `sentinel-web` and sharing/porting to `sentinel-core`.
  - Renaming "Attempt Summary" -> "Summary" and "Action Queue" -> "Actions" in `exam-session-nav.tsx` across `sentinel-web` and `sentinel-core`.
  - Updating all affected test suites.
- **Out of Scope / Non-Goals:**
  - Modifying backend grading API schemas or endpoints (`/examination/grading/...`).
  - Altering rubric evaluation logic or scoring engines.
  - Changing routing paths or query parameter keys (`?section=attempts`, `?section=queue`).

---

## 6. References & External Context

- Context Factory Rule: `rules/typescript/ui/dialogs-and-overlays.md`
- Related Task Plans: `docs/task/June/2026-06-28/fix-score-override-implementation-plan-overriding-scores.md`
- Screenshots provided in user request: Dashboard header, Attempt Report Score Override dialog, Exam Session navigation rail.
