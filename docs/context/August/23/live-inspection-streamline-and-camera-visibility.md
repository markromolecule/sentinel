---
title: "Live Inspection 1-to-1 Camera Visibility and Latency Streamlining Spec"
type: context
status: ready
created: "2026-08-23"
tags: [context, live-inspection, livekit, 1-to-1, webrtc, latency-optimization, camera-feed]
feature: "live-inspection-streamline-and-camera-visibility"
---

# LiveKit Live Inspection 1-to-1 Camera Visibility and Latency Streamlining Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Camera Visibility / Student Feed Failure:** During 1-to-1 live monitoring, instructors encounter instances where the live feed remains on "Waiting for student camera" / "Waiting for student device" and fails to render the student's video stream, or results in a 1-participant LiveKit session (where only the instructor joined and the student publisher never connected).
  2. **Connection Latency (5s down to 1–3s):** The current 1-to-1 LiveKit inspection flow requires multiple sequential HTTP roundtrips across both viewer and publisher (`start` $\rightarrow$ `createViewerConnection` on the instructor side; `directive` $\rightarrow$ `createPublisherConnection` $\rightarrow$ `publishTrack` $\rightarrow$ `acknowledgePublisherReady` on the student side), accumulating ~4.5 to 5.5 seconds of total handshake time before video renders.

- **Business / User Value:**
  - **Instant Spot-Check UX:** Reducing connection establishment to 1–3 seconds provides near real-time live video verification for proctors reviewing flagged anomaly incidents (e.g., gaze off-screen, tab switches).
  - **Reliable Verification:** Guarantees that students actively on the exam attempt page with active camera streams immediately bind to the instructor's LiveKit inspection room with zero silent drops.
  - **Resource Stewardship:** Keeps Sentinel strictly within LiveKit Free-Tier / cost-effective constraints (on-demand 1-to-1 spot-checks, 2 participants max, zero background idle video streaming).

- **Measurable Success Criteria:**
  - Time-to-first-frame video render on instructor monitor reduced from ~5.0s to `< 2.0s` (p95 `< 3.0s`).
  - 100% successful video track attachment when student is active on attempt page with camera permission granted.
  - Zero unhandled 409 conflict errors during concurrent proctor inspections or repeated start/retry cycles.
  - Automatic cleanup and graceful teardown (`< 500ms`) when proctor navigates away or stops live view.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor/Proctor monitoring an exam, when I click "Start live view" on a flagged student, I want the student's live camera feed to appear on my screen within 1–2 seconds so I can quickly verify exam integrity.*
- *As a Student taking an exam, when an authorized proctor initiates a spot check, I want my device to seamlessly publish a cloned video track without interrupting my active MediaPipe AI telemetry or freezing my exam interface.*
- *As a Proctor navigating between different student monitoring pages, I want previous LiveKit connections and tracks to immediately disconnect and release resources so subsequent inspections connect instantly.*

### Functional Requirements

- [ ] **FR-01 (Bundled Viewer Connection in Lease Initiation):**
  - Update `startLiveInspection` service and API response schema (`LiveInspectionStaffStatus`) to include bundled `connection?: LiveInspectionConnectionResponse` containing pre-generated LiveKit viewer credentials (`token`, `liveKitUrl`, `participantIdentity`, `roomName`).
  - Eliminate the sequential `POST /viewer-connection` HTTP round-trip in `useLiveInspectionViewer`.
- [ ] **FR-02 (Direct Publisher Credentials in Directive Response):**
  - Update `getStudentLiveInspectionDirective` service and API response schema (`LiveInspectionDirective`) to include bundled `connection?: LiveInspectionConnectionResponse` when the lease state is `REQUESTED` or `PUBLISHER_CONNECTING`.
  - Transition state to `PUBLISHER_CONNECTING` atomically upon issuing the token and eliminate the sequential `POST /publisher-connection` roundtrip in `useStudentLiveInspectionPublication`.
- [ ] **FR-03 (WebRTC Publishing Optimization & Non-Blocking Ready Ack):**
  - Configure LiveKit publisher track options with `simulcast: false` and preferred video codec (`VP8`) for 1-to-1 streams to eliminate multi-layer transcoding delays.
  - Fire `acknowledgePublisherReady` asynchronously/optimistically in the background without blocking track publishing or local/remote playback.
- [ ] **FR-04 (Camera Availability & Stream Acquisition Fallback):**
  - Ensure `useStudentExamMediaPipeStream` and `StudentLiveInspectionBridge` acquire/preserve the live video track robustly across route re-renders or direct attempt page loads.
  - Add explicit diagnostic logging when student camera track cloning fails (`NO_LIVE_CAMERA_TRACK`) or when auth context desyncs.
- [ ] **FR-05 (Single-Device / Multi-Role Testing Resilience):**
  - Improve error reporting and diagnostics when student directive/session verification encounters authentication or session mismatch errors in local environments.

### Edge Cases & Failure Modes

- **Edge Case 1: Student camera track is momentarily restarting or busy:**
  - *Behavior:* `waitForCameraTrack` polls with adaptive 100ms intervals up to a bounded timeout before acknowledging failure.
- **Edge Case 2: Proctor abruptly closes browser or switches tabs:**
  - *Behavior:* `useLiveInspectionViewer` cleans up the LiveKit room and calls `stopLiveInspection` in `beforeunload` / `useEffect` cleanup.
- **Edge Case 3: Two proctors inspect the same student simultaneously:**
  - *Behavior:* The second proctor receives a `409 CONFLICT` with informative UI badge: *"Student is currently under live inspection by another proctor"* without crashing.
- **Edge Case 4: Standalone Fallback:**
  - *Behavior:* Existing endpoints (`/viewer-connection` and `/publisher-connection`) remain supported for backward compatibility if a client receives a response without bundled credentials.

---

## 3. Technical & Architectural Context

### Affected Domains / Layers

1. **Backend API (`app/sentinel-api`):**
   - [`src/modules/examination/live-inspection/services/start-live-inspection.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.ts)
   - [`src/modules/examination/live-inspection/services/get-student-live-inspection-directive.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/get-student-live-inspection-directive.service.ts)
   - [`src/modules/examination/live-inspection/live-inspection.dto.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/live-inspection.dto.ts)
   - [`src/modules/examination/live-inspection/controllers/start-live-inspection.controller.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/controllers/start-live-inspection.controller.ts)
   - [`src/modules/examination/live-inspection/controllers/get-student-live-inspection-directive.controller.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/controllers/get-student-live-inspection-directive.controller.ts)
2. **Shared Schemas (`packages/shared`):**
   - [`src/schema/exams/live-inspection-schema.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/shared/src/schema/exams/live-inspection-schema.ts)
3. **Shared Hooks (`packages/hooks`):**
   - [`src/live-inspection/use-live-inspection-viewer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-viewer.ts)
   - [`src/live-inspection/use-student-live-inspection-publisher.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts)
   - [`src/live-inspection/use-student-live-inspection-publication.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-student-live-inspection-publication.ts)
   - [`src/live-inspection/use-student-live-inspection-publisher.helpers.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-student-live-inspection-publisher.helpers.ts)
4. **Frontend UI (`app/sentinel-web` & `packages/ui`):**
   - [`app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.tsx)
   - [`app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.tsx)
   - [`packages/ui/src/components/live-video-monitor.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/ui/src/components/live-video-monitor.tsx)

### Data Model & Schema Changes

```ts
// packages/shared/src/schema/exams/live-inspection-schema.ts

export const liveInspectionStaffStatusSchema = z.object({
    leaseId: z.string().uuid(),
    attemptId: z.string().uuid(),
    studentUserId: z.string().uuid(),
    viewerUserId: z.string().uuid(),
    state: liveInspectionStateSchema,
    revision: z.number().int().nonnegative(),
    requestedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    startedAt: z.string().datetime().nullable(),
    endedAt: z.string().datetime().nullable(),
    endReason: z.string().nullable(),
    lastErrorCode: z.string().nullable(),
    connection: liveInspectionConnectionResponseSchema.optional(), // [NEW] Pre-issued viewer token & URL
});

export const liveInspectionDirectiveSchema = z.object({
    leaseId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    state: liveInspectionStateSchema,
    attemptId: z.string().uuid(),
    topic: z.string().min(1),
    connection: liveInspectionConnectionResponseSchema.optional(), // [NEW] Pre-issued publisher token & URL
});
```

---

## 4. Resolved Decisions Ledger

| # | Topic | Selected Option | Rationale |
|---|---|---|---|
| **D1** | Handshake Credential Delivery | **Option A: Bundled Fast-Path with Fallback** | Bundles pre-generated LiveKit tokens directly in `startLiveInspection` (for viewer) and `getStudentLiveInspectionDirective` (for publisher). Eliminates 2 full HTTP roundtrips, reducing connection establishment time from ~5.0s to 1–2s while preserving full RBAC checks. |
| **D2** | WebRTC Publishing Mode | **Single 1-to-1 Stream (`simulcast: false`)** | Since LiveKit inspection is strictly 1-to-1 (1 student $\rightarrow$ 1 instructor), simulcast encoding is disabled, saving 300–500ms of encoder spin-up time on student machines. |
| **D3** | Readiness Acknowledgement | **Non-blocking Background Ack** | The student's `POST /publisher-ready` call runs asynchronously without blocking WebRTC video track publication, allowing LiveKit SFU to forward packets to the viewer immediately. |

---

## 5. Proposed Latency Breakdown: Current vs. Streamlined

| Phase | Current Implementation | Streamlined Target | Time Saved |
| :--- | :--- | :--- | :--- |
| **1. Proctor Start Lease** | `POST /live-inspections` (~250ms) | `POST /live-inspections` (returns viewer token) (~250ms) | 0ms |
| **2. Proctor Viewer Token** | `POST /viewer-connection` (~200ms) | **ELIMINATED** (Bundled in Step 1) | **-200ms** |
| **3. Proctor LiveKit Room Join** | `room.connect()` (~350ms) | `room.connect()` (runs in parallel) (~300ms) | -50ms |
| **4. Student Discovery & Directive** | Supabase Broadcast or 1000ms poll (~300–1000ms) + `POST /directive` (~200ms) | Broadcast + fast poll + `POST /directive` (returns pub token) (~350ms) | **-350ms to -850ms** |
| **5. Student Publisher Token** | `POST /publisher-connection` (~200ms) | **ELIMINATED** (Bundled in Step 4) | **-200ms** |
| **6. Student Track Wait & Clone** | `waitForCameraTrack` (~250ms) | Immediate track clone (~10ms) | **-240ms** |
| **7. Student LiveKit Room Join** | `room.connect()` (~350ms) | `room.connect()` (~300ms) | -50ms |
| **8. Student Track Publish** | `publishTrack` with simulcast (~600ms) | `publishTrack` (`simulcast: false`, VP8) (~250ms) | **-350ms** |
| **9. Student Ready Ack** | `POST /publisher-ready` (blocks state) (~200ms) | Non-blocking background ack (~0ms blocking) | **-200ms** |
| **10. Video Playback & Render** | Track subscribed + buffer (~400ms) | Track subscribed + instant play (~250ms) | -150ms |
| **TOTAL TIME TO FIRST FRAME** | **~4.5s – 5.5s** | **~1.2s – 2.0s** | **~3.0s – 3.5s Faster!** |

---

## 6. Scope & Boundaries

- **In Scope:**
  - Fast-path bundled credentials in `startLiveInspection` and `getStudentLiveInspectionDirective`.
  - Elimination of redundant HTTP round-trips for both viewer and publisher handshakes.
  - Video track cloning and publishing optimization (`simulcast: false`, immediate track attach).
  - Diagnostic logging and multi-role testing session awareness.
  - Preserving all security, tenant isolation, and RBAC authorization invariants.

- **Out of Scope:**
  - Continuous background video streaming for all students (violates Free-Tier cost model).
  - Peer-to-peer WebRTC mesh (must continue using LiveKit SFU for consistent institutional NAT traversal).

---

## 7. References & External Context

- Context Factory Orchestration Contract: [`context-factory/orchestrator/SHARED.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/context-factory/orchestrator/SHARED.md)
- LiveKit Free-Tier Integration Context: [`docs/context/July/July 19/plan-integration-livekit-and-strategy.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/July/July%2019/plan-integration-livekit-and-strategy.md)
- LiveKit Investigation Log: [`docs/context/July/July 23/resolve-live-inspection-livekit-issue.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/July/July%2023/resolve-live-inspection-livekit-issue.md)

---

## 8. Verification Strategy & Acceptance Criteria

- **Automated Vitest Tests:**
  - `startLiveInspection.service.test.ts` & `get-student-live-inspection-directive.service.test.ts` verifying bundled connection payloads.
  - `use-student-live-inspection-publisher.test.tsx` and `use-live-inspection-viewer.test.tsx` verifying streamlined handshake flow and timing.
- **Manual Verification:**
  - In separate browser windows (Student in normal Chrome, Instructor in Incognito), trigger live inspection and verify video connects and renders within 1–2 seconds.
  - Verify stopping and restarting works smoothly without 409 errors.
