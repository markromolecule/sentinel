---
title: "Phase 1: Monitoring Submitted Count & Status Decoupling"
type: phase
parent: "monitoring-counts-essay-prescoring-progress-accuracy"
phase: "01"
status: completed
created: "2026-09-06"
tags: [task, phase, monitoring, counting, filters]
---

# Phase 1: Monitoring Submitted Count & Status Decoupling

## Objective

Fix the instructor live monitoring dashboard so that all submitted attempts are counted in `stats.submitted` and visible under the "Submitted" filter, even if the student incurred proctoring incident flags during their exam.

## Dependencies & Prerequisites

- None (self-contained within `sentinel-api` mapping and `sentinel-web` monitoring filters).

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts): Update `resolveMonitoringStatus` and `buildMonitoringOverview` to count submitted attempts reliably and preserve both submitted state and flagged indicators.
- [`app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts): Add regression tests verifying that a student with flags who submits is counted in `submitted`.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-filters.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-filters.ts): Enhance filter matching logic so selecting "Submitted" includes students whose lifecycle state is `SUBMITTED` or status is `'submitted'`, regardless of proctoring flags.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-filters.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-filters.test.ts): New unit tests verifying filter criteria.

## Implementation Tasks

- [x] **Task 1.1 (API Monitoring Mapping Fix):**
  - In `map-monitoring-response.ts`, revised `resolveMonitoringStatus` to check `attemptStatus === 'COMPLETED'`, `attemptStatus === 'SUBMITTED'`, and `lifecycleState === 'SUBMITTED'`.
  - Updated `buildMonitoringOverview` to count all submitted students in `stats.submitted` regardless of proctoring flags, while also keeping `stats.flagged` accurate.
- [x] **Task 1.2 (Web Monitoring Filters Fix):**
  - In `use-filters.ts`, updated `matchesFilter` so selecting `submitted` includes students with `status === 'submitted'`, `lifecycleState === 'SUBMITTED'`, or `Boolean(student.completedAt)`.
  - Updated `flagged` filter to include students with `incidentCount > 0` or `openIncidentCount > 0`.
- [x] **Task 1.3 (Regression Tests):**
  - Added unit test in `map-monitoring-response.test.ts` verifying that `buildMonitoringOverview` correctly records a student submitted with flags as both `submitted: 2` and `flagged: 2` in a mixed batch.
  - Added unit tests in `use-filters.test.ts` verifying that `submitted` and `flagged` filters match accurately.

## Verification & Testing

- **API Monitoring Tests:**
  ```bash
  pnpm --filter sentinel-api test src/modules/examination/monitoring
  ```
  *Result:* 5 test files passed, 19 tests passed (100%).
- **Web Monitoring Tests:**
  ```bash
  pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/exams/\[id\]/monitoring
  ```
  *Result:* 3 test files passed, 16 tests passed (100%).

## Risks & Rollback

- **Low Risk:** Localized to summary aggregation and frontend filter predicates.
- **Rollback:** Revert modifications in `map-monitoring-response.ts` and `use-filters.ts`.
