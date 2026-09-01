---
title: "Master Task: Screenshot Prevention, Detection, and Telemetry Remediation"
type: task
status: completed
created: "2026-08-31"
tags: [task, master, proctoring, telemetry, screenshot, web, mobile]
---

# Master Task: Screenshot Prevention, Detection, and Telemetry Remediation

## Outcome

Deliver an end-to-end multi-layer defense against screenshot attempts across `sentinel-web`, `sentinel-core`, and `sentinel-mobile`:

1. **Web Multi-Layer Detection:** Intercept desktop screenshot shortcuts across `keydown` and `keyup` (`PrintScreen`, `Alt+PrintScreen`, `Cmd+Shift+3/4/5`, `Win+Shift+S`) and correlate `Meta+Shift` modifier states with window `blur` events to detect OS-level snipping overlays.
2. **Web Content Protection:** Clear/purge system clipboard upon screenshot triggers and visually blur the exam interface on focus loss.
3. **Mobile Hardware Screenshot Blocking:** Utilize `expo-screen-capture` on Android to set native `FLAG_SECURE`, preventing screenshots and screen recordings in the OS.
4. **Mobile iOS Screenshot Listener & App Pinning Disambiguation:** Register `ScreenCapture.addScreenshotListener` on iOS/Android to emit `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`), and suppress `APP_PINNING_VIOLATION` during screenshot actions.

## Context Document

- Context Specification: `docs/context/August/31/screenshot-detection-and-prevention.md`

## Architecture Decisions

- ADR: `docs/decisions/2026-08-31-screenshot-detection-and-prevention.md`

## Impacted Applications & Packages

- `app/sentinel-web`
- `app/sentinel-core`
- `app/sentinel-mobile`

## Decision Ledger

| ID | Decision Question | Selected Option | Rationale |
| --- | --- | --- | --- |
| D-01 | How should Web handle OS-level screenshot shortcuts that bypass DOM key events? | **Option A:** Multi-layer defense: `keydown` + `keyup` listeners + modifier-correlated `blur` detection + clipboard wiping + visual blur. | Confirmed by user. Web standards cannot block OS kernels, so defense-in-depth maximizes detection and protects exam questions. |
| D-02 | How should Mobile enforce screenshot protection? | **`FLAG_SECURE` on Android + `addScreenshotListener` on iOS** via `expo-screen-capture`. | Confirmed by user. Uses native OS capabilities (`FLAG_SECURE`) to physically block screenshots on Android and reliably return `SCREENSHOT` on iOS. |
| D-03 | How should Mobile distinguish between Backgrounding, App Pinning, and Screenshots? | Dedicated `ScreenCapture.addScreenshotListener` emits `SCREENSHOT_ATTEMPT`; `AppState` background transitions check screenshot debounce ref. | Prevents transient screenshot HUDs/overlays from falsely logging app pinning violations. |

## Acceptance Criteria

| ID | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- |
| AC-01 | Windows `PrintScreen` and `Alt+PrintScreen` trigger screenshot telemetry and security lock | `screen-capture-shortcut.ts` & `use-keyboard-listener.ts` with `keyup` | Unit & browser event tests (57/57 passed) | Completed |
| AC-02 | macOS `Cmd+Shift+3/4/5` and Windows `Win+Shift+S` trigger screenshot telemetry and lock | Modifier ref tracking + `use-focus-listener.ts` heuristic | Focus listener tests (44/44 passed) | Completed |
| AC-03 | Web clipboard is sanitized on screenshot detection | `navigator.clipboard.writeText('')` in clipboard/keyboard listeners | Unit tests passed | Completed |
| AC-04 | Android exam sessions set `FLAG_SECURE` to block screenshots/recordings | `expo-screen-capture` `preventScreenCaptureAsync()` in `use-exam-session.ts` | Mobile tests (186/186 passed) | Completed |
| AC-05 | iOS screenshot attempts emit `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`) without `APP_PINNING_VIOLATION` | `ScreenCapture.addScreenshotListener` + `AppState` debounced filter | Mobile telemetry tests (186/186 passed) | Completed |

## Phases

- [x] `phase-01-web-shortcut-and-event-listeners.md` — Phase 1: Web Screen Capture Shortcut & Multi-Layer Event Listeners
- [x] `phase-02-web-blur-heuristics-clipboard-and-visual-defense.md` — Phase 2: Web Focus Loss Heuristics, Clipboard Cleansing & Visual Obscuration
- [x] `phase-03-mobile-expo-screen-capture-and-android-flag-secure.md` — Phase 3: Mobile `expo-screen-capture` Integration & Android `FLAG_SECURE` Blocking
- [x] `phase-04-mobile-ios-screenshot-listener-and-app-pinning-fix.md` — Phase 4: Mobile iOS Screenshot Listener & App Pinning Disambiguation
