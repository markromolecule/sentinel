# Task 1 - Phase 2: Attempt Page AI Incident Detection, Automatic Frame Capture & LiveKit Proctoring Bridge

**Goal:** Implement real-time MediaPipe anomaly monitoring (`GAZE_OFF_SCREEN`, `MULTIPLE_FACES`, `NO_FACE`, `LOOKING_AWAY`), automated evidence frame capture/upload, audio anomaly telemetry, and LiveKit proctoring camera bridge on `sentinel-mobile` during exam sessions.

---

## 1. Context & Architecture Strategy

In `sentinel-web`, exam attempt monitoring (`useAttemptMediaPipeMonitoring`) runs a continuous detection frame loop using MediaPipe FaceLandmarker, evaluates gaze/face bounds, dispatches telemetry incidents to the API backend, triggers frame snapshot uploads to Supabase storage, and exposes the live camera track to proctors via `StudentLiveInspectionBridge` (which calls `useStudentLiveInspectionPublisher` from `@sentinel/shared` / `@sentinel/hooks`).

In `sentinel-mobile`:
1. Session screen (`app/exam/[id]/session/[sessionId]/index.tsx`) does not run real-time face tracking or gaze detection during answer taking.
2. Anomaly violations like looking off screen or multiple faces are not detected or reported as telemetry events.
3. Automated image evidence frame capture is not wired up during security events.
4. Instructors viewing live proctoring cannot access the student's mobile camera stream via LiveKit because the proctoring bridge publisher is missing on mobile.

---

## 2. Tasks & Implementation Steps

### Mobile Attempt MediaPipe Monitoring Hook
- [ ] **Create** `app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.ts`
  - Implement face tracking loop during session.
  - Evaluate gaze offsets, multiple faces count, and missing face events using `@sentinel/shared` `analyzeMediaPipeFrame`.
  - Dispatch telemetry events (`GAZE_OFF_SCREEN`, `MULTIPLE_FACES`, `NO_FACE`, `LOOKING_AWAY`) via `emitMobileTelemetryEvent`.
  - Expose warning status state for UI overlay ("Face not detected", "Multiple faces detected", "Looking away from screen").
- [ ] **Write unit tests** at `app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.test.ts`
  - Test frame interval throttling, anomaly trigger thresholds, and telemetry event dispatching.

### Automated Evidence Frame Capture & Audio Anomaly
- [ ] **Create** `app/sentinel-mobile/features/exam/lib/mobile-frame-capture.ts`
  - Implement frame capture helper using `expo-camera` snapshot / base64 frame reference on anomaly detection or scheduled intervals.
  - Upload evidence frames to backend evidence endpoint `/api/student/exam-attempts/{attemptId}/incidents/evidence`.
- [ ] **Write unit tests** at `app/sentinel-mobile/features/exam/lib/mobile-frame-capture.test.ts`
  - Test frame capture trigger logic, base64 payload formatting, and upload error retries.

### LiveKit Live Inspection Proctoring Bridge
- [ ] **Create** `app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.tsx`
  - Integrate `useStudentLiveInspectionPublisher` from `@sentinel/hooks`.
  - Pass mobile camera stream video track (`getLiveVideoTrack`).
  - Render subtle top status pill ("Camera being viewed live by authorized proctor") when proctor connects to room.
- [ ] **Write unit tests** at `app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.test.tsx`
  - Test bridge render state when proctor is inspecting vs inactive.

### Session Integration
- [ ] **Update** `app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`
  - Wire up `useMobileMediaPipeMonitoring` and `MobileLiveInspectionBridge`.
  - Display non-intrusive anomaly alert banner when security rules are violated.

---

## 3. Technical Verification & Constraints

- **Migration required:** No.
- **Breaking changes:** No.
- **Verification Commands:**
  - `pnpm --dir app/sentinel-mobile test`
