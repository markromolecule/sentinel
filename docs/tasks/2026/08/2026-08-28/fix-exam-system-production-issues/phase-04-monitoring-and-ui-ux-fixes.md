---
title: "Phase 4: Monitoring Counters & UI/UX Polish"
type: phase
parent: "docs/tasks/2026/08/2026-08-28/fix-exam-system-production-issues/README.md"
phase: "4"
status: completed
created: "2026-08-28"
tags: [task, phase, monitoring, reporting, ui-ux, polish]
---

# Phase 4: Monitoring Counters & UI/UX Polish (ISSUE-06, ISSUE-07, ISSUE-08, ISSUE-09)

## Objective

Fix live monitoring count categories, remove deprecated `Force Submit` buttons, animate the Lobby refresh button with `isFetching`, and make the Attempt Summary Report search table filter in-place smoothly without full page reloads.

## Dependencies & Prerequisites

- Phases 1, 2, and 3 completed.

## Impacted Files & Components

- **Modified:**
  - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-stats.tsx` & `app/sentinel-core/src/features/exams/monitoring/_components/monitoring-stats.tsx`: Differentiate `stats.submitted` from `lobbyAdmissions.approved`.
  - `app/sentinel-web/src/features/exams/monitoring/_components/integrity-timeline-card.tsx` & `app/sentinel-core/src/features/exams/monitoring/_components/integrity-timeline-card.tsx`: Remove `Force Submit` button.
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx` & `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/page.tsx`: Pass `isFetching` to animate `RefreshCw` icon and disable button while fetching.
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts` & `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`: Expose `isFetching`.
  - `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/attempt-summary-table.tsx`: Add `onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}` and debounce table filtering.
- **Tests:**
  - Update tests in `monitoring-stats.test.tsx`, `integrity-timeline-card.test.tsx`, and `lobby/page.test.tsx` across `sentinel-web` and `sentinel-core`.

## Implementation Tasks

- [x] Task 4.1 — Monitoring Stats Counter Accuracy (ISSUE-06):
  - In `monitoring-stats.tsx`, ensure "Submitted" accurately maps to `stats.submitted` and "Lobby Approved" displays `lobbyAdmissions.approved`.
- [x] Task 4.2 — Remove Deprecated Force Submit (ISSUE-07):
  - Remove `Force Submit` button from `integrity-timeline-card.tsx` in `sentinel-web` and `sentinel-core`.
  - Update `integrity-timeline-card.test.tsx` to verify component renders cleanly without the deprecated button.
- [x] Task 4.3 — Lobby Refresh Loading State (ISSUE-08):
  - Expose `isFetching` from `useExamLobbyWaitingListQuery` in `use-instructor-lobby.ts`.
  - In `lobby/page.tsx`, bind `isFetching` to `<RefreshCw className={isFetching ? "animate-spin" : ""} />` and `disabled={isFetching || isUpdatingLobbyAdmissions}`.
- [x] Task 4.4 — Attempt Summary In-Place Search (ISSUE-09):
  - In `attempt-summary-table.tsx`, add Enter prevention (`e.preventDefault()`) to the search input.
  - Ensure search queries debounce cleanly in-place without triggering form submissions or URL page navigations.

## Verification & Testing

- Run test suites for web and core:

  ```bash
  pnpm --filter sentinel-web test monitoring
  # PASS: 20/20 test files passed, 119/119 tests passed
  pnpm --filter sentinel-web test lobby
  # PASS: 12/12 test files passed, 68/68 tests passed
  pnpm --filter sentinel-core test integrity-timeline-card
  # PASS: 1/1 test file passed, 6/6 tests passed
  ```


## Risks & Rollback

- **Risk:** Minor test breakage due to removed `Force Submit` button text selectors.
- **Mitigation:** Update test assertions simultaneously across both web and core apps.
