# Phase 5 — Instructor Report Navigation

## Task Summary

Make instructor Overview, Attempt Summary, Action Queue, and Incident Logs render under one sidebar with URL-derived active state.

## 1. The Context

Report routes are wrapped by `ExamSessionWorkspaceShell`, but `ExamReportPageContent` also renders `ReportNavigation`, producing two competing navigation implementations. The outer navigation reads `?section=...`, while the inner navigation changes local state without updating the URL, so the highlighted item can disagree with the displayed report view.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Hide one sidebar with CSS and keep local report state.
- **Tradeoff:** Duplicate navigation logic remains and browser history/deep links still drift.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Keep `ExamSessionNav` as the single rendered navigation and derive report content exclusively from the canonical `section` query parameter.
- **Tradeoff:** Report hook tests and mobile navigation behavior must be updated together.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Create nested routes for each report section instead of query parameters.
- **Tradeoff:** Produces cleaner URLs but requires route moves and compatibility redirects beyond the immediate UI bug.

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** The outer sidebar already supports runtime and report routes and has active-link tests. Making the URL the sole state source removes the confirmed duplicate-render/state divergence with minimal routing churn.
- **Next Steps:**
    1. Remove the duplicate report navigation renderer.
    2. Make section selection URL-driven and validated.
    3. Test active items, deep links, browser history, and detailed attempt routes.

### Phase 5: Unify Report Sidebar and Active Section State

**Goal:** The visible report view and highlighted sidebar item always represent the same canonical URL.

- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/exam-report-page-content.tsx`, remove `ReportNavigation` and its nested flex/sidebar wrapper so `ExamSessionWorkspaceShell` is the only navigation/layout owner.
- [x] Delete `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/report-navigation.tsx` after all consumers are removed; preserve mobile access through `ExamSessionNav` rendered by the workspace shell.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/index.ts`, replace mutable `activeSection` state with a validated value derived from `useSearchParams()` and expose a URL-updating action only if report content itself needs section controls.
- [x] Add a JSDoc-documented pure `resolveExamReportSection()` helper beside the report constants to map missing/invalid parameters to `overview` and keep detailed attempt routes mapped to `attempts`.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`, use the same resolver for `overview`, `attempts`, `queue`, and `logs`; keep `/exams/reports/:examId/:attemptId` active on Attempt Summary.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-workspace-shell.tsx`, verify report routes render exactly one desktop and one responsive/mobile representation, with no nested negative-margin workspace.
- [x] Extend `exam-session-nav.test.tsx`, `exam-session-workspace-shell.test.tsx`, and `reports/[examId]/_hooks/use-exam-report/index.test.tsx` for overview default, Attempt Summary, Action Queue, Incident Logs, invalid section fallback, detailed attempt, browser back/forward, and exactly-one-sidebar assertions.
- [x] Add/update `reports/[examId]/page.test.tsx` to assert each query-selected view renders while its matching navigation link is active.
      **Migration required:** No — navigation is entirely URL and component state.

## Done Criteria

- [x] Report pages contain one navigation owner, not nested/duplicated sidebars.
- [x] Attempt Summary highlights for `section=attempts` and detailed attempt routes.
- [x] Action Queue highlights for `section=queue`; Incident Logs highlights for `section=logs`.
- [x] Refresh and browser back/forward preserve the visible section and active item.
- [x] Invalid or missing section parameters deterministically render Overview.

## Additional Considerations

- **Breaking API changes:** None.
- **New environment variables:** None.
- **Migration rollback:** Not applicable.
- **Compatibility:** Retain current query URLs so existing links and bookmarks continue to work.
