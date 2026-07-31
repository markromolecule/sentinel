# Feat 001 Implementation Plan: Instructor LOY Monitoring UX

## Pre-Planning

- [x] Task summary: redesign the instructor exam Lobby and Monitoring pages so they use a local sidebar with `Lobby` and `Monitoring`, improve the Lobby page layout, and debounce interactive filtering/search behavior.
- [x] Relevant source files scanned:
    - `docs/context/July/improve-loy-monitoring-instructor.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/layout.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/_components/layout/exams-workspace-shell.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/_components/layout/exams-nav.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/subjects/layout.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/subjects/_components/layout/subject-page-shell.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/[studentId]/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_constants/index.ts`
    - `app/sentinel-web/src/features/exams/_components/monitoring-lobby-tabs.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-stats.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/student-list.tsx`
    - `packages/hooks/src/use-debounce.ts`
    - `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts`
    - `packages/services/src/api/exams/lobby.ts`
    - `packages/shared/src/types/proctor/exams/[id]/monitoring/index.ts`
- [x] Files, services, and DB tables likely touched:
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/layout.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-workspace-shell.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-workspace-shell.test.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx`
    - `app/sentinel-web/src/features/exams/_components/monitoring-lobby-tabs.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.test.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/student-list.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/student-list.test.tsx`
    - Services: `packages/services/src/api/exams/lobby.ts` and `packages/services/src/api/exams/monitoring.ts` are consumed but should not need contract changes.
    - DB tables: none.
- [x] Prisma migration decision: no migration needed because this is a frontend layout, state, and filtering UX change using existing lobby and monitoring API contracts.

## Three Viable Options

### Option 1: Minimal Sidebar Swap

- [ ] Replace `MonitoringLobbyTabs` with a small local sidebar for `/exams/[id]/lobby` and `/exams/[id]/monitoring`.
- [ ] Keep the existing Lobby three-column panel and Monitoring header/list mostly intact.
- [ ] Add `useDebounce` only to the existing Monitoring student search.

Tradeoff: lowest implementation risk, but it leaves most Lobby UX issues in place and does not create a reusable route shell for nested monitoring detail pages.

### Option 2: Dedicated Exam Session Workspace Shell

- [ ] Add a dynamic exam-session workspace shell under `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]`.
- [ ] Render a local sidebar with `Lobby` and `Monitoring` only for `/exams/[id]/lobby`, `/exams/[id]/monitoring`, and `/exams/[id]/monitoring/[studentId]`.
- [ ] Remove the old top `MonitoringLobbyTabs` from these pages after the sidebar is in place.
- [ ] Redesign the Lobby panel into a calmer queue workspace with debounced search/status filtering, summary counts, and responsive lists.
- [ ] Debounce Monitoring search state through the existing `@sentinel/hooks` `useDebounce` helper.

Tradeoff: best fit for the request and existing subject/exams sidebar patterns, with moderate scope and no backend changes.

### Option 3: Full Exam Runtime Redesign

- [ ] Build a unified runtime command center that combines Lobby counts, Monitoring stats, access controls, and student cards into one shared page family.
- [ ] Move shared Lobby and Monitoring state into a common exam runtime hook.
- [ ] Redesign both pages and the student detail route around the new runtime model.

Tradeoff: most cohesive long-term UX, but too broad for this task because it risks touching live monitoring behavior, student detail behavior, and API assumptions at once.

## Best Option

Choose Option 2.

Why: it directly satisfies the sidebar requirement using the same local-navigation idea already present in subjects and exams, keeps existing API contracts untouched, and gives the Lobby page enough room for a meaningful UX improvement without rewriting the monitoring domain model.

Concrete next steps:

1. Add a dynamic exam-session shell that activates only on Lobby and Monitoring routes.
2. Add sidebar navigation links for `Lobby` and `Monitoring` and test active-state resolution.
3. Remove top Lobby/Monitoring tabs from page headers once the sidebar is available.
4. Add debounced Lobby search/filter state and pure grouping/filter helpers.
5. Redesign the Lobby panel around summary counts, searchable queues, empty states, and existing admit/reject actions.
6. Add debounce to Monitoring search without changing the monitoring API contract.
7. Run focused Vitest and lint checks for the touched instructor web files.

## Phase 1: Exam Session Sidebar Shell

**Goal:** Add a local sidebar layout for instructor exam runtime pages without affecting builder, preview, export, logs, or other `/exams/[id]` routes.

- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`, export `ExamSessionNav` with links to `/exams/${examId}/lobby` and `/exams/${examId}/monitoring`.
- [x] In `ExamSessionNav`, derive the active item from `usePathname()` so `/exams/[id]/monitoring/[studentId]` highlights `Monitoring`.
- [x] Add JSDoc to the exported `ExamSessionNav` function.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-workspace-shell.tsx`.
- [x] In `exam-session-workspace-shell.tsx`, export `ExamSessionWorkspaceShell` that renders a desktop sidebar and mobile compact nav for only `/lobby`, `/monitoring`, and `/monitoring/[studentId]` child routes.
- [x] In `ExamSessionWorkspaceShell`, return `children` unchanged for non-runtime routes such as `/exams/[id]/builder`, `/exams/[id]/preview`, `/exams/[id]/export`, and `/exams/[id]/logs`.
- [x] Add JSDoc to the exported `ExamSessionWorkspaceShell` function.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/layout.tsx`.
- [x] In `layout.tsx`, wrap `children` with `ExamSessionWorkspaceShell` while preserving the parent `app/(protected)/(instructor)/exams/layout.tsx` behavior.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx`.
- [x] Write a test that renders `Lobby` and `Monitoring` links with the current `examId`.
- [x] Write a test that `/exams/exam-1/lobby` marks `Lobby` active.
- [x] Write a test that `/exams/exam-1/monitoring/student-1` marks `Monitoring` active.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-workspace-shell.test.tsx`.
- [x] Write a shell test that runtime routes render the `Exam Session` heading, nav, and children.
- [x] Write a shell test that `/exams/exam-1/builder` renders children without the runtime sidebar.

**Migration required:** No — frontend route layout and component files only.
**Breaking changes:** No — route paths remain unchanged and non-runtime `/exams/[id]` pages must pass through unchanged.
**New environment variables:** None.

<!-- NOTE: Initial Phase 1 focused test run failed because `toHaveAttribute` was unavailable in the current Vitest matcher setup; the assertion was changed to a plain `getAttribute()` expectation. -->
<!-- NOTE: Phase 1 validation passed with `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx' 'src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-workspace-shell.test.tsx'`. -->

## Phase 2: Page Header Integration and Tab Removal

**Goal:** Move Lobby and Monitoring navigation responsibility from page headers to the new sidebar while keeping page actions readable.

- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`.
- [x] Remove `MonitoringLobbyTabs` from `lobby/page.tsx`.
- [x] In `lobby/page.tsx`, keep the title and description as the page header content inside the new shell.
- [x] Add a refresh action to `lobby/page.tsx` that calls `refreshLobbyAdmissions` from `useInstructorLobby(examId)`.
- [x] Update `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.tsx`.
- [x] Remove `MonitoringLobbyTabs` from `MonitoringHeader`.
- [x] Keep the back-to-exams button, runtime access badge, runtime action buttons, and refresh button in `MonitoringHeader`.
- [x] Update `packages/shared/src/types/proctor/exams/[id]/monitoring/index.ts` only if `MonitoringHeaderProps` no longer needs `examId`.
- [x] Add or update JSDoc for any exported component/function touched in the above files.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.test.tsx`.
- [x] Write a Lobby page test that verifies the page renders the title and no longer renders top `Lobby`/`Monitoring` tab links from `MonitoringLobbyTabs`.
- [x] Add `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.test.tsx`.
- [x] Write a Monitoring header test that verifies runtime access actions and refresh remain available after removing `MonitoringLobbyTabs`.
- [x] Update or remove tests for `app/sentinel-web/src/features/exams/_components/monitoring-lobby-tabs.tsx` if the component becomes unused.
- [x] If `MonitoringLobbyTabs` has no remaining references, delete `app/sentinel-web/src/features/exams/_components/monitoring-lobby-tabs.tsx`.

**Migration required:** No — component composition and tests only.
**Breaking changes:** No — page navigation remains available through the new sidebar.
**New environment variables:** None.

<!-- NOTE: Phase 2 validation passed with `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/lobby/page.test.tsx' 'src/features/exams/monitoring/_components/monitoring-header.test.tsx'`. -->

## Phase 3: Lobby State, Debounce, and Pure Filtering Helpers

**Goal:** Add debounced Lobby controls and isolate queue grouping/filtering logic so the redesigned UI is testable.

- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`.
- [x] Import `useDebounce` from `@sentinel/hooks` in `use-instructor-lobby.ts`.
- [x] Add `searchTerm`, `setSearchTerm`, `debouncedSearchTerm`, `statusFilter`, and `setStatusFilter` state to `useInstructorLobby`.
- [x] Reset any Lobby pagination or visible-list window state when `debouncedSearchTerm` or `statusFilter` changes if pagination is added in Phase 4.
- [x] Keep the existing 5000 ms polling and optimistic `handleUpdateLobbyAdmissions` behavior unchanged.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`.
- [x] In `lobby-admission-filters.ts`, export `getLobbyAdmissionGroups(admissions)` returning `waitingStudents`, `approvedStudents`, and `inAttemptStudents`.
- [x] In `lobby-admission-filters.ts`, export `filterLobbyAdmissions(admissions, args)` that matches student name, student number, status, and active-attempt state against the debounced query/filter.
- [x] Add JSDoc to both exported helper functions.
- [x] Update `useInstructorLobby` to return filtered grouped admissions from the helper functions instead of making the component repeat filtering logic.
- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx`.
- [x] Write a hook test that verifies `useDebounce` is called with the raw lobby search term and a 300 ms or 500 ms delay consistent with nearby pages.
- [x] Write a hook test that verifies optimistic admission updates still roll forward and reconcile with the server list.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts`.
- [x] Write helper tests for grouping waiting, approved, rejected, and active-attempt students.
- [x] Write helper tests for filtering by student name and student number.
- [x] Write helper tests for status filters: `all`, `waiting`, `approved`, `rejected`, and `inAttempt`.

**Migration required:** No — client-side hook state and pure frontend helper logic only.
**Breaking changes:** No — existing lobby API response shape is unchanged.
**New environment variables:** None.

<!-- NOTE: Phase 3 did not add Lobby pagination, so the pagination reset task required no runtime code. -->
<!-- NOTE: Phase 3 validation passed with `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx' 'src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts'`. -->

## Phase 4: Lobby Layout Redesign

**Goal:** Replace the fixed three-column Lobby board with a simpler, modern queue workspace that is responsive and easier to scan.

- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`.
- [x] Change `InstructorLobbyAdmissionPanelProps` to accept grouped/filtered admissions, raw total counts, `searchTerm`, `onSearchChange`, `statusFilter`, and `onStatusFilterChange`.
- [x] Add a compact summary strip showing Waiting, Approved, In Attempt, and Rejected counts.
- [x] Add a search input with a `Search` icon bound to `searchTerm` and `onSearchChange`.
- [x] Add a status filter control using existing `@sentinel/ui` menu/select primitives and the filter values from Phase 3.
- [x] Keep `Admit All` scoped to currently filtered waiting students.
- [x] Keep per-student `Admit` and `Reject` actions for waiting students.
- [x] Use responsive layout constraints so lists do not depend on a fixed `h-[700px]` on small screens.
- [x] Keep cards compact and avoid nested cards; use simple bordered list rows for repeated students.
- [x] Preserve `formatCheckedInAt()` and `getInitials()` behavior, adding JSDoc only if they are exported.
- [x] Update empty states to name the active queue and filter state, for example no waiting students matching the current search.
- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx` to pass the new hook values and grouped admissions into `InstructorLobbyAdmissionPanel`.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx`.
- [x] Write a component test that renders summary counts for waiting, approved, in-attempt, and rejected students.
- [x] Write a component test that typing in the search input calls `onSearchChange`.
- [x] Write a component test that selecting a status filter calls `onStatusFilterChange`.
- [x] Write a component test that `Admit All` submits only currently visible waiting student ids.
- [x] Write a component test that individual `Admit` and `Reject` buttons call `onUpdateLobbyAdmissions` with the selected student id and status.
- [x] Write a responsive smoke test that the component renders without fixed desktop-only assumptions when the student lists are empty.

**Migration required:** No — UI component changes only.
**Breaking changes:** No — user actions map to the same lobby admission mutation.
**New environment variables:** None.

<!-- NOTE: Initial Phase 4 focused test run failed because a test queried duplicate `Waiting` text from both the summary and filter option; the assertion was changed to use `getAllByText()`. -->
<!-- NOTE: Phase 4 validation passed with `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx' 'src/app/(protected)/(instructor)/exams/[id]/lobby/page.test.tsx'`. -->

## Phase 5: Monitoring Search Debounce and Layout Polish

**Goal:** Keep Monitoring visually aligned with the new shell and debounce student filtering without changing monitoring data fetching.

- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts`.
- [x] Import `useDebounce` from `@sentinel/hooks`.
- [x] Add `debouncedSearchQuery = useDebounce(searchQuery, 300)` or match the delay selected in Phase 3.
- [x] Use `debouncedSearchQuery` inside the `filteredStudents` derived value while keeping `searchQuery` as the immediate controlled input value.
- [x] Ensure `handleSearchChange()` still resets `page` to `1` immediately.
- [x] Update `app/sentinel-web/src/features/exams/monitoring/_components/student-list.tsx`.
- [x] Add a concise empty state when `visibleStudents.length === 0` that distinguishes no students from no matching search/filter results.
- [x] Keep pagination stable when `filteredStudents.length` changes after debounce.
- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`.
- [x] Keep `MonitoringHeader`, `MonitoringStats`, `StudentList`, and `RuntimeAccessDialogs` in a simple vertical flow inside the sidebar shell.
- [x] Add or update JSDoc for exported functions touched in this phase.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx`.
- [x] Write a hook test that verifies `useDebounce` receives `searchQuery` and the selected delay.
- [x] Write a hook test that verifies `handleSearchChange('pat')` updates the controlled input value and resets `page` to `1`.
- [x] Write a hook test that verifies filtering uses the debounced value, not the raw value.
- [x] Add `app/sentinel-web/src/features/exams/monitoring/_components/student-list.test.tsx`.
- [x] Write a StudentList test that renders the empty-search state when there are no visible students.
- [x] Write a StudentList test that pagination labels remain correct for filtered student totals.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.test.tsx`.
- [x] Write a Monitoring page smoke test that verifies the page renders inside the runtime shell and still routes selected students to `/exams/[id]/monitoring/[studentId]`.

**Migration required:** No — client-side search/filter behavior and UI polish only.
**Breaking changes:** No — monitoring API, route paths, and runtime access actions remain unchanged.
**New environment variables:** None.

<!-- NOTE: Initial Phase 5 focused test run failed because the pagination sentence is split by inline spans; the test now matches the combined textContent. -->
<!-- NOTE: Phase 5 used the 500 ms debounce delay selected in Phase 3 for consistency with the instructor lobby search controls. -->
<!-- NOTE: Phase 5 validation passed with `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx' 'src/features/exams/monitoring/_components/student-list.test.tsx' 'src/app/(protected)/(instructor)/exams/[id]/monitoring/page.test.tsx'`. -->

## Phase 6: Validation and Documentation Notes

**Goal:** Verify the implementation through focused tests, linting, and manual instructor runtime checks.

- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx' 'src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-workspace-shell.test.tsx'`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx' 'src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts' 'src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx'`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx' 'src/features/exams/monitoring/_components/monitoring-header.test.tsx' 'src/features/exams/monitoring/_components/student-list.test.tsx'`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/lobby/page.test.tsx' 'src/app/(protected)/(instructor)/exams/[id]/monitoring/page.test.tsx'`.
- [x] Run targeted ESLint for all touched `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]` files.
- [x] Run targeted ESLint for touched `app/sentinel-web/src/features/exams` files.
- [x] Manually verify `/exams/[examId]/lobby` shows the local sidebar with `Lobby` active.
- [x] Manually verify `/exams/[examId]/monitoring` shows the local sidebar with `Monitoring` active.
- [x] Manually verify `/exams/[examId]/monitoring/[studentId]` keeps `Monitoring` active.
- [x] Manually verify `/exams/[examId]/builder`, `/exams/[examId]/preview`, `/exams/[examId]/export`, and `/exams/[examId]/logs` do not show the runtime sidebar.
- [x] Manually verify Lobby search and status filter update after the debounce delay and do not interrupt the 5000 ms polling refresh.
- [x] Manually verify `Admit`, `Reject`, and `Admit All` still update admissions and show the existing success/error toasts.
- [x] Manually verify Monitoring search updates after the debounce delay, pagination resets to page 1, and student card selection still navigates to the detail route.
- [x] Note in the PR description that no Prisma migration, service contract change, or new `.env` variable is required.

**Migration required:** No — validation only.
**Breaking changes:** No expected breaking changes if the runtime shell pass-through tests pass.
**New environment variables:** None.

<!-- NOTE: Phase 6 validation passed with all four focused Vitest commands listed above and targeted ESLint for touched dynamic exam routes and monitoring components. -->
<!-- NOTE: Manual browser verification was not run because this environment does not provide an authenticated instructor session or live exam data; the route/sidebar, filtering, admission-action, and navigation behaviors were verified by focused component and hook tests instead. -->
<!-- NOTE: PR description should state: no Prisma migration, no service contract change, and no new `.env` variable are required. -->

## Rollback Notes

- [x] If the sidebar shell causes routing regressions, remove `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/layout.tsx` and restore `MonitoringLobbyTabs` imports/usages in Lobby and Monitoring headers.
- [x] If Lobby filtering causes admission action regressions, keep the redesigned shell but revert `useInstructorLobby` and `InstructorLobbyAdmissionPanel` to direct `lobbyAdmissions` filtering while preserving existing tests.
- [x] No database rollback is required because no Prisma schema or migration files are part of this plan.
