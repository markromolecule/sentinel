---
title: "Phase 2 — Client Hooks Fast-Path, Simulcast Tuning & Non-Blocking Ready Ack"
type: phase
parent: "feat-livekit-streamline-and-camera-visibility"
phase: "02"
status: completed
created: "2026-08-23"
tags: [task, phase, live-inspection, hooks, webrtc, latency-optimization]
---

# Phase 2 — Client Hooks Fast-Path, Simulcast Tuning & Non-Blocking Ready Ack

## Objective

Refactor `@sentinel/hooks` live-inspection viewer and publisher hooks to consume bundled LiveKit credentials immediately upon lease initiation or directive fetch, disable simulcast encoding (`simulcast: false`, VP8), send `acknowledgePublisherReady` in a non-blocking background task, and implement adaptive 500ms discovery polling.

## Dependencies & Prerequisites

- Phase 1 completed (bundled connection payloads in API responses).

## Impacted Files & Components

- `packages/hooks/src/live-inspection/use-live-inspection-viewer.ts`: Consume bundled `lease.connection` to immediately invoke `connectViewerWithCredentials` without calling `createLiveInspectionViewerConnection`.
- `packages/hooks/src/live-inspection/use-live-inspection-viewer.test.tsx`: Update unit tests to verify fast-path connection bypassing secondary HTTP calls.
- `packages/hooks/src/live-inspection/use-student-live-inspection-publication.ts`: Consume bundled `directive.connection` to immediately connect and publish without calling `createLiveInspectionPublisherConnection`.
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts`: Tune discovery interval to 500ms when an inspection is active/connecting, and handle immediate wake-up signals.
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.helpers.ts`: Enhance `waitForCameraTrack` to poll with 100ms adaptive intervals up to 8s; add user-friendly developer warnings for multi-role session auth mismatches.
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.test.tsx`: Update publisher unit tests to verify single-step connection and non-blocking ready acknowledgement.

## Implementation Tasks

- [x] **Task 2.1: Viewer Hook Fast-Path Integration**
  - In `useLiveInspectionViewer.ts`, refactor `connectViewer` to accept optional `credentials?: LiveInspectionConnectionResponse`.
  - In `start()`, if `lease.connection` is present, pass `lease.connection` directly to `connectViewer(lease, lease.connection)`.
  - Fall back to `createLiveInspectionViewerConnection(apiClient, { examId, leaseId })` only if `lease.connection` is undefined.

- [x] **Task 2.2: Student Publication Fast-Path & WebRTC Tuning**
  - In `useStudentLiveInspectionPublication.ts`, inspect `directive.connection`. If present, skip calling `createLiveInspectionPublisherConnection`.
  - Configure `room.localParticipant.publishTrack` with `{ source: Track.Source.Camera, simulcast: false, videoCodec: 'vp8', stopLocalTrackOnUnpublish: false }`.
  - Trigger `acknowledgeLiveInspectionPublisherReady` asynchronously without awaiting its completion before resolving `startPublication`, allowing LiveKit SFU to relay video frames immediately.

- [x] **Task 2.3: Adaptive Polling & Diagnostic Enhancements**
  - In `useStudentLiveInspectionPublisher.ts`, reduce fallback polling from 1000ms to 500ms during `connecting` or `requested` states to minimize broadcast latency gaps.
  - In `useStudentLiveInspectionPublisher.helpers.ts`, update `logLocalDiagnostic` to log an explicit note if a 404/403 occurs in development: `"Ensure student and instructor sessions run in separate browser profiles (Normal + Incognito) to prevent auth token overwriting."`

## Verification & Testing

```bash
pnpm --filter @sentinel/hooks test --run src/live-inspection/use-live-inspection-viewer.test.tsx src/live-inspection/use-student-live-inspection-publisher.test.tsx
```

### Verification Evidence
- `@sentinel/hooks` live-inspection test suite: **27/27 tests passed** (14 viewer tests + 13 publisher tests)
- Full `@sentinel/hooks` suite: **62/62 test files passed (181/181 tests)**
- TypeScript build for `@sentinel/hooks`: **PASS (0 errors)**

## Risks & Rollback

- **Fallback Safety:** If the backend does not return `connection`, both hooks automatically fall back to their respective secondary endpoints (`createLiveInspectionViewerConnection` and `createLiveInspectionPublisherConnection`).
- **Rollback:** Revert hook modifications in `packages/hooks/src/live-inspection/`.
