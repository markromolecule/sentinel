---
title: "Phase 1: Configure Initial Column Visibility and Refine Query Hooks"
type: phase
parent: "docs/tasks/2026/08/2026-08-21/task-perf-subject-page-query-and-column-visibility/README.md"
phase: "01"
status: completed
created: "2026-08-21"
tags: [task, phase, frontend, hooks, column-visibility]
---

# Phase 1: Configure Initial Column Visibility and Refine Query Hooks

## Objective

Set initial column visibility for `approved_at` and `approved_by` to hidden by default in `SubjectsTable` while preserving user toggle capabilities, and refine query hooks in `@sentinel/hooks` / `@sentinel/services` by replacing aggressive 5-second polling intervals with sensible caching rules (`staleTime: 30_000`) and normalizing pagination parameters.

## Dependencies & Prerequisites

- None. Can be executed immediately.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/subjects/_components/tables/subjects-table.tsx`: Accept and forward `initialColumnVisibility` prop defaulting to `{ approved_at: false, approved_by: false }`.
- `app/sentinel-web/src/app/(protected)/(instructor)/subjects/_components/views/subjects-list.tsx`: Pass `initialColumnVisibility` if customized or allow `SubjectsTable` default.
- `packages/hooks/src/query/subjects/use-enrolled-subjects-query.ts`: Remove hardcoded `refetchInterval: 5000`, configure default `staleTime: 30_000`.
- `packages/hooks/src/query/subjects/use-enrollment-requests-query.ts`: Remove hardcoded `refetchInterval: 5000`, configure default `staleTime: 30_000`.
- `packages/services/src/api/subjects.ts`: Normalize query parameters so both `limit` and `pageSize` are handled predictably.
- `app/sentinel-web/src/app/(protected)/(instructor)/subjects/_components/tables/subjects-table.test.tsx`: Added unit test asserting default hidden state of `approved_at` and `approved_by`.

## Implementation Tasks

- [x] Task 1.1 — Update `SubjectsTable` in `sentinel-web` to set `initialColumnVisibility={{ approved_at: false, approved_by: false }}` on `DataTable`.
- [x] Task 1.2 — Verify `columns.tsx` column accessors match `approved_at` and `approved_by` identifiers.
- [x] Task 1.3 — Remove `refetchInterval: 5000` from `useEnrolledSubjectsQuery` and `useEnrollmentRequestsQuery`, adding `staleTime: 30000` and `refetchOnWindowFocus: true`.
- [x] Task 1.4 — Ensure `@sentinel/services` passes both `page` and `pageSize`/`limit` cleanly.
- [x] Task 1.5 — Update hook unit tests in `packages/hooks/src/query/subjects/use-enrolled-subjects-query.test.ts` and `use-enrollment-requests-query.test.ts`.

## Verification & Testing

- `pnpm --filter @sentinel/hooks test src/query/subjects`:
  - `✓ src/query/subjects/use-enrolled-subjects-query.test.ts (2 tests)`
  - `✓ src/query/subjects/use-enrollment-requests-query.test.ts (2 tests)`
  - `✓ src/query/subjects/use-bulk-unenroll-instructor-subjects-mutation.test.ts (1 test)`
  - `✓ src/query/subjects/use-assign-offered-subject-mutation.test.ts (1 test)`
- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/subjects/_components/tables/subjects-table.test.tsx`:
  - `✓ src/app/(protected)/(instructor)/subjects/_components/tables/subjects-table.test.tsx (1 test)` (Asserts `approved_at` and `approved_by` are omitted from default table rendering).

## Risks & Rollback

- **Risk**: Stale data if instructor expects real-time approval status updates.
- **Mitigation**: Mutation hooks (`useEnrollInstructorSubjectMutation`, etc.) already invalidate `SUBJECT_QUERY_KEYS.all`. Refetch on window focus keeps data fresh when returning to the tab.
- **Rollback**: Revert `initialColumnVisibility` prop and query hook options.
