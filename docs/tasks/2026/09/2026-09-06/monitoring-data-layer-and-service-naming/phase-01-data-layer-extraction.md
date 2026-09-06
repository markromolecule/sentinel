---
title: "Phase 1: Relocate and Extract Data Layer into data/"
type: phase
parent: "monitoring-data-layer-and-service-naming"
phase: "01"
status: completed
created: "2026-09-06"
tags: [task, phase, data-layer]
---

# Phase 1: Relocate and Extract Data Layer into `data/`

## Objective
Move all direct database query logic, Kysely SQL helpers, and DB row types out of `services/` and into `app/sentinel-api/src/modules/examination/monitoring/data/`.

## Dependencies & Prerequisites
- Current monitoring and lobby test suites passing.

## Impacted Files & Components
- `data/attempt-selection.helper.ts` [NEW/MOVED from services]
- `data/attempt-selection.helper.test.ts` [NEW/MOVED from services]
- `data/get-monitoring-exam-context.ts` [NEW/MOVED from services]
- `data/get-monitoring-exam-context.test.ts` [NEW/MOVED from services]
- `data/monitoring-data.types.ts` [NEW: extracted DB row types]
- `data/get-exam-monitoring-overview.data.ts` [NEW: extracted Kysely queries from overview service]
- `data/get-exam-monitoring-student-detail.data.ts` [NEW: extracted Kysely queries from student detail service]
- `data/index.ts` [NEW: barrel export for data layer]
- `services/attempt-selection.helper.ts` [MODIFY: re-export shim for backward compatibility]
- `services/get-monitoring-exam-context.ts` [MODIFY: re-export shim for backward compatibility]
- `services/monitoring-response.types.ts` [MODIFY: re-export shim from `data/`]
- `services/get-exam-monitoring-overview.ts` [MODIFY: consumes `data/get-exam-monitoring-overview.data`]
- `services/get-exam-monitoring-student-detail.ts` [MODIFY: consumes `data/get-exam-monitoring-student-detail.data`]

## Implementation Tasks
- [x] Move `attempt-selection.helper.ts` & `attempt-selection.helper.test.ts` to `data/`.
- [x] Move `get-monitoring-exam-context.ts` & `get-monitoring-exam-context.test.ts` to `data/`.
- [x] Move DB row types (`MonitoringStudentRow`, `MonitoringLifecycleEventRow`, `MonitoringIncidentEvidenceSummaryRow`) to `data/monitoring-data.types.ts`.
- [x] Extract raw Kysely queries from `get-exam-monitoring-overview.ts` into `data/get-exam-monitoring-overview.data.ts`.
- [x] Extract raw Kysely queries from `get-exam-monitoring-student-detail.ts` into `data/get-exam-monitoring-student-detail.data.ts`.
- [x] Create `data/index.ts` barrel export re-exporting all data queries, types, and helpers.
- [x] Keep backward-compatible re-export shims in `services/` for `attempt-selection.helper.ts` and `get-monitoring-exam-context.ts` to prevent broken imports.

## Verification & Testing
- Unit tests pass: `vitest run src/modules/examination/monitoring` (PASS: 19/19 passed, 5/5 suites).
- Unit tests pass: `vitest run src/modules/examination/lobby` (PASS: 33/33 passed, 7/7 suites).
- Compiler typecheck: `tsc --noEmit` (PASS: 0 errors).
