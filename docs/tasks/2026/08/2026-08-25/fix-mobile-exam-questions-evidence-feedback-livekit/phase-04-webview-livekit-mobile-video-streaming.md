---
title: "Phase 4: WebView-based LiveKit Mobile Video Streaming"
type: phase
parent: "Fix Mobile Exam Questions, Evidence Upload, Feedback Screen, and LiveKit Streaming"
phase: "4"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, livekit, streaming]
---

# Phase 4: WebView-based LiveKit Mobile Video Streaming

## Objective

Establish live camera video streaming from Sentinel Mobile to Sentinel Web during proctor live inspection by hosting the LiveKit publisher inside the `MobileMediaPipeBridge` WebView.

---

## Dependencies & Prerequisites

- Phases 1–3 completed.

---

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/components/checkup/mobile-mediapipe-bridge.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/checkup/mobile-mediapipe-bridge.tsx)
- [`app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.tsx)
- [`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx)
- [`app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.test.tsx)

---

## Implementation Tasks

- [x] Update `MobileMediaPipeBridge` HTML template to load the `livekit-client` browser bundle.
- [x] Implement LiveKit publication handler inside the WebView script:
  - Listens for `{ type: 'start_inspection', liveKitUrl, token }` messages.
  - Connects to the LiveKit Room, attaches the active camera `localStream.getVideoTracks()[0]`, and publishes the video track.
  - Listens for `{ type: 'stop_inspection' }` messages to unpublish tracks and disconnect.
  - Emits status messages (`{ type: 'inspection_status', status: 'connected' | 'disconnected' | 'error' }`) back to React Native.
- [x] Expose imperative methods `startLiveInspection(credentials)` and `stopLiveInspection()` on `MobileMediaPipeBridge` ref.
- [x] Connect `MobileLiveInspectionBridge` to receive authoritative directives from `getStudentLiveInspectionDirective` and forward them to the `MobileMediaPipeBridge` ref.
- [x] Display the top overlay banner ("Camera being viewed live by authorized proctor") when LiveKit video publication is active.
- [x] Update unit tests in `mobile-live-inspection-bridge.test.tsx`.

---

## Verification & Testing

- Run test suite:
  ```bash
  pnpm --filter sentinel-mobile test
  ```

  - **Result**: 31/31 test files passed (150 tests passed).
  - `mobile-live-inspection-bridge.test.tsx` passed 3/3 test cases verifying live indicator rendering and PUBLISH directive publication initiation.

---

## Risks & Rollback

- **Risk**: WebView CDN bundle loading delay.
- **Mitigation**: Preload / initialize the LiveKit bundle within the bridge during startup so it is immediately ready when inspection starts.
