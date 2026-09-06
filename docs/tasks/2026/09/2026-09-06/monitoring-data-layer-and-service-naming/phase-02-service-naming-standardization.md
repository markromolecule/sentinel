---
title: "Phase 2: Standardize Service File Naming to *.service.ts and Add monitoring.services.ts"
type: phase
parent: "monitoring-data-layer-and-service-naming"
phase: "02"
status: completed
created: "2026-09-06"
tags: [task, phase, service-layer, naming]
---

# Phase 2: Standardize Service File Naming to `*.service.ts` and Add `monitoring.services.ts`

## Objective
Standardize all service filenames under `services/` to use `.service.ts` (matching repository conventions across 57 existing services) and create `monitoring.services.ts` as an aggregator entry point.

## Dependencies & Prerequisites
- Phase 1 completed.

## Impacted Files & Components
- `services/get-exam-monitoring-overview.service.ts` [NEW]
- `services/get-exam-monitoring-overview.service.test.ts` [NEW/RENAMED]
- `services/get-exam-monitoring-student-detail.service.ts` [NEW]
- `services/get-exam-monitoring-student-detail.service.test.ts` [NEW/RENAMED]
- `services/map-monitoring-response.service.ts` [NEW]
- `services/map-monitoring-response.service.test.ts` [NEW/RENAMED]
- `services/map-monitoring-incident.service.ts` [NEW]
- `services/map-monitoring-student.service.ts` [NEW]
- `services/map-monitoring-lifecycle.service.ts` [NEW]
- `services/map-monitoring-overview.service.ts` [NEW]
- `services/monitoring-time.service.ts` [NEW]
- `services/monitoring.services.ts` [NEW: barrel aggregator exporting all monitoring services]
- `monitoring.service.ts` [MODIFY: imports from `monitoring.services`]
- Backward-compatibility shims (`get-exam-monitoring-overview.ts`, `get-exam-monitoring-student-detail.ts`, `map-monitoring-response.ts`, `map-monitoring-incident.ts`, `map-monitoring-student.ts`, `map-monitoring-lifecycle.ts`, `map-monitoring-overview.ts`, `monitoring-time.helper.ts`)

## Implementation Tasks
- [x] Rename orchestration services to `*.service.ts` (`get-exam-monitoring-overview.service.ts`, `get-exam-monitoring-student-detail.service.ts`).
- [x] Rename response mappers and helpers to `*.service.ts` (`map-monitoring-response.service.ts`, `map-monitoring-incident.service.ts`, `map-monitoring-student.service.ts`, `map-monitoring-lifecycle.service.ts`, `map-monitoring-overview.service.ts`, `monitoring-time.service.ts`).
- [x] Rename corresponding test files to `*.service.test.ts`.
- [x] Create `services/monitoring.services.ts` barrel re-exporting all service operations and mappers.
- [x] Update `monitoring.service.ts` to use the new standardized filenames.
- [x] Maintain backward-compatibility re-export shims so any residual external imports continue to resolve cleanly.

## Verification & Testing
- Vitest suite: `vitest run src/modules/examination/monitoring` (PASS: 19/19 passed, 5/5 test suites).
- Vitest suite: `vitest run src/modules/examination/lobby` (PASS: 33/33 passed, 7/7 test suites).
- Typecheck: `tsc --noEmit` (PASS: 0 errors).
