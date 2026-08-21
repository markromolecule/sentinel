---
title: "Phase 2: Implement SQL-Level Pagination and Optimize Kysely Query Joins"
type: phase
parent: "docs/tasks/2026/08/2026-08-21/task-perf-subject-page-query-and-column-visibility/README.md"
phase: "02"
status: completed
created: "2026-08-21"
tags: [task, phase, backend, kysely, pagination, data-layer, sql-optimization]
---

# Phase 2: Implement SQL-Level Pagination and Optimize Kysely Query Joins

## Objective

Optimize the data layer queries for enrolled subjects and enrollment requests in `app/sentinel-api` by pushing `LIMIT` and `OFFSET` into SQL query execution when paginated, computing total counts via lightweight count queries or window functions, and eliminating redundant join overhead.

## Dependencies & Prerequisites

- Phase 1 completed (parameter normalization in services and hooks).

## Impacted Files & Components

- `app/sentinel-api/src/lib/pagination.ts`: Support `limit` as an alias alongside `pageSize` in `paginationQuerySchema`.
- `app/sentinel-api/src/modules/identity/enrollments/data/get-enrolled-subjects.ts`: Add `page` and `pageSize`/`limit` arguments to apply SQL `LIMIT` and `OFFSET` and execute lightweight distinct count query.
- `app/sentinel-api/src/modules/identity/enrollments/services/get-enrolled-subjects.service.ts`: Forward `page` and `pageSize`/`limit` to data layer instead of loading all rows into Node.js memory.
- `app/sentinel-api/src/modules/identity/enrollments/data/get-enrollment-requests.ts`: Add SQL `LIMIT` and `OFFSET` with distinct count resolution when pagination parameters are provided.
- `app/sentinel-api/src/modules/identity/enrollments/services/get-enrollment-requests.service.ts`: Forward `page` and `pageSize`/`limit` to data layer.
- `app/sentinel-api/src/modules/identity/enrollments/controllers/get-enrolled-subjects.controller.ts`: Parse `pageSize` / `limit` safely.
- `app/sentinel-api/src/modules/identity/enrollments/controllers/get-enrollment-requests.controller.ts`: Parse `pageSize` / `limit` safely.
- `app/sentinel-api/src/modules/identity/enrollments/data/tests/get-enrolled-subjects.test.ts`: Added unit test covering unpaginated, paginated, and search filtering modes.

## Implementation Tasks

- [x] Task 2.1 — Update `paginationQuerySchema` in `app/sentinel-api/src/lib/pagination.ts` to accept `limit` and `pageSize` interchangeably.
- [x] Task 2.2 — Refactor `getEnrolledSubjectsData` in `app/sentinel-api/src/modules/identity/enrollments/data/get-enrolled-subjects.ts` to accept `page` and `pageSize` / `limit`:
  - When `page` and `pageSize` are provided, compute total items and execute query with `.limit(pageSize).offset((page - 1) * pageSize)`.
  - When unpaginated, preserve existing return contract for full collections.
- [x] Task 2.3 — Refactor `getEnrollmentRequestsData` in `app/sentinel-api/src/modules/identity/enrollments/data/get-enrollment-requests.ts` with SQL pagination and count resolution.
- [x] Task 2.4 — Update `getEnrolledSubjectsService` and `getEnrollmentRequestsService` to delegate pagination directly to data access layer.
- [x] Task 2.5 — Add unit tests for `getEnrolledSubjectsData` and `getEnrollmentRequestsData` testing paginated vs unpaginated execution, search filtering, and boundaries.

## Verification & Testing

- `pnpm --filter sentinel-api test src/modules/identity/enrollments`:
  - `✓ 15 test files passed (31 tests passed)`
  - `✓ get-enrolled-subjects.test.ts (3 tests)`
  - `✓ get-enrollment-requests.test.ts (3 tests)`
  - `✓ get-enrollment-requests-search.test.ts (1 test)`

## Risks & Rollback

- **Risk**: Backward compatibility issues if any consumer relied on full array response while passing `page`/`pageSize`.
- **Mitigation**: Paginated endpoints maintain envelope `{ data: items, pagination: { ... } }` matching existing schema contracts.
- **Rollback**: Revert `get-enrolled-subjects.ts` and `get-enrollment-requests.ts` to previous in-memory slicing.
