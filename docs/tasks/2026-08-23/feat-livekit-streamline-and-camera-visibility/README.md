---
title: "LiveKit Live Inspection 1-to-1 Camera Visibility & Latency Streamlining"
type: task
status: completed
created: "2026-08-23"
tags: [task, live-inspection, livekit, 1-to-1, webrtc, latency-optimization]
---

# LiveKit Live Inspection 1-to-1 Camera Visibility & Latency Streamlining

## Outcome

Streamline the LiveKit 1-to-1 live inspection connection handshake to reduce time-to-first-frame from ~5.0s down to **1.0s – 2.0s**, while guaranteeing 100% reliable student camera visibility and eliminating silent connection failures.

## Pre-planning record

- **Context Specification:** [`docs/context/August/23/live-inspection-streamline-and-camera-visibility.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/23/live-inspection-streamline-and-camera-visibility.md)
- **Status:** Completed

### Actors and goals

- **Instructor / Proctor:** Initiates spot-check inspection on a student; expects video feed to render within 1–2s without timeouts or "Waiting for student camera" lockups.
- **Student:** Taking proctored exam; seamlessly publishes a cloned WebRTC camera track to the LiveKit SFU upon instructor directive without disturbing local MediaPipe AI telemetry or freezing exam UI.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | Instructor clicks "Start live view" | Student active on `/attempt` with camera active | Feed renders in `< 2.0s` with bundled viewer token and bundled publisher token | If student camera delayed, `waitForCameraTrack` polls with 100ms adaptive intervals | Completed |
| **SC-02** | Instructor clicks "Stop live view" | Active 1-to-1 inspection | Local room disconnects, track detached, lease marked ended | Idempotent transition to ended; release room slot | Completed |
| **SC-03** | Concurrent inspection by second proctor | Student already under active inspection | Second proctor receives `409 Conflict: Currently inspected by another proctor` | UI displays informative busy badge without crashing | Completed |
| **SC-04** | Direct attempt page navigation / refresh | Student reloads attempt page directly | Stream is preserved or re-acquired smoothly; publisher binds upon directive | Diagnostic warning logged if session user mismatch | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **D1** | Credential delivery method | **Bundled Fast-Path with Fallback** | Eliminates 2 sequential HTTP round-trips (`/viewer-connection` and `/publisher-connection`), reducing connection latency by ~400ms. | Multi-step roundtrip handshake (Option B) | `live-inspection-streamline-and-camera-visibility.md` |
| **D2** | WebRTC publishing configuration | **Single Stream (`simulcast: false`, VP8)** | 1-to-1 stream does not need multi-bitrate encoding layers, saving ~350ms of encoder spin-up. | Multi-layer simulcast | `live-inspection-streamline-and-camera-visibility.md` |
| **D3** | Readiness acknowledgement | **Non-blocking Background Ack** | Lets LiveKit SFU deliver media to the viewer immediately upon `publishTrack` without awaiting API round-trip. | Blocking synchronous ack | `live-inspection-streamline-and-camera-visibility.md` |

### Unknowns and blockers

- None. All data models, APIs, and LiveKit client parameters are verified.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | FR-01, D1 | `startLiveInspection` optionally returns pre-issued `connection` object with viewer token and URL | `start-live-inspection.service.ts` + `live-inspection.dto.ts` | Vitest unit tests in `sentinel-api` | Passed |
| **AC-02** | FR-02, D1 | `getStudentLiveInspectionDirective` optionally returns pre-issued `connection` object with publisher token and URL | `get-student-live-inspection-directive.service.ts` | Vitest unit tests in `sentinel-api` | Passed |
| **AC-03** | FR-03, D2 | Student publisher connects with `simulcast: false` and preferred VP8 codec | `use-student-live-inspection-publication.ts` | Vitest unit tests in `@sentinel/hooks` | Passed |
| **AC-04** | FR-03, D3 | Student publisher fires `acknowledgePublisherReady` in background without blocking video stream | `use-student-live-inspection-publication.ts` | Vitest unit tests in `@sentinel/hooks` | Passed |
| **AC-05** | FR-01, FR-02 | Client hooks use bundled credentials when present, falling back to separate calls if absent | `use-live-inspection-viewer.ts`, `use-student-live-inspection-publisher.ts` | Vitest unit tests in `@sentinel/hooks` | Passed |
| **AC-06** | SC-01, Success criteria | Total time-to-first-frame reduced to `< 2.0s` (p95 `< 3.0s`) | All packages | End-to-end integration test & manual verification | Passed |

## Scope

- Bundling pre-generated LiveKit tokens in `startLiveInspection` and `getStudentLiveInspectionDirective`.
- Optimizing `useLiveInspectionViewer` and `useStudentLiveInspectionPublisher` hooks for instant parallel connection.
- Disabling simulcast for 1-to-1 streams and running readiness acknowledgement asynchronously.
- Preserving backwards compatibility for standalone connection endpoints.
- Diagnostic enhancements for local testing and multi-role contexts.

## Non-goals

- Continuous background video streaming for all students (violates Free-Tier resource limits).
- Changing Supabase auth tokens or authentication infrastructure.
- Modifying local MediaPipe computer vision models.

## Phases

- [x] [`phase-01-bundled-credentials-contracts-and-api.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026-08-23/feat-livekit-streamline-and-camera-visibility/phase-01-bundled-credentials-contracts-and-api.md) — Phase 1: Shared Schema Updates & Backend Bundled Credentials API
- [x] [`phase-02-streamlined-hooks-and-fast-handshake.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026-08-23/feat-livekit-streamline-and-camera-visibility/phase-02-streamlined-hooks-and-fast-handshake.md) — Phase 2: Client Hooks Fast-Path, Simulcast Tuning & Non-Blocking Ready Ack
- [x] [`phase-03-web-mobile-ui-and-monorepo-verification.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026-08-23/feat-livekit-streamline-and-camera-visibility/phase-03-web-mobile-ui-and-monorepo-verification.md) — Phase 3: Web UI Integration Parity, Stream Preservation & Full Monorepo Verification

## Verification

- Automated test suites across `@sentinel/shared`, `@sentinel/services`, `@sentinel/hooks`, `app/sentinel-api`, `app/sentinel-web`.
- Manual verification across two isolated browser sessions (Student in normal Chrome, Instructor in Incognito).
