# Task 1 - Phase 1: MediaPipe Calibration, Center Alignment Guide, Audio Anomaly Setup & Lobby Readiness Gating

**Goal:** Establish 1:1 functional parity between `sentinel-web` and `sentinel-mobile` for pre-exam checkup calibration, face center-alignment overlay, audio stream readiness, and lobby entry gating.

---

## 1. Context & Architecture Strategy

In `sentinel-web`, face landmark calibration (`useCheckupMediaPipe`) requires a 6-frame stable alignment hold inside a dashed ellipse overlay before marking calibration complete. The student lobby (`useLobbyReadiness`) prevents entrance unless camera, microphone, MediaPipe calibration, and lobby admission requirements are satisfied.

In `sentinel-mobile`, camera permission checking and basic preview exist (`features/exam/components/checkup/camera-preview.tsx`), but:
1. Face center-alignment guide overlay, hold-still progress, and MediaPipe calibration evaluation (`@sentinel/shared`) are not integrated.
2. Microphone level monitoring does not validate audio anomaly worker readiness.
3. Lobby screen (`use-exam-lobby.ts`) allows session start without checking MediaPipe calibration or audio readiness.
4. Active student count on the mobile lobby page is not synchronized with real-time SSE/LiveKit proctoring state.

---

## 2. Tasks & Implementation Steps

### Checkup Screen & MediaPipe Calibration
- [ ] **Create** `app/sentinel-mobile/features/exam/lib/mobile-mediapipe-calibration.ts`
  - Wrap `@sentinel/shared` `analyzeMediaPipeFrame`, `evaluateMediaPipeCalibrationCandidate`, and `buildMediaPipeCalibrationProfile`.
  - Expose helper functions `evaluateMobileCheckupFrame()` and `isMobileCalibrationStable()`.
  - Add JSDoc comments to exported functions.
- [ ] **Write unit tests** at `app/sentinel-mobile/features/exam/lib/mobile-mediapipe-calibration.test.ts`
  - Cover frame stability check, landmark mapping, and profile creation.
- [ ] **Update** `app/sentinel-mobile/features/exam/components/checkup/camera-preview.tsx`
  - Render dashed face alignment ellipse guide (`width * 0.44` by `height * 0.64`).
  - Render status label ("Align face in guide" / "Hold still to calibrate...") and progress bar (0% - 100%).
  - Highlight green stroke when face is centered and ready.
- [ ] **Update** `app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts`
  - Integrate calibration state (`calibrationProgress`, `isCalibrated`, `calibrationFeedback`, `calibrationProfile`).
  - Store calibration profile in local storage via `mobile-exam-storage.ts`.

### Audio Stream & Anomaly Setup
- [ ] **Create** `app/sentinel-mobile/features/exam/lib/mobile-audio-anomaly.ts`
  - Implement mobile WebAudio / mic analyzer for decibel calculation and silence/voice activity detection.
  - Expose `createMobileAudioAnalyzer()` and `evaluateMobileAudioLevel()`.
- [ ] **Write unit tests** at `app/sentinel-mobile/features/exam/lib/mobile-audio-anomaly.test.ts`
  - Test audio level thresholding and decibel calculation logic.

### Lobby Entry Gating & Student Counter
- [ ] **Update** `app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`
  - Check `isMediaPipeCalibrated` and `isAudioReady` before allowing `canEnterExam`.
  - Gate `handleEnterExam` action with checkup completion notification if uncalibrated.
  - Subscribe to real-time student count updates via `useExamLobbyCountQuery` and polling fallback.
- [ ] **Write unit tests** at `app/sentinel-mobile/features/exam/hooks/use-exam-lobby.test.ts`
  - Test blocked entry when MediaPipe is uncalibrated.
  - Test allowed entry when all checkup requirements are satisfied.
  - Test live student count state updates.

---

## 3. Technical Verification & Constraints

- **Migration required:** No — DB schema already includes telemetry and exam configurations.
- **Breaking changes:** No.
- **Verification Commands:**
  - `pnpm --dir app/sentinel-mobile test`
