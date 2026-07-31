# Implementation Plan: Replicate New Monitoring and Lobby Pages in Sentinel Core

## Task Summary

Replicate the latest instructor monitoring and lobby page implementation from `sentinel-web` into `sentinel-core` as a 1-to-1 copy, including UI, behavior, tests, and the current TypeScript fix for `MonitoringHeaderProps`.

## Pre-Planning Findings

- Source monitoring route: `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`.
- Target monitoring route: `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.tsx`.
- Source lobby route: `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`.
- Target lobby route: `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/page.tsx`.
- Source monitoring components already exist in both apps, but `sentinel-core` changed `MonitoringHeader` to require `examId` and render `MonitoringLobbyTabs`, while shared `MonitoringHeaderProps` does not include `examId`.
- Source lobby implementation includes search, status filtering, grouped admissions, a rejected queue, refresh action, and tests that `sentinel-core` does not yet match.
- Services and hooks already used by both apps: `getExamLobbyWaitingList`, `updateExamLobbyAdmissions`, `updateExamRuntimeAccess`, `useExamMonitoringOverviewQuery`, and `useOverrideReconnectLimitMutation`.
- DB tables involved by existing services: `exam_lobby_admissions`, exam attempts/session tables used by the existing monitoring APIs, and exam runtime access fields. No schema change is required.

## 1-3-1 Architectural Decision

### Viable Options

#### Option 1: Direct Source Parity Copy from `sentinel-web` to `sentinel-core` (Recommended)

- Copy the current `sentinel-web` instructor monitoring and lobby files into the equivalent `sentinel-core` paths.
- Remove the core-only `MonitoringLobbyTabs` dependency from the monitoring header and lobby page to match `sentinel-web`.
- Add missing `sentinel-core` tests by mirroring the existing `sentinel-web` tests.
- **Tradeoff:** Fastest and most faithful to the requirement, but any intentionally core-specific tab navigation will be removed unless separately reintroduced later.

#### Option 2: Preserve Core Navigation While Fixing Types

- Add `examId?: string` to `MonitoringHeaderProps` in `packages/shared/src/types/proctor/exams/[id]/monitoring/index.ts`.
- Keep `MonitoringLobbyTabs` in `sentinel-core` and only copy the newer lobby search/filter functionality.
- **Tradeoff:** Keeps the current core navigation convenience, but violates the requested 1-to-1 copy because the monitoring/lobby pages would not look exactly like `sentinel-web`.

#### Option 3: Extract Shared Monitoring/Lobby Modules

- Move shared instructor monitoring and lobby components/hooks into `packages/ui`, `packages/hooks`, or shared feature modules consumed by both apps.
- Refactor both apps to import the common implementation.
- **Tradeoff:** Best long-term deduplication, but broadens scope, increases regression risk, and is unnecessary for a copy-parity task.

### Chosen Best Option: Option 1

**Why:** Option 1 directly satisfies the task language: "replicated - no changes" and "1-is-to-1 like copy and paste." It also fixes the TypeScript issue by aligning `sentinel-core` with `sentinel-web`, where `MonitoringHeader` does not accept `examId`. This keeps the implementation small, maintainable, and consistent with the source app without introducing new dependencies or shared abstractions.

## Files, Services, and DB Touchpoints

- Monitoring target files:
    - `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.test.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.ts`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx`
    - `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.tsx`
    - `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.test.tsx`
- Lobby target files:
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/page.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/page.test.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts`
- Existing services and queries used:
    - `packages/services/src/api/exams/lobby.ts`
    - `packages/services/src/api/exams/monitoring.ts`
    - `packages/services/src/api/exams/core.ts`
    - `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts`
    - `packages/hooks/src/query/exams/use-override-reconnect-limit-mutation.ts`
- DB tables/fields touched through existing APIs:
    - `exam_lobby_admissions`
    - existing exam runtime access fields
    - existing attempt/session monitoring data used by the monitoring overview endpoint
- Prisma migration required: No. The task uses existing lobby, monitoring, runtime access, and reconnect override APIs.
- Breaking API changes: None planned.
- New `.env` variables: None.
- Migration rollback note: Not applicable because no schema migration is required.

## Phase 1: Monitoring Page Parity

**Goal:** Make the `sentinel-core` monitoring page match the current `sentinel-web` instructor monitoring page and resolve the `MonitoringHeaderProps` compile error.

- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.tsx` to match `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`, including removal of the `examId={examId}` prop passed to `MonitoringHeader`.
- [x] Update `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.tsx` to match `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.tsx`, removing `Link`, `ArrowLeft`, `MonitoringLobbyTabs`, and the `examId` destructured prop.
- [x] Ensure `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.tsx` keeps JSDoc only if an exported helper/function is added; do not add comments for self-explanatory JSX.
- [x] Copy or create `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.test.tsx` from the `sentinel-web` monitoring page test and adjust only import paths needed by the core route layout.
- [x] Copy or create `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.test.tsx` from `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.test.tsx` and assert runtime access buttons call `onLock`, `onReopen`, `onReset`, and `onClose`.
- [x] Run focused tests for the above: `pnpm --dir app/sentinel-core test -- monitoring-header page`.

**Migration required:** No — this is a UI and TypeScript prop alignment change only.

## Phase 2: Monitoring Hook Parity

**Goal:** Match the `sentinel-web` monitoring hook behavior, including debounced search and test coverage.

- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.ts` to match `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts`, specifically adding `useDebounce(searchQuery, 500)` and using `debouncedSearchQuery` in the `filteredStudents` calculation.
- [x] Add the same exported function JSDoc to `useMonitoring` in `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.ts`.
- [x] Copy or create `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx` from the `sentinel-web` hook test and adjust mocks only where core path aliases require it.
- [x] Verify the tests cover search reset to page 1, status filtering, runtime access lock/reset/close/reopen updates, invalid reopen minute handling, reconnect override, and refetch behavior.
- [x] Run focused hook tests: `pnpm --dir app/sentinel-core test -- use-monitoring`.

**Migration required:** No — the hook continues to use existing monitoring and runtime access APIs.

## Phase 3: Lobby Page and Hook Parity

**Goal:** Replace the older `sentinel-core` lobby page state model with the newer `sentinel-web` search, filter, refresh, optimistic update, and grouping behavior.

- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/page.tsx` to match `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`, including `Refresh Lobby`, `Separator`, `lobbyAdmissionGroups`, `searchTerm`, and `statusFilter` props.
- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts` to match the `sentinel-web` hook, including `useDebounce`, `useMemo`, `filterLobbyAdmissions`, `getLobbyAdmissionGroups`, `filteredLobbyAdmissions`, `lobbyAdmissionGroups`, `searchTerm`, `debouncedSearchTerm`, and `statusFilter`.
- [x] Add the same exported function JSDoc to `useInstructorLobby` in `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`.
- [x] Create `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.ts` from `sentinel-web`, including `LobbyAdmissionStatusFilter`, `LobbyAdmissionGroups`, `getLobbyAdmissionGroups`, and `filterLobbyAdmissions`.
- [x] Copy or create `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/page.test.tsx` from the `sentinel-web` lobby page test and adjust path-specific imports only.
- [x] Copy or update `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx` from the `sentinel-web` hook test and ensure it covers refresh polling, optimistic update, rollback on failed admission update, search/filter state, and grouped results.
- [x] Copy or create `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts` from `sentinel-web` and assert waiting, approved, rejected, and in-attempt grouping.
- [x] Run focused lobby page and hook tests: `pnpm --dir app/sentinel-core test -- lobby`.

**Migration required:** No — existing lobby list and admission update endpoints already provide the needed data.

## Phase 4: Lobby Admission Panel Parity

**Goal:** Replace the older three-column card lobby panel in `sentinel-core` with the current `sentinel-web` searchable, filterable queue panel.

- [x] Update `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx` to match `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`.
- [x] Ensure `InstructorLobbyAdmissionPanelProps` accepts `lobbyAdmissionGroups`, `searchTerm`, `onSearchChange`, `statusFilter`, `onStatusFilterChange`, `isUpdatingLobbyAdmissions`, and `onUpdateLobbyAdmissions`.
- [x] Ensure the panel renders all four sections exactly like `sentinel-web`: `Waiting`, `Approved`, `In Attempt`, and `Rejected`.
- [x] Ensure `StudentLobbyRow`, `QueueSection`, `formatCheckedInAt`, and `getInitials` are copied without UI alterations.
- [x] Copy or create `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx` from the `sentinel-web` panel test and adjust only target path imports.
- [x] Verify tests cover search input callback, status filter callback, admit, reject, admit all, empty filtered labels, rejected queue rendering, and in-attempt status badge rendering.
- [x] Run focused component tests: `pnpm --dir app/sentinel-core test -- instructor-lobby-admission-panel`.

**Migration required:** No — this is a presentation and interaction parity change over existing lobby admission data.

## Phase 5: Cross-App Parity Verification and Quality Gates

**Goal:** Confirm `sentinel-core` now compiles, tests, and behaves like `sentinel-web` for the copied monitoring and lobby surfaces.

- [x] Compare source and target monitoring files with `diff -u` for:
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.tsx`
    - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-header.tsx`
    - `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.ts`
- [x] Compare source and target lobby files with `diff -u` for:
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`
    - `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`
- [x] Run `pnpm --dir app/sentinel-core test`.
- [x] Run `pnpm --dir app/sentinel-core lint`.
- [x] Run `pnpm --dir app/sentinel-core build` or the repo-preferred build command if local app builds require monorepo context.
- [x] If visual verification is requested during implementation, start `pnpm --dir app/sentinel-core dev` and capture the lobby and monitoring routes for the same exam ID used in local seed data.

**Migration required:** No — final verification confirms no schema or API contract changes were introduced.

## Done Criteria

- [x] `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/page.tsx` no longer passes `examId` to `MonitoringHeader`.
- [x] `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-header.tsx` matches the `sentinel-web` header and no longer requires `examId`.
- [x] `app/sentinel-core` lobby page matches `sentinel-web` with refresh, search, status filter, grouped admissions, and rejected queue.
- [x] New or updated `sentinel-core` tests exist for monitoring page, monitoring hook, monitoring header, lobby page, lobby hook, lobby filters, and lobby admission panel.
- [x] No Prisma migration is added.
- [x] No new environment variables are added.
- [x] Focused tests, `app/sentinel-core` tests, lint, and build pass or any failures are documented with exact commands and errors.

## Execution Verification Notes

- [x] Task-specific tests passed with `pnpm exec vitest run --passWithNoTests 'src/app/(protected)/exams/[id]/_components/exam-session-nav.test.tsx' 'src/app/(protected)/exams/[id]/_components/exam-session-workspace-shell.test.tsx' 'src/app/(protected)/exams/[id]/monitoring/page.test.tsx' 'src/app/(protected)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx' 'src/features/exams/monitoring/_components/monitoring-header.test.tsx' 'src/app/(protected)/exams/[id]/lobby/page.test.tsx' 'src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx' 'src/app/(protected)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx' 'src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts'`: 9 files, 29 tests passed.
- [x] Task-specific lint passed with `pnpm exec eslint` against the changed monitoring, lobby, and exam-session shell files.
- [x] `pnpm --dir app/sentinel-core build` passed after rerunning outside the sandbox. The first sandboxed run failed because Turbopack could not bind to a local port.
- [x] `pnpm --dir app/sentinel-core test` was executed and is blocked by existing unrelated failures in sections, departments, semesters, question bank, courses, collection questions, and retired TOS tests. The failures are missing mocked `useServerPagination`/`useActivePermissions`, changed question-bank labels, duplicate question-bank nav test IDs, and an existing question-section editor expectation.
- [x] `pnpm --dir app/sentinel-core lint` was executed and is blocked by existing unrelated lint errors across scripts, administration, announcements, calendar, exams, classroom, and hook test files. The changed files pass targeted lint.
