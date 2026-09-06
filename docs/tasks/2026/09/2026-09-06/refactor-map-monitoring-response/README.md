---
title: "refactor map monitoring response"
type: task
status: completed
created: "2026-09-06"
tags: [task, refactor]
---

# refactor map monitoring response

## Outcome
Successfully decomposed the monolithic `map-monitoring-response.ts` (462 lines) into 6 cohesive, single-responsibility modules under `app/sentinel-api/src/modules/examination/monitoring/services/` with all modules $\le 191$ lines, while preserving 100% public contracts, behavior, and consumer backward compatibility via a clean barrel export facade.

## Pre-planning record

### Actors and goals
- **Maintainers / Developers**: Clear separation of concerns between DB row typing, date utilities, student status evaluation, incident mapping, and overview aggregations.
- **Consumers (`get-exam-monitoring-overview`, `get-exam-monitoring-student-detail`)**: Transparent access to mapping functions without regression or broken imports.

### Domain language
- **MonitoringStudentSummary**: Summarized student monitoring view with status ('flagged' | 'submitted' | 'disconnected' | 'active'), calculated progress, and incident counts.
- **MonitoringStudentDetail**: Deep monitoring view with incidents (flags) and lifecycle audit events.
- **MonitoringIncident**: Normalized incident DTO for frontend consumption.
- **MonitoringOverview**: Aggregated metrics (`total`, `active`, `flagged`, `submitted`, `disconnected`) and alphabetized student list.

### Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-1 | Single Responsibility | `map-monitoring-response.ts` decomposed into <= 200-line cohesive modules | Extracted types, time helpers, incident mapper, student mapper, lifecycle mapper, and overview mapper | Inspected line counts (max 191 LOC) | Completed |
| AC-2 | Zero Breaking Changes | All existing exports remain accessible via `map-monitoring-response.ts` barrel facade | Re-exported all types and functions | TypeScript compilation (`tsc --noEmit`) | Completed |
| AC-3 | Behavioral Invariance | All monitoring tests continue to pass without modification | Vitest test suite execution | `vitest run src/modules/examination/monitoring` | Completed |

## Phases

- [x] `phase-01-boundary-analysis.md` — Phase 1 — Current State Mapping and Contract Pinning
- [x] `phase-02-vertical-slice-refactoring.md` — Phase 2 — Vertical Slice Refactoring
- [x] `phase-03-integration-tests.md` — Phase 3 — Comprehensive Integration and Verification

## Verification

- **Automated Tests**:
  - `vitest run src/modules/examination/monitoring` (PASS: 19/19 passed)
- **Type Safety**:
  - `tsc --noEmit` (PASS: 0 errors)
- **Modularity**:
  - All 6 extracted modules + facade under 200 LOC.
  - Clean acyclic dependency graph.

## Result
Refactoring successfully completed with release readiness verified.
