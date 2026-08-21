---
title: "Optimize Subject Page Queries and Initialize Column Visibility"
type: task
status: completed
created: "2026-08-21"
tags: [task, performance, subject-management, kysely, data-layer, frontend, tanstack-table]
---

# Optimize Subject Page Queries and Initialize Column Visibility

## Outcome

Optimized data layer queries for instructor subject management across `sentinel-api` and `sentinel-web`, eliminating unbounded in-memory pagination, aggressive 5-second polling intervals, and missing database indexes, while setting the initial visibility for `approved_at` and `approved_by` columns to hidden by default on the `/subjects` list page.

---

## Pre-planning record

### Actors and goals

- **Instructor**: Views their enrolled and requested subjects cleanly on `/subjects` with high responsiveness, fast page loads, and a focused table view where `approved_at` and `approved_by` columns are hidden by default but toggleable via the View menu.
- **Backend / Database Platform**: Avoids unpaginated multi-table Cartesian joins and constant 5-second polling loops by executing database-level bounded queries with optimal index seeks.

### Domain language

- **Subject Offering**: A specific course offering in an academic term (`subject_offerings`).
- **Class Group / Section**: An individual section instance under a subject offering (`class_groups`, `sections`).
- **Enrolled Subject**: A subject where an instructor is actively assigned via `class_roles` (`roles.role_name = 'instructor'`).
- **Enrollment Request**: A formal request by an instructor to take on subject offerings / class groups (`enrollment_requests`).
- **Initial Column Visibility**: TanStack Table state defining which column definitions are omitted from initial DOM rendering while remaining toggleable in `DataTableViewOptions`.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor loads `/subjects` page | Instructor is authenticated and has enrolled subjects and/or requests | Table loads immediately with `approved_at` and `approved_by` hidden; core columns (Code, Title, Term, Dept, Course, Year, Sections, Requested At, Status) are visible | Fallback to empty state if no subjects | Completed |
| SC-02 | Instructor opens "View" column dropdown | On `/subjects` page | User can toggle `Approved At` and `Approved By` checkboxes to reveal/hide columns dynamically | State persists during session in TanStack Table | Completed |
| SC-03 | Instructor searches or paginates subject list | Subject list contains multi-page records | Query parameters (`page`, `pageSize`/`limit`, `search`) execute bounded SQL queries with `LIMIT` and `OFFSET` directly in PostgreSQL | Safe bounds fallback (max 100 limit, min 1 page) | Completed |
| SC-04 | React Query background sync | User remains on `/subjects` | Data cached with standard `staleTime` without triggering redundant unpaginated database queries every 5 seconds | Mutations invalidate query key `SUBJECT_QUERY_KEYS` reliably | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How to hide `approved_at` and `approved_by` columns initially? | Configure `initialColumnVisibility={{ approved_at: false, approved_by: false }}` in `SubjectsTable` and forward to `DataTable` | TanStack Table manages visibility state declaratively; keeping column defs in `columns.tsx` ensures users can still toggle them via `DataTableViewOptions` | Deleting column definitions completely (prevents users from toggling when needed) | Phase 1 |
| DEC-02 | How to optimize API pagination and prevent fetching all rows into memory? | Implement database-level `LIMIT`/`OFFSET` and count queries in `getEnrolledSubjectsData` and `getEnrollmentRequestsData` | `rules/database/query-optimization-and-pagination.md` requires bounded queries and prohibits in-memory `slice()` on full-table loads | Retaining `paginateItems()` in memory | Phase 2 |
| DEC-03 | How to resolve `limit` vs `pageSize` parameter mismatch? | Support both `limit` and `pageSize` in `paginationQuerySchema` and normalize in service adapter | `@sentinel/services` passes `limit` while backend DTO used `pageSize`; supporting both prevents breaking changes across consumers | Renaming params across all clients simultaneously | Phase 1 & 2 |
| DEC-04 | How to optimize index coverage for class roles and requests? | Add composite indexes `@@index([user_id, role_id])` on `class_roles` and `@@index([user_id, status, created_at(sort: Desc)])` on `enrollment_requests` | Follows ESR (Equality, Sort, Range) rule to avoid sequential scans on high-traffic auth queries | Relying on unindexed FK columns | Phase 3 |

### Unknowns and blockers

- *None.* All affected data layers, controllers, hooks, and table components have been updated and verified.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01 | `approved_at` and `approved_by` columns are hidden by default on `/subjects` | `SubjectsTable` passes `initialColumnVisibility: { approved_at: false, approved_by: false }` to `DataTable` | `subjects-table.test.tsx` (Passed) | Completed |
| AC-02 | SC-02, DEC-01 | `Approved At` and `Approved By` are present in `DataTableViewOptions` and toggleable | Column definitions in `columns.tsx` retained with unique keys | Verified in table tests | Completed |
| AC-03 | SC-03, DEC-02 | `getEnrolledSubjectsData` applies SQL `LIMIT` and `OFFSET` when pagination parameters are provided | Add `page`/`pageSize` parameters to Kysely query with total count resolution | `get-enrolled-subjects.test.ts` (Passed) | Completed |
| AC-04 | SC-03, DEC-02 | `getEnrollmentRequestsData` applies SQL `LIMIT` and `OFFSET` when pagination parameters are provided | Add `page`/`pageSize` parameters to Kysely query with total count resolution | `get-enrollment-requests.test.ts` (Passed) | Completed |
| AC-05 | SC-04 | React Query hooks use appropriate caching without constant 5s polling | Remove `refetchInterval: 5000` or configure `staleTime` in `useEnrolledSubjectsQuery` & `useEnrollmentRequestsQuery` | `use-enrolled-subjects-query.test.ts` (Passed) | Completed |
| AC-06 | DEC-04 | Database schema has optimal indexes for instructor enrollment lookups | Add indexes on `class_roles` and `enrollment_requests` in `packages/db/prisma/schema.prisma` | Generated `@sentinel/db` types successfully | Completed |

---

## Scope

- Frontend `sentinel-web`: `SubjectsTable`, `SubjectsList`, `columns.tsx`, `useSubjectsList`.
- Shared Hooks `@sentinel/hooks`: `use-enrolled-subjects-query.ts`, `use-enrollment-requests-query.ts`.
- Shared Services `@sentinel/services`: `getEnrolledSubjects`, `getEnrollmentRequests`.
- Backend API `sentinel-api`: `enrollments.dto.ts`, `pagination.ts`, `get-enrolled-subjects.ts`, `get-enrollment-requests.ts`, `get-enrolled-subjects.service.ts`, `get-enrollment-requests.service.ts`, `get-enrolled-subjects.controller.ts`, `get-enrollment-requests.controller.ts`.
- Database `packages/db`: `schema.prisma` indexes.

---

## Non-goals

- Altering table layout on unrelated pages (e.g. Student examination tables, admin institution tables).
- Modifying subject offering creation or update mutation workflows.

---

## Constraints and decisions

- Maintain full backwards compatibility for API consumers that do not send pagination parameters (returning full array when unpaginated).
- Adhere strictly to Kysely standards and `rules/database/query-optimization-and-pagination.md`.

---

## Phases

- [x] `phase-01-frontend-column-visibility-and-query-hooks.md` — Phase 1: Configure initial column visibility and refine query hooks & services
- [x] `phase-02-api-data-layer-query-optimization.md` — Phase 2: Implement SQL-level pagination and optimize Kysely query joins
- [x] `phase-03-database-indexing-and-verification.md` — Phase 3: Add database indexes, run test suites, and verify end-to-end

---

## Verification

Checklist of executed commands and outcomes:
- `pnpm --filter @sentinel/db generate && pnpm --filter @sentinel/db build` (Passed)
- `pnpm --filter sentinel-api test src/modules/identity/enrollments` (15 test files, 31 tests passed)
- `pnpm --filter @sentinel/hooks test src/query/subjects` (all subject query tests passed)
- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/subjects/_components/tables/subjects-table.test.tsx` (Passed)

---

## Result

Execution complete. All acceptance criteria met and verified with passing test suites.
