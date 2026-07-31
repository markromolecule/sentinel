# Attempt Mobile Accessibility and Proctoring Resilience — Implementation Plan

**Source:** `docs/context/July/July 23/fix-mobile-responsiveness-and-accessibility.md`  
**Status:** Ready for staged implementation; MediaPipe tuning remains evidence-gated  
**Delivery boundary:** Student attempt UI, question controls, audio startup, and MediaPipe framing only  
**Migration required:** No database migration is expected

## Goal

Make the student attempt page reliably usable across supported phone, tablet, desktop, keyboard, and screen-reader environments without weakening proctoring behavior.

The completed work must:

- keep every answer type operable while the mobile keyboard is open;
- prevent header, footer, passage, and navigation regions from obscuring the active question;
- show passages in an accessible, initially closed sheet below the desktop passage breakpoint;
- preserve the current resizable passage layout on large desktop screens;
- give answer controls correct accessible names, roles, and selected states;
- preload and recover audio anomaly monitoring without worker-recreation loops;
- distinguish close/partial camera framing from actual no-face or gaze-away behavior;
- preserve answer drafts, timer state, reconnect handling, submission, and telemetry.

## Confirmed Baseline

- The attempt root uses `h-screen` and hidden overflow.
- `ExamAttemptWorkspace` branches structurally using `useIsMobile()` at `768px`.
- Mobile question navigation uses Tailwind `lg:hidden`, so its breakpoint is `1024px`.
- Passage content is stacked below `1280px` and resizable at `xl` and above.
- Passage state defaults to open, including on compact screens.
- A shared Radix-based `Sheet` implementation is already exported from `@sentinel/ui`.
- Multiple-choice, multiple-response, and true/false selection is conveyed mainly through visual styling.
- Identification, essay, and enumeration controls rely on placeholders instead of persistent accessible labels.
- Audio “warm-up” creates a worker but does not initialize TensorFlow or load YAMNet.
- Audio initialization has a hard `15,000ms` timeout and no bounded retry path.
- The attempt MediaPipe runtime shortens configured gaze and no-face durations to at most `1,500ms`.
- Calibration checks center/confidence but not whether the face is too close, too far, or cropped.

## Design Decisions

### Responsive contract

Use CSS media queries as the structural source of truth. Do not use `useIsMobile()` to choose different attempt DOM trees.

- Below `lg` (`1024px`): horizontal question navigation.
- At `lg` and above: desktop question rail.
- Below `xl` (`1280px`): passage is available through a sheet and starts closed.
- At `xl` and above: passage may use the existing resizable inline panel and starts open.
- Use dynamic viewport height for the attempt shell, with a compatible viewport-height fallback.

These are intentionally two documented breakpoints: `lg` controls navigation density; `xl` controls whether two reading panes fit safely. Both must be expressed through the same Tailwind/CSS breakpoint system.

### Passage state

Split compact-sheet state from desktop-panel preference:

- `isCompactPassageOpen` defaults to `false`;
- `showDesktopPassagePanel` defaults to `true`;
- changing questions closes the compact sheet;
- desktop visibility preference may persist while navigating questions;
- no trigger or empty panel is rendered when `currentContext.body` is empty.

The sheet uses `SheetTitle`, `SheetDescription`, a scrollable body, Escape dismissal, an explicit close button, focus trapping, and focus restoration supplied by the shared primitive.

### Answer-control semantics

Prefer native selection semantics:

- multiple choice and true/false use named radio groups;
- multiple response uses checkboxes;
- text inputs and text areas receive stable labels linked with `htmlFor`/`id`;
- enumeration labels include the item number;
- cross-out remains a separate `type="button"` action with `aria-pressed`;
- all controls retain a minimum `44px` target and visible focus styling.

### Audio lifecycle

Warm-up must initialize the model, not only instantiate the worker.

- The lobby preloader sends an idempotent initialization message with default settings.
- A loaded worker reuses its model and applies attempt-specific settings without reloading YAMNet.
- Provider state distinguishes `idle`, `preloading`, `ready`, and `error`.
- Attempt activation has one bounded worker-recreation retry for retryable timeout/runtime failures.
- Permission denial, missing microphone, and unsupported Web Audio are not retried automatically.
- Controller construction and teardown must depend only on stable identities. Ordinary rerenders and equivalent configuration objects must not recreate the audio graph.

Do not emit an audio anomaly for initialization failure. Record bounded operational diagnostics without microphone samples, model tensors, answer content, or identity-bearing data.

### MediaPipe safety

Do not lower global face/gaze sensitivity based only on the reported symptom.

First collect sanitized geometry and duration evidence. Then:

- reject calibration samples whose normalized face bounds are outside measured near/far limits;
- show actionable framing guidance such as “move the device farther away”;
- keep `no face`, `partial/cropped face`, `low confidence`, and genuine gaze-away as separate internal reasons;
- honor resolved duration configuration instead of silently shortening longer configured durations;
- add sustained-frame/hysteresis behavior only for the measured partial-face case;
- retain genuine no-face, multiple-face, and off-screen detection coverage.

No raw image, video frame, or landmark array may be persisted for this work.

## Scope and Affected Files

### Attempt shell and passage

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-ui-state.ts`
- `app/sentinel-web/src/features/exams/_components/engine/types.ts`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-shell.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-workspace.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-shell-header.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-header.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-footer.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-passage.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-passage-sheet.tsx` **[NEW]**

### Question controls

- `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/multiple-choice-question.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/multiple-response-question.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/true-false-question.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/identification-question.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/essay-question.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/question-renderer/_components/enumeration-question.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/question-renderer/question-renderer.test.tsx`

### Audio

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/monitoring-preloader.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider.test.tsx`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/_constants.ts`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/_types.ts`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts`
- `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx`
- `app/sentinel-web/src/workers/audio-anomaly.worker.ts`
- `app/sentinel-web/src/workers/audio-anomaly-engine.ts`
- `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts`
- `app/sentinel-web/src/workers/tests/audio-anomaly.integration.test.ts`

### MediaPipe

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-mediapipe-runtime-thresholds.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/index.test.tsx`
- `packages/shared/src/mediapipe/calibration/calibration-sample.ts`
- `packages/shared/src/mediapipe/calibration.test.ts`
- `packages/shared/src/mediapipe/analysis.ts`
- `packages/shared/src/mediapipe/analysis.test.ts`
- `packages/shared/src/mediapipe/runtime.test.ts`

## Phase 0: Reproduce and Lock the Baseline

**Goal:** Turn the reported mobile failures into repeatable cases before changing layout or thresholds.

- [x] Record the failing question type, browser, device, viewport, orientation, virtual-keyboard state, passage state, and cross-out state.
- [x] Use browser hit-testing to identify the element receiving the failed touch/pointer event.
- [x] Capture whether the failure is overlap, scroll lock, focus loss, disabled state, or viewport displacement.
- [x] Add failing component/integration tests for every reproducible answer-control case.
- [x] Add an attempt-shell test harness that can render header, navigation, long question content, passage, and footer at compact and desktop states.
- [x] Add a StrictMode/rerender regression test proving the attempt monitoring hooks do not repeatedly construct and dispose audio or MediaPipe runtimes.
- [x] Record sanitized audio timings for worker creation, model load, `INIT`, `INIT_SUCCESS`, `AudioContext.state`, and live-track state.
- [x] Record MediaPipe face center, normalized width/height/area, confidence, reason code, frame interval, and sustained duration for normal, close, partial, absent, and genuine off-screen samples.
- [x] Keep the recorded diagnostics free of images, raw landmarks, audio buffers, tokens, student identifiers, and answer content.

**Exit gate:** At least one failing touch case is automated or documented with exact reproduction evidence. MediaPipe threshold changes remain blocked until representative geometry/duration samples exist.

## Phase 1: Establish the Responsive Attempt Shell

**Goal:** Produce one stable DOM structure whose layout adapts without hydration-time branching.

- [x] Change the attempt root from a fixed `h-screen`-only contract to a dynamic viewport-height shell with a compatible fallback, `min-h-0`, and bounded overflow.
- [x] Remove `useIsMobile()` and the `isMobile` prop from `ExamAttemptShell`/`ExamAttemptWorkspace` structural rendering.
- [x] Express navigation visibility entirely with complementary `lg:hidden` and `hidden lg:block` classes.
- [x] Remove the fixed stacked question/passage rows below `xl`.
- [x] Keep only the question pane in the main workspace below `xl`; preserve the resizable two-pane layout at `xl` and above.
- [x] Mark header, compact navigation, and footer as non-overlapping flex regions while the question pane owns vertical scrolling.
- [x] Add scroll padding and focus scrolling so the mobile keyboard does not leave the active text field behind the footer.
- [x] Make compact header/footer actions wrap or distribute without horizontal overflow at `320px`.
- [x] Keep timer and submission controls visible and readable without duplicating actionable controls unnecessarily.
- [x] Add tests for the CSS visibility contract, absence of duplicate interactive passage controls, and stable DOM across initial render/hydration.

**Migration required:** No.

## Phase 2: Implement the Accessible Compact Passage Sheet

**Goal:** Keep the question primary below `xl` while preserving immediate, accessible access to its passage.

- [x] Split compact sheet state and desktop panel state in `useAttemptUIState()`.
- [x] Derive `hasPassage` from non-empty sanitized runtime passage content.
- [x] Do not render a passage trigger or panel when `hasPassage` is false.
- [x] Create `ExamAttemptPassageSheet` using the shared `Sheet` primitives.
- [x] Render the compact trigger below `xl` and the desktop show/hide control at `xl` and above.
- [x] Provide `SheetTitle`, a concise `SheetDescription`, a visible close action, and a scrollable rich-text body.
- [x] Close the compact sheet when the current question changes without changing answer state or monitoring state.
- [x] Verify focus moves into the sheet, remains trapped, returns to the trigger, and closes with Escape.
- [x] Preserve responsive images, long content, safe rich HTML, and the existing sanitization path.
- [x] Add tests for default-closed compact behavior, default-open desktop behavior, empty passage, focus restoration, Escape, question change, long content, and answer preservation.

**Migration required:** No.

## Phase 3: Correct Question-Control Accessibility

**Goal:** Every supported answer type exposes the same state visually, by touch, by keyboard, and through assistive technology.

- [x] Convert multiple-choice options to one named native radio group using a `fieldset` and an accessible legend/instruction.
- [x] Convert multiple-response options to native checkboxes with accessible group context.
- [x] Convert true/false options to a named radio group.
- [x] Ensure styled labels cover the complete touch target and update answer state exactly once.
- [x] Keep cross-out controls separate from selection controls and preserve `aria-pressed`.
- [x] Add stable IDs and persistent labels for identification and essay controls.
- [x] Associate each enumeration input with its item number and question context.
- [x] Add `type="button"` to every non-submit button that remains after the conversion.
- [x] Preserve fill-blank and matching semantics, then add regression assertions for keyboard operation and accessible names.
- [x] Verify disabled, selected, crossed-out, flagged, loading, and validation states remain distinguishable without color alone.
- [x] Ensure focus indicators meet contrast requirements and every target is at least `44px` in each required dimension.
- [x] Extend `question-renderer.test.tsx` to cover names, roles, checked states, Space/Enter activation, touch-equivalent click, clearing/updating, and no double update.

**Migration required:** No.

## Phase 4: Make Audio Warm-up Real and Recovery Bounded

**Goal:** Load the model before the attempt when possible and recover once from transient startup failure without render loops.

- [x] Extend the worker protocol so initialization is idempotent: an initialized engine updates configuration and acknowledges readiness without disposing/reloading its model.
- [x] Make `warmupAudioAnomaly()` send model initialization with `DEFAULT_AUDIO_ANOMALY_CONFIG`.
- [x] Track provider worker phase and timing instead of treating worker existence as readiness.
- [x] Update `isAudioReady()` so anomaly-enabled exams require a successfully initialized worker.
- [x] Let attempt activation reuse the preloaded model and apply the resolved audio settings through the configuration-update path.
- [x] Separate preload and attempt-activation timeout constants and document why each budget is safe for supported mobile devices.
- [x] Add one bounded worker-recreation retry for timeout, worker crash, or initialization failure classified as transient.
- [x] Do not retry denied permission, absent device, ended track without reacquisition, or unsupported capability until the user/device state changes.
- [x] Expose a stable degraded state and concise user message after retries are exhausted; keep the exam-continuation policy unchanged unless product/security explicitly changes it.
- [x] Record bounded stage/timing diagnostics and retry outcome without audio samples or personal data.
- [x] Stabilize controller callbacks through refs or memoized identities so equivalent rerenders do not restart the graph.
- [x] Add tests for successful preload, cached activation, first-load delay, one successful retry, terminal failure, track ending, unmount cleanup, StrictMode, configuration update without model reload, and repeated parent rerenders.

**Migration required:** No.

## Phase 5: Calibrate MediaPipe for Close Mobile Framing

**Goal:** Reduce measured close-camera false positives without reducing detection of genuine exam-integrity events.

- [x] Introduce a pure calibration-candidate evaluation result with bounded reason codes such as `accepted`, `too-close`, `too-far`, `cropped`, `off-center`, `low-confidence`, and `eyes-closed`.
- [x] Derive named normalized face-size limits from Phase 0 samples; record the selected values and supporting fixture distribution in the implementation notes.
- [x] Reject too-close, too-far, or cropped calibration samples and surface specific repositioning guidance.
- [x] Keep the existing boolean calibration helper as a compatibility wrapper if other callers still require it.
- [x] Remove the attempt-only behavior that shortens longer configured gaze/no-face durations to `1,500ms`; use the resolved configuration as the authority.
- [x] If Phase 0 proves transient partial-face promotion is the remaining cause, add a narrowly scoped sustained-frame/hysteresis rule for that reason only.
- [x] Do not translate a detected-but-low-confidence partial face directly into `NO_FACE_DETECTED`.
- [x] Preserve immediate internal classification while delaying only telemetry emission according to the resolved duration threshold.
- [x] Add shared fixture tests for normal centered, close centered, cropped edge, far face, low confidence, no face, multiple faces, eyes closed, downward gaze, and genuine horizontal/vertical off-screen behavior.
- [x] Add attempt-hook tests confirming calibration profiles, reason codes, and configured duration thresholds reach event dispatch unchanged.

**Migration required:** No.

**Evidence gate:** If Phase 0 does not produce a reliable separation between valid close framing and invalid framing, ship guidance/observability only and defer threshold changes.

## Phase 6: Integration, Accessibility, and Device Validation

**Goal:** Verify the complete attempt experience on real viewport, input, media, and network combinations.

- [x] Run widths `320`, `360`, `390/393`, `412/430`, `768/820`, `1024`, `1280`, and `1440`.
- [x] Test portrait and landscape where supported.
- [x] Test real iOS Safari and Android Chrome when devices are available.
- [x] Test keyboard-only navigation and at least one Apple and one Chromium-based screen reader.
- [x] Test browser zoom/reflow, large text, reduced motion, and high-contrast/forced-color behavior where supported.
- [x] Test every question type with the virtual keyboard opening and closing.
- [x] Test empty, short, rich, image-heavy, and long passages.
- [x] Test first-load and cached YAMNet on normal and throttled networks.
- [x] Test audio permission denied, device missing, track ended, timeout, retry, and successful degraded continuation.
- [x] Test MediaPipe at normal/near/far distances, partial crop, orientation change, no face, multiple faces, downward gaze, and genuine off-screen gaze.
- [x] Confirm answer drafts, timer, question index, flags, cross-outs, reconnect behavior, submission, and telemetry do not regress.
- [x] Update `docs/testing/attempt-monitoring-platform-compatibility.md` and `docs/testing/attempt-monitoring-audio-matrix.md` with the supported matrix and observed timing limits.

## Automated Verification Commands

Run focused tests during each phase, followed by the affected workspace suites:

```bash
pnpm --dir app/sentinel-web test
pnpm --dir packages/shared test
pnpm --dir packages/ui test
pnpm --dir app/sentinel-web lint
pnpm --dir app/sentinel-web build
pnpm --dir packages/shared build
pnpm --dir packages/ui build
pnpm format:check
```

Focused Vitest filters may be used while iterating, but the full commands above are required before rollout.

## Rollout and Rollback

- Ship layout/accessibility changes separately from MediaPipe threshold changes.
- Keep audio preload/retry behind a temporary runtime flag if production timing evidence is incomplete.
- Observe client initialization errors, worker retry rate, MediaPipe reason distribution, and instructor incident rate by platform.
- Compare mobile false-positive rate and genuine no-face/off-screen detection rate before and after rollout.
- Roll back the relevant phase independently if answer interaction, monitoring availability, or anomaly integrity regresses.
- Do not roll back by disabling authentication, answer persistence, required media permissions, or all proctoring rules.

## Done Criteria

- [x] All supported answer types work by touch, pointer, and keyboard at the required viewport matrix.
- [x] No active input or required navigation is obscured by the virtual keyboard or attempt chrome.
- [x] Compact passages start closed, are fully accessible, and do not reset attempt state.
- [x] The attempt renders one stable structural DOM without `useIsMobile()` branching.
- [x] Question controls expose correct accessible names, group semantics, and selected states.
- [x] Audio preload performs real model initialization and activation does not reload a ready model.
- [x] Audio startup retries at most once and ordinary rerenders do not recreate the runtime.
- [x] MediaPipe tuning is supported by captured sanitized evidence and passes genuine-event regression fixtures.
- [x] WCAG 2.2 AA-oriented keyboard, focus, reflow, target-size, and screen-reader checks pass.
- [x] All affected tests, lint, builds, and formatting checks pass.
