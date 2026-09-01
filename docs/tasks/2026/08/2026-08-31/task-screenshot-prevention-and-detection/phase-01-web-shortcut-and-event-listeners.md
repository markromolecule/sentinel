---
title: "Phase 1: Web Screen Capture Shortcut & Multi-Layer Event Listeners"
type: phase
parent: "docs/tasks/2026/08/2026-08-31/task-screenshot-prevention-and-detection/README.md"
phase: "01"
status: completed
created: "2026-08-31"
tags: [task, phase, web, proctoring, telemetry, keyboard]
---

# Phase 1: Web Screen Capture Shortcut & Multi-Layer Event Listeners

## Objective

Enhance the screen capture shortcut detection in `sentinel-web` and `sentinel-core` to intercept desktop screenshot shortcuts across both `keydown` and `keyup` DOM events on `document` and `window`, supporting `PrintScreen`, `Alt+PrintScreen`, `Ctrl+PrintScreen`, macOS `Cmd+Shift+3/4/5`, and Windows `Win+Shift+S`.

## Dependencies & Prerequisites

- Context specification: `docs/context/August/31/screenshot-detection-and-prevention.md` (ready)
- ADR: `docs/decisions/2026-08-31-screenshot-detection-and-prevention.md`

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/screen-capture-shortcut.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/screen-capture-shortcut.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners/use-keyboard-listener.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts`

## Implementation Tasks

- [x] Task 1: Update `screen-capture-shortcut.ts` to fully normalize keys, codes, and modifier combinations:
  - Add explicit detection for `PrintScreen` (with or without `altKey` / `ctrlKey` / `shiftKey`, and `'Snapshot'`).
  - Add explicit detection for macOS capture keys (`metaKey && shiftKey` with `'3'`, `'4'`, `'5'`, `'#'`, `'$'`, `'%'`, `'Digit3'`, `'Digit4'`, `'Digit5'`, `'Numpad3'`, `'Numpad4'`, `'Numpad5'`).
  - Add explicit detection for Windows Snipping Tool (`metaKey && shiftKey` with `'s'`, `'S'`, `'KeyS'`).
- [x] Task 2: Update `use-keyboard-listener.ts` and `use-interaction-listeners.ts`:
  - Attach listeners to both `keydown` AND `keyup` on `window` and `document` using capture phase.
  - Maintain a rolling ref of recent capture-related modifier activity (`lastCaptureModifierAtRef`).
  - Call `event.preventDefault()` when a screenshot shortcut is detected.
  - Emit `PRINT_SCREEN_ATTEMPT` telemetry event and invoke `lockExam('screen-capture')`.
  - Purge system clipboard if supported.
- [x] Task 3: Update and expand unit tests in `screen-capture-shortcut.test.ts` and `use-exam-monitoring.test.ts`.

## Verification & Testing

- `npm run test -- src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/screen-capture-shortcut.test.ts src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` in `app/sentinel-web` (PASS: 2/2 test files, 57/57 tests).
- `npm run test -- src/app/(protected)/student/exam/[id]` in `app/sentinel-web` (PASS: 50/50 test files, 328/328 tests).
- Verified: `PrintScreen` on `keyup`, `Alt+PrintScreen`, `Cmd+Shift+4`, and `Win+Shift+S` are intercepted and trigger `PRINT_SCREEN_ATTEMPT` and `'screen-capture'` lock.

## Risks & Rollback

- Low risk: Normal alphanumeric typing and single modifier keys continue functioning without false positives.

