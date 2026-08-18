---
title: "Phase 1: Real-time Mobile MediaPipe Runtime Bridge"
type: phase
parent: "fix-002-mobile-mediapipe-calibration"
phase: "01"
status: planned
created: "2026-08-18"
tags: [task, phase, mobile, mediapipe, vision-bridge]
---

# Phase 1: Real-time Mobile MediaPipe Runtime Bridge

## Objective

Build a lightweight, high-performance MediaPipe vision runtime bridge (`MobileMediaPipeBridge`) in `sentinel-mobile` that executes `@mediapipe/tasks-vision` FaceLandmarker in an embedded environment, extracts real 478 3D landmarks from the camera feed, and streams normalized landmark coordinates to React Native hooks.

## Dependencies & Prerequisites

- `react-native-webview` installed in `app/sentinel-mobile/package.json`.
- Camera permissions handled by `expo-camera` in `sentinel-mobile`.

## Impacted Files & Components

- [NEW] `app/sentinel-mobile/features/exam/components/checkup/mobile-mediapipe-bridge.tsx`: Headless / embedded WebView bridge running MediaPipe Tasks-Vision FaceLandmarker, posting landmark frames to React Native.
- [NEW] `app/sentinel-mobile/features/exam/components/checkup/mobile-mediapipe-bridge.test.tsx`: Unit tests verifying message parsing, error handling, and lifecycle disposal.
- [MODIFY] `app/sentinel-mobile/features/exam/types/index.ts` / `types/exam.ts`: Types for landmark streaming, bridge status, and calibration frames.

## Implementation Tasks

- [ ] Task 1 — Implement `MobileMediaPipeBridge` with `@mediapipe/tasks-vision` bundle loading, WebAssembly fallback, and `postMessage` protocol delivering `landmarksByFace`, `confidenceScore`, and frame timestamps.
- [ ] Task 2 — Support configurable frame rate throttling (e.g. 500ms intervals during checkup, matching web `mediaPipeSandbox.frameIntervalMs`) to conserve mobile CPU and battery.
- [ ] Task 3 — Write comprehensive unit tests for `MobileMediaPipeBridge` validating mount, landmark ingestion, and unmount cleanup.

## Verification & Testing

- `pnpm --dir app/sentinel-mobile test features/exam/components/checkup/mobile-mediapipe-bridge.test.tsx`
- Validate that landmark messages pass schema validation without serialization overhead.

## Risks & Rollback

- **Risk**: WebGL context initialization failure on legacy devices.
- **Mitigation**: Implement graceful fallback and user-facing diagnostic toast prompting device camera/lighting checks.
