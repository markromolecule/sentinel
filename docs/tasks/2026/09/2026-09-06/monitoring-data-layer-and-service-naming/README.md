---
title: "monitoring data layer extraction and service naming standardization"
type: task
status: completed
created: "2026-09-06"
tags: [task, refactor, architecture]
---

# monitoring data layer extraction and service naming standardization

## Outcome
Cleanly partitioned the examination monitoring module into a dedicated data access layer (`data/`) and domain service layer (`services/`), aligning with Sentinel's backend architecture, standardizing file naming to `*.service.ts` with a `monitoring.services.ts` barrel export, and purging all redundant `export * from` legacy shim files.

## Pre-planning record

### Actors and goals
- **Maintainers / Developers**: Strict separation of concerns between SQL/Kysely persistence queries (`data/`) and domain orchestration/mapping (`services/`).
- **Sentinel Architecture Alignment**: Conform with established patterns in `examination/exams/`, `content/question/`, etc., where queries reside in `data/` and business workflows reside in `services/*.service.ts`.

### 1-3-1 Decision Ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-1 | Suffix naming for services (`.service.ts` vs `.services.ts`) | Adopt `*.service.ts` for individual service files and add `monitoring.services.ts` as an aggregator barrel | 57 existing service files across `sentinel-api` strictly use `*.service.ts` (singular). `monitoring.services.ts` satisfies the request while preserving codebase naming harmony | Naming all individual files `*.services.ts` (inconsistent with 57 other files) | `README.md` |
| DEC-2 | Data layer boundary for monitoring overview & detail | Extract raw Kysely queries into `get-exam-monitoring-overview.data.ts` and `get-exam-monitoring-student-detail.data.ts` | Adheres to `rules/typescript/backend/service-layer.md` and `rules/typescript/database/data-access-via-db.md` by decoupling SQL from business orchestration | Leaving raw queries inside service files | `phase-01-data-layer-extraction.md` |

### Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-1 | Data Layer Isolation | All direct Kysely queries and query helpers reside in `data/` | Moved `attempt-selection.helper.ts`, `get-monitoring-exam-context.ts`, and extracted query functions to `data/` | File tree inspection | Completed |
| AC-2 | Service Naming Standardization | All service files in `services/` use `.service.ts` and a `monitoring.services.ts` barrel is provided | Renamed service and test files, created `monitoring.services.ts` | File tree & import inspection | Completed |
| AC-3 | Backward Compatibility | Existing consumers (`lobby.service.ts`, `monitoring.service.ts`, controllers) resolve without error | Updated import paths and maintained barrel facades where needed | TypeScript compilation (`tsc --noEmit`) | Completed |
| AC-4 | Behavioral Invariance | 100% of existing tests pass without regressions | Vitest execution | `vitest run src/modules/examination/monitoring` | Completed |

## Scope
- `app/sentinel-api/src/modules/examination/monitoring/data/`
- `app/sentinel-api/src/modules/examination/monitoring/services/`
- `app/sentinel-api/src/modules/examination/monitoring/monitoring.service.ts`
- External consumers with direct imports (`app/sentinel-api/src/modules/examination/lobby/lobby.service.ts`)

## Non-goals
- Changing database schema or SQL query semantics.
- Altering external HTTP API contracts or DTO definitions in `monitoring.dto.ts`.

## Phases

- [x] `phase-01-data-layer-extraction.md` — Phase 1: Relocate and Extract Data Layer into `data/`
- [x] `phase-02-service-naming-standardization.md` — Phase 2: Standardize Service File Naming to `*.service.ts` and Add `monitoring.services.ts`
- [x] `phase-03-verification-and-behavioral-invariance.md` — Phase 3: Comprehensive Verification and Regression Testing

## Verification
- `vitest run src/modules/examination/monitoring` (PASS: 19/19 passed)
- `vitest run src/modules/examination/lobby` (PASS: 33/33 passed)
- `tsc --noEmit` (PASS: 0 errors)

## Result
Examination monitoring module refactoring complete. Architecture strictly partitioned into data and service layers with full test and type coverage.
