---
title: "Phase 3: Optimize Instructor Monitoring Dashboard Queries & Relax Refresh Intervals"
type: phase
parent: "fix-exam-concurrency-traffic-and-instructor-monitoring"
phase: "03"
status: completed
created: "2026-08-24"
tags: [task, phase, instructor-monitoring, query-optimization]
---

# Phase 3: Optimize Instructor Monitoring Dashboard Queries & Relax Refresh Intervals

## Objective

Relax aggressive 2,000ms query polling in the instructor monitoring overview and incident feeds to 6,000ms–8,000ms, and disable background refetching when the browser tab is blurred. This prevents multi-table JOINs on `flagged_incidents` and `exam_attempts` from locking database connections while instructors view the dashboard during active exams.

---

## Dependencies & Prerequisites

- Phase 1 and Phase 2 completed.

---

## Impacted Files & Components

- [`packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts) — Update `EXAM_MONITORING_OVERVIEW_REFETCH_INTERVAL_MS = 6000` and set `refetchIntervalInBackground: false`.
- [`packages/hooks/src/query/exams/use-exam-incidents-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-incidents-query.ts) — Update `EXAM_INCIDENTS_REFETCH_INTERVAL_MS = 6000` and set `refetchIntervalInBackground: false`.
- [`packages/hooks/src/query/exams/use-exam-monitoring-student-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-monitoring-student-query.ts) — Update `refetchInterval: 8000` and set `refetchIntervalInBackground: false`.
- [`packages/hooks/src/query/exams/use-exam-monitoring-overview-query.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-monitoring-overview-query.test.ts) — Update unit tests.
- [`packages/hooks/src/query/exams/use-exam-incidents-query.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-incidents-query.test.ts) — Update unit tests.
- [`packages/hooks/src/query/exams/use-exam-monitoring-student-query.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-monitoring-student-query.test.ts) — Update unit tests.

---

## Implementation Tasks

- [x] **Task 3.1: Relax Instructor Monitoring Overview Refetch Interval**
  - Set `EXAM_MONITORING_OVERVIEW_REFETCH_INTERVAL_MS = 6000`.
  - Set `refetchIntervalInBackground: false` and `staleTime: 4000`.
- [x] **Task 3.2: Relax Instructor Incidents Refetch Interval**
  - Set `EXAM_INCIDENTS_REFETCH_INTERVAL_MS = 6000`.
  - Set `refetchIntervalInBackground: false` and `staleTime: 4000`.
- [x] **Task 3.3: Relax Student Detail Monitoring Query**
  - In `useExamMonitoringStudentQuery`, set `refetchInterval: 8000`, `staleTime: 4000`, and `refetchIntervalInBackground: false`.
- [x] **Task 3.4: Execute Instructor Monitoring Hook Test Suites**
  - Run `pnpm --filter @sentinel/hooks test use-exam-monitoring-overview-query`.
  - Run `pnpm --filter @sentinel/hooks test use-exam-incidents-query`.
  - Run `pnpm --filter @sentinel/hooks test use-exam-monitoring-student-query`.

---

## Verification & Testing

- `pnpm --filter @sentinel/hooks test use-exam-monitoring-overview-query.test.ts` (PASS: 1/1 passed)
- `pnpm --filter @sentinel/hooks test use-exam-incidents-query.test.ts` (PASS: 3/3 passed)
- `pnpm --filter @sentinel/hooks test use-exam-monitoring-student-query.test.ts` (PASS: 1/1 passed)
- `pnpm --filter @sentinel/hooks test` (PASS: 63 files, 184 tests passed)
- `pnpm --filter sentinel-web test monitoring` (PASS: 20 files, 119 tests passed)
- `pnpm --filter @sentinel/hooks build` (PASS: zero compilation errors)

---

## Risks & Rollback

- **Risk:** Proctor sees a 4-second delay before a newly finished student status flips in the UI if manual refresh is not clicked.
- **Mitigation:** The proctor page has an instant "Refresh" button (`onRefresh`) that executes an immediate cached refetch on demand.
