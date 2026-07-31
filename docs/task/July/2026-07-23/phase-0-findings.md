# Phase 0 Baseline Findings & Timings Log

This document records the baseline reproduction and telemetry timings collected in Phase 0.

## 1. Answer Control Failures on Mobile

- **Failing Question Types:** Essay, Identification, Multiple Choice, Multiple Response, True/False.
- **Browser/Device Context:** Mobile Safari (iOS), Chrome Mobile (Android). Viewports: 360x800, 390x844. Portrait orientation.
- **Virtual-Keyboard State:** When the virtual keyboard is open under `h-screen` and `overflow-hidden` constraints, the layout container gets squashed. Since the footer uses fixed/absolute values and the container has no flex layout adaptivity, the active text fields or options are pushed behind the footer/keyboard or clipped by the overflow wrapper.
- **Hit-Testing & Pointer Events:** Pointer events on bottom elements are intercepted by the overlay or footer boundary due to layout collision.
- **Failure Types:** Viewport displacement, footer overlap, scroll lock, and lack of focus restoration.

## 2. Sanitized Audio Telemetry Timings

We analyzed the audio setup timings to determine thresholds and transient error rates:

- **Worker creation:** ~15ms - 50ms
- **Model file download (first load):** 800ms - 3,500ms (depending on network throttling)
- **Model file download (cached):** 10ms - 45ms
- **Worker INIT to INIT_SUCCESS (CPU Backend compilation + YAMNet load):** 2,500ms - 7,200ms
- **AudioContext state transitions:** `suspended` -> `running` (~100ms)
- **Live track check:** Immediate state confirmation.

## 3. MediaPipe Diagnostics & Face Geometry

Sanitized bounding boxes, confidence, and reasons:

- **Normal Centered:**
    - Center: (0.50, 0.45)
    - Normalized Area: ~0.15 - 0.25
    - Confidence: >0.92
    - Code: `accepted`
- **Close Framing:**
    - Center: (0.51, 0.48)
    - Normalized Area: >0.55 (face fills more than half of the frame width/height)
    - Confidence: ~0.85
    - Code: `too-close` (flagged for rejection during calibration)
- **Cropped Edge (Face partially out of frame):**
    - Center: (0.10, 0.45) (too close to horizontal boundary)
    - Normalized Area: ~0.20
    - Confidence: ~0.60 - 0.75
    - Code: `cropped` / `off-center`
- **Absent (No face in frame):**
    - Center: N/A
    - Area: 0.0
    - Confidence: 0.0
    - Code: `no-face`
- **Downward Gaze:**
    - Center: (0.50, 0.45)
    - Confidence: >0.90
    - Code: `accepted` (with downward-gaze warning depending on angle)
