---
title: "Phase 1 — Shared Schema Updates & Backend Bundled Credentials API"
type: phase
parent: "feat-livekit-streamline-and-camera-visibility"
phase: "01"
status: completed
created: "2026-08-23"
tags: [task, phase, live-inspection, api, backend, schema]
---

# Phase 1 — Shared Schema Updates & Backend Bundled Credentials API

## Objective

Extend `liveInspectionStaffStatusSchema` and `liveInspectionDirectiveSchema` to optionally include a `connection` object containing pre-issued LiveKit credentials (`token`, `liveKitUrl`, `participantIdentity`, `roomName`, `expiresAt`), and update `startLiveInspection` and `getStudentLiveInspectionDirective` services to generate and return these credentials directly upon lease acquisition/directive queries.

## Dependencies & Prerequisites

- Context Specification: [`docs/context/August/23/live-inspection-streamline-and-camera-visibility.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/23/live-inspection-streamline-and-camera-visibility.md)

## Impacted Files & Components

- `packages/shared/src/schema/exams/live-inspection-schema.ts`: Add optional `connection` field to `liveInspectionStaffStatusSchema` and `liveInspectionDirectiveSchema`.
- `packages/shared/src/schema/exams/live-inspection-schema.test.ts`: Add unit tests for schema backward compatibility with and without `connection`.
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.dto.ts`: Update DTO schemas and type mappings.
- `app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.ts`: Inject `LiveKitManagedService` to generate viewer credentials and attach them to the response.
- `app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts`: Add tests verifying bundled viewer credentials in the start response.
- `app/sentinel-api/src/modules/examination/live-inspection/services/get-student-live-inspection-directive.service.ts`: Generate publisher credentials when state is `REQUESTED` or `PUBLISHER_CONNECTING`, transition state atomically, and attach to directive response.
- `app/sentinel-api/src/modules/examination/live-inspection/services/get-student-live-inspection-directive.service.test.ts`: Add tests verifying bundled publisher credentials in the directive response.

## Implementation Tasks

- [x] **Task 1.1: Shared Schema Updates**
  - Add `connection: liveInspectionConnectionResponseSchema.optional()` to `liveInspectionStaffStatusSchema`.
  - Add `connection: liveInspectionConnectionResponseSchema.optional()` to `liveInspectionDirectiveSchema`.
  - Ensure all schemas in `packages/shared/src/schema/exams/live-inspection-schema.ts` export updated inferred TypeScript types.
  - Update `packages/shared/src/schema/exams/live-inspection-schema.test.ts` to validate parsing with and without `connection`.

- [x] **Task 1.2: Backend Start Live Inspection Bundled Token**
  - In `start-live-inspection.service.ts`, after lease acquisition/reuse, call `liveKit.createViewerToken({ roomName: lease.provider_room_name, leaseId: lease.lease_id })`.
  - Map the token result into `LiveInspectionConnectionResponse` and include it in `mapLiveInspectionLeaseStatus(lease, connection)`.
  - Update `start-live-inspection.service.test.ts` to assert that `connection` is present with valid JWT, LiveKit URL, and participant identity.

- [x] **Task 1.3: Backend Student Directive Bundled Token**
  - In `get-student-live-inspection-directive.service.ts`, if the active lease is in `REQUESTED` or `PUBLISHER_CONNECTING`:
    - Transition state to `PUBLISHER_CONNECTING` (if not already).
    - Call `liveKit.createPublisherToken({ roomName: lease.provider_room_name, leaseId: lease.lease_id })`.
    - Attach `connection` to the parsed `LiveInspectionDirective` return object.
  - Update `get-student-live-inspection-directive.service.test.ts` to assert that `connection` is bundled for actionable directives and omitted for terminal leases.

- [x] **Task 1.4: Controller & DTO Alignment**
  - Update `live-inspection.dto.ts` and OpenAPI route definitions in `start-live-inspection.controller.ts` and `get-student-live-inspection-directive.controller.ts` to reflect the updated response schemas.

## Verification & Testing

```bash
pnpm --filter @sentinel/shared test --run src/schema/exams/live-inspection-schema.test.ts
pnpm --filter sentinel-api test --run src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts src/modules/examination/live-inspection/services/get-student-live-inspection-directive.service.test.ts
```

### Verification Evidence
- `@sentinel/shared` test suite: **9/9 tests passed**
- `sentinel-api` live-inspection service suite: **56/56 tests passed across 11 test files**
- TypeScript build for `@sentinel/shared`: **0 errors**

## Risks & Rollback

- **Backward Compatibility:** Because `connection` is marked as `.optional()` on schemas, older clients that do not expect `connection` will ignore it and continue using standalone endpoints without breaking.
- **Rollback:** Revert schema additions and service token bundling to restore previous separate endpoint flow.
