---
title: "Dashboard Name Normalization, Adjust Score Dialog UX & Sidebar Navigation Refinement"
type: task
status: completed
created: "2026-09-06"
tags: [task, feature, ui-ux, dashboard, reports, navigation]
---

# Dashboard Name Normalization, Adjust Score Dialog UX & Sidebar Navigation Refinement

## Outcome

1. Normalize user display names in the dashboard greetings across `sentinel-web`, `sentinel-core`, and `sentinel-support` so all-caps names (e.g. `"KEANNA"`) format in clean first-letter capitalization (`"Keanna"`).
2. Redesign the `AttemptReportOverrideDialog` into a spacious asymmetric 2-column modal (`w-[92vw] max-w-5xl`, `max-h-[88vh]`) featuring an expansive reader panel (left, ~62%) with sans-serif typography, word/character count metrics, and smooth scrolling for long essays, paired with a dedicated score adjustment panel (right, ~38%) and sticky footer controls. Synchronize/share with `sentinel-core`.
3. Rename the exam session navigation items in `sentinel-web` and `sentinel-core`:
   - "Attempt Summary" $\rightarrow$ "Summary"
   - "Action Queue" $\rightarrow$ "Actions"

## Pre-planning record

### Actors and goals

- **Instructor / Core Admin / Support Agent:** Wants an accurate, professional dashboard greeting formatted in title case rather than raw database uppercase text.
- **Instructor (Exam Grading & Report Review):** Wants an ergonomic Adjust Score dialog that provides ample breathing room to read long student essays without being cramped in a tiny monospace box, alongside clear score adjustment inputs and sticky action buttons.
- **Instructor (Exam Navigation):** Wants concise, single-word sidebar navigation items ("Summary", "Actions") that are quick to scan and uncluttered.

### Domain language

- **Dashboard Greeting:** Salutation component (`DashboardGreeting`) welcoming the logged-in user with time-sensitive greeting and formatted display name.
- **Attempt Report Override Dialog:** Modal dialog (`AttemptReportOverrideDialog`) allowing instructors to inspect question prompts, student answers, and apply score overrides with justifications.
- **Exam Session Navigation:** Sidebar component (`ExamSessionNav`) providing runtime and reporting navigation links for a given exam session.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | User logs into dashboard with uppercase name (`KEANNA`) | User profile has uppercase `fullName` | Greeting displays `"Good evening, Keanna!"` | Fallback to `"User"` if name empty | Completed |
| SC-02 | Instructor reviews student attempt with 1,000-word essay | Attempt report loaded, Adjust Score dialog opened | Dialog expands to `max-w-5xl`; essay displays in readable sans-serif with smooth scroll and word/char count; sticky footer remains accessible | Scrollbar remains contained within reader box | Completed |
| SC-03 | Instructor navigates exam session sidebar | Viewing exam runtime or report | Sidebar displays "Summary" and "Actions"; active highlighting and query params preserved | Fallback to active route resolution | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How should all-caps names be capitalized in `formatDisplayName`? | `firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()` | Converts `"KEANNA"` to `"Keanna"` while preserving single-word extraction. | Full-string title-casing (deviates from first-name convention). | [dashboard-greeting.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.tsx) |
| DEC-02 | What layout pattern should the Adjust Score dialog adopt for essays? | Asymmetric 2-Column with Scrollable Reader (62% Left / 38% Right) | Maximizes horizontal reading width for essay prompts/responses while keeping score inputs fixed. | Full-width stacked layout (pushes score inputs below fold); full-screen toggle (extra click). | [attempt-report-override-dialog.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/features/exams/reports/_components/attempt-report-override-dialog.tsx) |
| DEC-03 | What 1-word label replaces "Action Queue"? | "Actions" | User selected "Actions". Concise, describes students needing attention (review, makeup, retake). | "Queue", "Review", "Remediations". | [exam-session-nav.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx) |
| DEC-04 | How should sentinel-core be handled for the score dialog? | Provide shared/identical implementation of `AttemptReportOverrideDialog` | Instructors across both applications get identical high-quality experience. | Update sentinel-web only. | [attempt-report-override-dialog.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/features/exams/reports/_components/attempt-report-override-dialog.tsx) |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01 / DEC-01 | All dashboard greetings format names in title case (`"Keanna"`) across `sentinel-web`, `sentinel-core`, and `sentinel-support`. | Update `formatDisplayName` in `dashboard-greeting.tsx` across all 3 apps. | Vitest unit tests in all 3 apps. | Completed |
| AC-02 | SC-02 / DEC-02 | `AttemptReportOverrideDialog` expands to `max-w-5xl` with an asymmetric 2-column layout, word/character count, sans-serif reading typography, and smooth vertical scrolling (`max-h-[48vh]`). | Refactor `attempt-report-override-dialog.tsx`. | Component tests in `attempt-report-override-dialog.test.tsx` and `attempt-report-view.test.tsx`. | Completed |
| AC-03 | SC-02 / DEC-02 | Adjust Score dialog header and footer remain sticky so `Cancel` and `Done` buttons never scroll off-screen. | Sticky header/footer in dialog content flex wrapper. | DOM layout assertions & visual tests. | Completed |
| AC-04 | SC-03 / DEC-03 | Sidebar navigation items in `sentinel-web` and `sentinel-core` render "Summary" and "Actions". | Update `exam-session-nav.tsx` in both apps. | Vitest nav tests in both apps. | Completed |
| AC-05 | DEC-04 | `AttemptReportOverrideDialog` component is available and aligned in `sentinel-core`. | Implement/sync component in `sentinel-core`. | Vitest tests in `sentinel-core`. | Completed |

## Scope

- Normalize name capitalization in `dashboard-greeting.tsx` across `sentinel-web`, `sentinel-core`, and `sentinel-support`.
- Redesign `AttemptReportOverrideDialog` for optimal essay reading ergonomics and score adjustment in `sentinel-web` and `sentinel-core`.
- Rename navigation items in `exam-session-nav.tsx` across `sentinel-web` and `sentinel-core`.
- Update all associated unit test suites and navigation route assertions.

## Non-goals

- Altering backend API contracts, database schemas, or grading scoring calculators.
- Changing URL routing paths or query parameters (`?section=attempts`, `?section=queue`).
- Modifying student-facing examination runtime interfaces.

## Phases

- [x] `phase-01-dashboard-greeting-name-normalization.md` — Normalize greeting display names in `sentinel-web`, `sentinel-core`, and `sentinel-support`.
- [x] `phase-02-exam-session-sidebar-label-refinement.md` — Rename "Attempt Summary" $\rightarrow$ "Summary" and "Action Queue" $\rightarrow$ "Actions" in `sentinel-web` and `sentinel-core`.
- [x] `phase-03-adjust-score-dialog-ux-layout-overhaul.md` — Redesign `AttemptReportOverrideDialog` layout with wide reader panel, word count metrics, sans-serif typography, and sticky footer.
- [x] `phase-04-cross-portal-synchronization-and-verification.md` — Synchronize `AttemptReportOverrideDialog` to `sentinel-core` and execute end-to-end test suites.

## Verification

- Phase 1 Dashboard Greeting Tests:
  - `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.test.tsx` (PASS: 15/15)
  - `pnpm --filter sentinel-core test src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx` (PASS: 15/15)
  - `pnpm --filter sentinel-support test src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx` (PASS: 15/15)
- Phase 2 Exam Session Navigation Tests:
  - `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx` (PASS: 19/19)
  - `pnpm --filter sentinel-core test src/app/(protected)/exams/[id]/_components/exam-session-nav.test.tsx` (PASS: 8/8)
- Phase 3 Adjust Score Dialog Tests:
  - `pnpm --filter sentinel-web test src/features/exams/reports/_components/attempt-report-override-dialog.test.tsx` (PASS: 4/4)
  - `pnpm --filter sentinel-web test src/features/exams/reports/` (PASS: 15/15 across 4 test files)
- Phase 4 Cross-Portal Synchronization Tests:
  - `pnpm --filter sentinel-core test src/features/exams/reports/_components/attempt-report-override-dialog.test.tsx` (PASS: 4/4)
  - Full suite across all 3 portals: 91/91 tests passed across 11 test files.
  - ESLint verification: 0 errors across all touched files.

## Deviations

None.

## Result

All 4 phases successfully completed with zero errors and comprehensive test coverage across `sentinel-web`, `sentinel-core`, and `sentinel-support`.

