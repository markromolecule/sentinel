---
title: "Phase 1 — Current State Mapping and Contract Pinning"
type: phase
parent: "0001-task-refactor-map-monitoring-response"
phase: "01"
status: completed
created: "2026-09-06"
tags: [task, phase]
---

# Phase 1 — Current State Mapping and Contract Pinning

## Objective
Establish existing test baseline and document all public symbols, consumer touchpoints, and domain extraction boundaries before code modification.

## Dependencies & Prerequisites
- Existing unit tests passing in `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts`.

## Impacted Files & Components
- `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts` (target, 462 lines)
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts` (consumer)
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.ts` (consumer)
- `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts` (test suite, 11 tests)

## Contract Catalog & Consumer Mapping
1. **Types**:
   - `MonitoringStudentRow` -> consumed by `get-exam-monitoring-overview.ts`, `get-exam-monitoring-student-detail.ts`, `map-monitoring-response.test.ts`.
   - `MonitoringLifecycleEventRow` -> consumed by `get-exam-monitoring-student-detail.ts`, `map-monitoring-response.test.ts`.
   - `MonitoringIncidentEvidenceSummaryRow` -> consumed by `get-exam-monitoring-student-detail.ts`, `map-monitoring-response.test.ts`.
2. **Functions**:
   - `buildMonitoringOverview` -> consumed by `get-exam-monitoring-overview.ts`, `map-monitoring-response.test.ts`.
   - `mapMonitoringExam` -> consumed by `get-exam-monitoring-overview.ts`, `map-monitoring-response.test.ts`.
   - `mapMonitoringStudentSummary` -> consumed by `get-exam-monitoring-overview.ts`, `map-monitoring-response.test.ts`.
   - `mapMonitoringStudentDetail` -> consumed by `get-exam-monitoring-student-detail.ts`, `map-monitoring-response.test.ts`.
   - `mapMonitoringIncident` -> consumed by `map-monitoring-response.test.ts`.
   - `mapMonitoringIncidentWithEvidenceSummary` -> consumed by `map-monitoring-response.test.ts`.
   - `mapMonitoringLifecycleEvent` -> used by `mapMonitoringStudentDetail`.
   - `formatMonitoringLastActivity` -> exported utility function.

## Vertical Slice Extraction Plan
- `monitoring-response.types.ts`: Database query row types (~50 LOC).
- `monitoring-time.helper.ts`: Date parsing, formatting, relative time calculation, `DISCONNECTED_WINDOW_MS` (~55 LOC).
- `map-monitoring-incident.ts`: Incident severity normalization and incident DTO mapping (~55 LOC).
- `map-monitoring-lifecycle.ts`: Lifecycle event row to domain event mapping (~30 LOC).
- `map-monitoring-student.ts`: Student summary/detail status & progress resolution (~150 LOC).
- `map-monitoring-overview.ts`: Overview statistics aggregation and student sorting (~75 LOC).
- `map-monitoring-response.ts`: Barrel export facade re-exporting all symbols for 100% backward compatibility (~30 LOC).

## Implementation Tasks
- [x] Pin baseline test coverage (`vitest run src/modules/examination/monitoring` - 19 passing tests).
- [x] Identify modular extraction boundaries: Types, Time Helpers, Incident Mapper, Lifecycle Mapper, Student Mapper, Overview Mapper.

## Verification & Testing
- Command: `vitest run src/modules/examination/monitoring` (PASS: 19/19 passed, 5/5 test files).
- Zero breaking changes identified: barrel export strategy will guarantee seamless consumer continuity.
