# Task 4 — Phase 1: Deferred Incident Side Effects

**Status:** Not started  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Make incident side effects explicitly deferable for evidence candidates while normal telemetry keeps
its current persist-then-side-effects behavior.

## Implementation Checklist

- [ ] Refactor `IncidentPersistenceService` in
      `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` into
      an internal record-persistence function and an exported JSDoc-documented side-effect runner;
      keep `appendEvent()` as the normal facade.
- [ ] Add an internal deferred result type in
      `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.types.ts`
      carrying the `AppendEventResult` and validated payload required for exact-once effects.
- [ ] Add a deferred evidence-candidate method to
      `app/sentinel-api/src/modules/telemetry/storage/storage.service.ts`; do not expose it to batch
      or queue ingestion.
- [ ] Update `TelemetryIngestionService.persistEvidenceCandidate()` in
      `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.service.ts` to return deferred
      context only for the three allowed MediaPipe types.
- [ ] Ensure `duplicate-ignored` candidates cannot run side effects twice.

## Tests and Verification

- [ ] Extend
      `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
      proving normal immediate effects, deferred behavior, and exact-once deferred execution.
- [ ] Extend `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.service.test.ts` for allowed
      types, rejected types, policy ignore, and deferred context propagation.
- [ ] Run focused telemetry storage/ingestion tests.

## Migration Decision

**Migration required:** No — orchestration uses existing telemetry records.

## Completion Gate

- [ ] Record focused command results here during implementation.
- [ ] Confirm normal queued and batch telemetry timing is unchanged.
- [ ] Confirm deferred effects are exact-once.
- [ ] Mark this phase complete only after tests pass.
