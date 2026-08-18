---
title: "Fix Mobile MediaPipe Calibration & Real-time Gaze Detection Parity"
type: task
status: completed
created: "2026-08-18"
tags: [task, mobile, mediapipe, calibration, gaze-tracking, expo, react-native]
---

# Fix Mobile MediaPipe Calibration & Real-time Gaze Detection Parity

## Outcome

Eliminate simulated/mock MediaPipe calibration timers in `sentinel-mobile` and establish real-time MediaPipe face landmarking, gaze tracking, boundary centering evaluation, and calibration baseline profile computation with 1:1 parity with `sentinel-web`.

## Pre-planning record

### Actors and goals

- **Student on Mobile (`sentinel-mobile`)**: Performs system checkup before starting an exam. The front-facing camera must actively detect the student's face, guide alignment within the target ellipse, verify open eyes and forward gaze, and hold still for 6 stable frames before generating a valid calibration profile.
- **Sentinel Mobile Exam Session (`sentinel-mobile`)**: Consumes the computed calibration profile during an active exam attempt to detect real-time proctoring anomalies (`GAZE_OFF_SCREEN`, `MULTIPLE_FACES`, `NO_FACE_DETECTED`) and dispatch incident telemetry and snapshot evidence.
- **Instructor & Proctor (`sentinel-web` / `sentinel-support`)**: Views accurate telemetry events and evidence captures originating from authentic mobile gaze tracking, matching web proctoring behavior.

### Domain language

- **MediaPipe Face Landmarker**: Machine learning vision pipeline (`@mediapipe/tasks-vision`) extracting 478 3D facial landmarks from camera frames.
- **Calibration Profile (`MediaPipeCalibrationProfile`)**: A baseline reference containing the student's neutral center-looking gaze offsets (`irisHorizontalOffset`, `irisVerticalOffset`, `headHorizontalOffset`, `headVerticalOffset`) and face bounding box.
- **Calibration Stability Window**: 6 consecutive frames (~3 seconds at 500ms intervals) where face center, head pose, and iris coordinates remain within drift thresholds (<8% center delta, <12% head delta, <28% iris delta).
- **Mobile Vision Bridge (`MobileMediaPipeBridge`)**: High-performance bridge running `@mediapipe/tasks-vision` WASM/WebGL to deliver normalized landmarks to React Native state.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Student enters checkup without face in camera frame | Camera permission granted | Alignment overlay displays "Align face in guide" with red/neutral guide; progress remains 0% | Clear feedback: "No face detected in the camera frame." | Planned |
| SC-02 | Student aligns face and looks away or closes eyes | Camera active | Calibration halts; feedback indicates "Both eyes appear closed" or "Face off-center" | Progress resets or holds until gaze returns to center | Planned |
| SC-03 | Student aligns face in center guide and holds still for 3s | Camera active, single face centered | Progress increments smoothly (0% -> 100%) across 6 stable frames; calibration profile is computed and saved to storage | If movement exceeds drift threshold, buffer resets to last stable frame | Planned |
| SC-04 | Exam lobby checks calibration state | Checkup completed | `useExamLobby` reads valid stored profile; unlocks "Enter Exam" button | If profile missing/invalid, entry remains gated with warning | Planned |
| SC-05 | Active exam session detects looking away | Exam in progress with calibrated profile | Gaze tracking compares live landmarks against baseline profile; triggers `GAZE_OFF_SCREEN` warning and telemetry | Cooldown throttles duplicate events | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How should MediaPipe FaceLandmarker run in Expo / React Native? | Utilize a dedicated headless / embedded MediaPipe vision runner using `@mediapipe/tasks-vision` in WebView / Web engine or frame processor bridge, streaming landmarks to React Native. | React Native's Hermes/JSC lacks DOM/Canvas/WASM WebGL primitives needed for `@mediapipe/tasks-vision`. `react-native-webview` is already bundled in `sentinel-mobile/package.json` and supports full WebAssembly + WebRTC/getUserMedia. | Relying on hardcoded `setInterval` timers with mock landmark coordinates (rejected: current bug where calibration is fake). | `phase-01-mediapipe-mobile-runtime-bridge.md` |
| DEC-02 | How to ensure calibration candidate evaluation matches `sentinel-web`? | Utilize `@sentinel/shared` `evaluateMediaPipeCalibrationCandidate`, `isMobileCalibrationStable`, and `buildMediaPipeCalibrationProfile` directly on mobile. | Shared pure functions already exist and are fully tested in `@sentinel/shared/src/mediapipe/`. Mobile must reuse the exact same mathematical formulas. | Writing ad-hoc heuristics in mobile components. | `phase-02-checkup-gaze-calibration-and-feedback.md` |
| DEC-03 | How to wire live landmarks into `exam-session-screen.tsx`? | Feed real-time `landmarksByFace` from the camera vision stream into `useMobileMediaPipeMonitoring` instead of empty `[]`. | Currently `landmarksByFace` is hardcoded as `useState<any[][]>([])`, preventing real-time exam proctoring from working. | Keeping empty array and only relying on manual triggers. | `phase-03-session-monitoring-and-verification.md` |

### Unknowns and blockers

- *Resolved*: MediaPipe WASM and model assets (`face_landmarker.task`) are accessible via standard CDN endpoints (`jsdelivr` & Google Cloud Storage) matching `sentinel-web`.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, SC-02, DEC-01 | System checkup actively detects real face landmarks from the front camera instead of running a static simulation | `use-exam-checkup.ts` & `MobileMediaPipeBridge` | Vitest & manual check | Planned |
| AC-02 | SC-02, DEC-02 | Real-time calibration candidate feedback displays accurate states (eyes closed, off-center, too close/far, multiple faces, holding still) | `evaluateMediaPipeCalibrationCandidate` integration | Vitest & manual check | Planned |
| AC-03 | SC-03, DEC-02 | Calibration profile is generated from 6 verified stable frames and saved to AsyncStorage | `buildMobileCalibrationProfile` & storage | Vitest unit test | Planned |
| AC-04 | SC-04 | Lobby gating checks the authentic calibration profile before permitting exam entry | `use-exam-lobby.ts` verification | Vitest unit test | Planned |
| AC-05 | SC-05, DEC-03 | Active exam session runs continuous MediaPipe monitoring using real landmark streams | `exam-session-screen.tsx` & `useMobileMediaPipeMonitoring` | Vitest test suite | Planned |

## Scope

- `app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts`
- `app/sentinel-mobile/features/exam/components/checkup/camera-preview.tsx`
- `app/sentinel-mobile/features/exam/components/checkup/mobile-mediapipe-bridge.tsx` (new bridge component)
- `app/sentinel-mobile/features/exam/lib/mobile-mediapipe-calibration.ts`
- `app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`
- `app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.ts`
- Associated unit tests across `app/sentinel-mobile`

## Non-goals

- Modifying web MediaPipe pipelines in `sentinel-web` (web pipeline is the gold standard reference).
- Adding backend database migrations (existing telemetry schemas support mobile and web).

## Phases

- [x] `phase-01-mediapipe-mobile-runtime-bridge.md` — Phase 1: Real-time Mobile MediaPipe Runtime Bridge
- [x] `phase-02-checkup-gaze-calibration-and-feedback.md` — Phase 2: Live Checkup Gaze Calibration, Candidate Evaluation & Feedback
- [x] `phase-03-session-monitoring-and-verification.md` — Phase 3: Exam Session Landmark Stream Integration & End-to-End Verification

## Verification

Run mobile test suite:
- `pnpm --dir app/sentinel-mobile test`
- Manual execution on Expo dev client / simulator verifying live camera face tracking, hold-still progress bar, off-screen gaze feedback, and profile persistence.

## Deviations

None.

## Result

Implementation complete and verified. All 135 unit tests pass, and `pnpm tsc --noEmit` checks have completed with 0 compiler errors.
