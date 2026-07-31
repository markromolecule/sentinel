# Attempt Responsive Passage and Question Navigation — Implementation Plan

**Source:** User-reported attempt-page behavior with phone and desktop screenshots dated July 23–24, 2026  
**Status:** Ready for implementation  
**Delivery boundary:** Student exam attempt responsive UI, passage controls, question actions, and question navigator only  
**Related plan:** `docs/task/2026-07-23/fix-004-implementation-plan-attempt-mobile-accessibility-and-proctoring-resilience.md`  
**Migration required:** No — this work changes client-side layout and interaction behavior only

## Implementation Status — July 24, 2026

- [x] Implemented the focused student-attempt responsive changes in Phases 1–3.
- [x] Added focused runtime and compact-navigation regression tests.
- [x] Verified the focused attempt suite: 6 files and 22 tests passing.
- [x] Verified scoped lint and Prettier checks for all files changed by this task.
- [ ] Full Sentinel Web lint remains blocked by 317 pre-existing errors outside this file set.
- [ ] Full Sentinel Web tests remain blocked by existing failures in instructor reports, announcements, question-bank navigation/shell, and student classroom tests.
- [ ] Manual device validation at the documented phone, tablet, laptop, and monitor breakpoints remains pending; the available browser session redirects to sign-in and needs an authenticated passage-bearing attempt.

## Task Summary

Correct the student attempt page so passage access follows one reliable large-versus-compact responsive contract, mobile question actions remain horizontal, duplicate header counting is removed on phones, and the question navigator supports both direct selection and native horizontal touch scrolling.

## 1. The Context

The attempt page already contains the intended building blocks: a resizable passage panel at `xl`, a compact passage sheet below `xl`, a desktop question rail, and a compact question row. The reported behavior persists because passage availability and responsive controls are split across several components, the compact action layout intentionally stacks at the base breakpoint, and the mobile navigator relies on an implicit Radix scroll viewport rather than an explicit horizontal touch-scroll contract.

The implementation must preserve answers, flags, cross-out state, timer behavior, submission, security monitoring, desktop rail behavior, and passage state while changing only presentation and interaction boundaries. It must not introduce JavaScript viewport branching, a new dependency, API changes, or database work.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Modify only Tailwind classes in the current components: show/hide the existing passage controls at the correct breakpoints, make the action container a row, hide the phone header count, and add `overflow-x-auto` to the compact navigator.
- **Tradeoff:** Fastest to ship, but it leaves responsive behavior distributed across parent and child components and provides weak protection against another regression.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Preserve the current component architecture while making the responsive contract explicit in the owning components, deriving passage availability once in `AttemptView`, using native horizontal touch scrolling for compact navigation, retaining semantic question buttons, and adding focused component and attempt-page regression tests.
- **Tradeoff:** Requires several small coordinated edits and new test files, but keeps behavior localized without expanding the architecture.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Replace the separate desktop and mobile navigators and passage triggers with unified adaptive primitives driven by container queries, then migrate both the student attempt and instructor preview to those primitives.
- **Tradeoff:** Produces stronger long-term reuse but materially increases scope, regression risk, and validation cost for a focused attempt-page fix.

## 1. The Execution

**The Recommendation:** Option B — the Strategic Path.

**The Justification:** The current shell, sheet, and runtime components already model the required behavior, so replacing them would spend complexity without resolving a missing capability. A coordinated responsive-contract fix is the best structural fit: it keeps CSS as the source of truth, makes touch scrolling native, avoids new dependencies, and adds tests at the boundaries where this regression escaped.

**Next Steps:**

1. Lock the reported compact and desktop states in focused tests before changing responsive classes.
2. Update passage controls, compact action alignment, header count visibility, and mobile navigation within their existing owners.
3. Run focused Vitest and lint checks, then verify the phone, tablet, laptop, and monitor breakpoint matrix.

## Confirmed Baseline

- `AttemptView` derives `hasPassage` from the rendered current-question passage body and passes both passage state handlers to `ExamAttemptRuntimeHeader`.
- `ExamAttemptRuntimeHeader` renders a compact passage-sheet trigger below `xl` and a desktop panel toggle at `xl` and above, but the behavior lacks focused regression coverage.
- `ExamAttemptWorkspace` renders only the question pane below `xl` and a resizable passage/question layout at `xl` and above.
- `ExamAttemptRuntimeQuestion` uses a base `flex-col` action container and changes to a row only at `sm`, which explains the vertically stacked controls in the phone screenshot.
- The question count is rendered in both the attempt header status and the footer at every breakpoint.
- `ExamAttemptMobileQuestionNavigation` wraps the question row in `ScrollArea`, whose shared implementation mounts a vertical scrollbar by default and does not explicitly declare horizontal touch behavior.
- `ExamAttemptRuntimeNavigation` already renders each question number as a semantic `button` with an accessible label and click handler.
- `ExamAttemptDesktopQuestionNavigationRail` has intentional pointer-drag vertical scrolling through `useQuestionNavigationDragScroll`; that behavior must remain unchanged.
- The instructor preview reuses the shared shell and navigation containers but owns separate toolbar and passage markup. Preview-specific passage-toolbar parity is outside this focused delivery boundary.

## Responsive Contract

- Below `lg` (`1024px`), render the compact horizontal question navigator; at `lg` and above, retain the vertical desktop rail.
- Below `xl` (`1280px`), keep passage content out of the main workspace and expose it through the existing compact sheet trigger.
- At `xl` and above, retain the resizable inline passage panel and desktop show/hide toggle.
- Hide the header `Question X of Y` badge below `sm` (`640px`); keep the footer count visible at every size.
- Keep “Mark for review” and “Enable cross-out” in one horizontal two-column row below `sm`, with touch targets at least `44px` high and no page-level horizontal overflow.
- Use native horizontal overflow and `touch-action: pan-x` for compact question navigation. Tapping a stationary question button selects it; swiping the row scrolls it.

## Scope and Affected Files

### Student attempt composition

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx`

### Shared attempt runtime

- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-workspace.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-mobile-question-navigation.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-desktop-question-navigation-rail.tsx` (regression validation only)
- `app/sentinel-web/src/features/exams/_components/engine/attempt/use-question-navigation-drag-scroll.ts` (regression validation only)
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-header.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-question.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-navigation.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-footer.tsx` (regression validation only)

### Tests

- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-workspace.test.tsx`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-mobile-question-navigation.test.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-header.test.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-question.test.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-navigation.test.tsx` **[NEW]**

### Services and database tables

- No service, controller, API route, Prisma model, or database table is touched.

## Phase 0: Lock the Reported Responsive Regressions

**Goal:** Convert the screenshots and requested behaviors into focused failing assertions before changing the layout.

- [x] Add a header test in `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-header.test.tsx` that renders passage and no-passage states and asserts that only the correct compact (`xl:hidden`) and desktop (`hidden xl:block`) passage controls exist.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` so its `ExamAttemptShell` mock exposes the status class name and verifies the `Question X of Y` badge carries the phone-hidden breakpoint contract while the footer remains rendered.
- [x] Add a question-action test in `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-question.test.tsx` that asserts both action buttons share one compact horizontal container and remain independently clickable.
- [x] Add a mobile-navigation test in `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-mobile-question-navigation.test.tsx` that asserts an explicit horizontal overflow region, horizontal touch panning, and a max-content inner row.
- [x] Add a runtime-navigation test in `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-navigation.test.tsx` that clicks the first, middle, and last question buttons and verifies the exact selected indexes.

**Migration required:** No — tests cover existing client-rendered behavior.

### Phase 0 Verification

- [x] Run the five focused Vitest files and confirm the new assertions cover the reported responsive gaps.
- [ ] Record any mismatch between the supplied screenshots and the current branch in the test names or comments without encoding viewport detection in production JavaScript.

## Phase 1: Restore the Passage Visibility Contract

**Goal:** Make passage access consistently visible when the current question has content while keeping the passage inline only on large screens.

- [x] Keep `hasPassage` as the single non-empty-body decision in `AttemptView()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`; pass it unchanged to the sheet, header, and desktop panel so those branches cannot disagree.
- [x] Update `ExamAttemptRuntimeHeader()` in `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-header.tsx` so the compact trigger is visibly labeled and rendered below `xl`, and the desktop hide/show control remains rendered at `xl` and above.
- [x] Preserve the existing `onToggleCompactPassage` and `onTogglePassagePanel` callbacks so compact sheet state and desktop panel preference remain independent.
- [x] Preserve `ExamAttemptWorkspace()` in `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-workspace.tsx` as question-only below `xl` and resizable at `xl`; do not mount passage content inline at compact sizes.
- [x] Ensure a hidden desktop panel still leaves the question pane at full width and that selecting another question does not reset the desktop visibility preference.
- [x] Extend `exam-attempt-runtime-header.test.tsx` and `exam-attempt-workspace.test.tsx` to cover non-empty passage, empty passage, desktop visible, desktop hidden, and compact trigger visibility contracts.
- [x] Extend `page.test.tsx` to verify changing questions closes the compact sheet but preserves the desktop passage-panel preference.

**Migration required:** No — passage content and state already exist in the client attempt model.

### Phase 1 Verification

- [x] Run the focused header, workspace, passage-sheet, attempt-page, and `use-student-exam-attempt` Vitest files.
- [ ] At `375px`, `768px`, and `1024px`, confirm passage content is absent from the main pane and opens through the passage sheet.
- [ ] At `1280px`, `1440px`, and `1920px`, confirm the passage opens inline, is resizable, and can be hidden and restored.

## Phase 2: Correct Compact Header and Question Actions

**Goal:** Remove redundant phone metadata and keep both question-level actions aligned horizontally without sacrificing touch accessibility.

- [x] Add the phone-hidden visibility class to the `Question X of Y` status `Badge` in `AttemptView()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`, while leaving development-only MediaPipe and audio badges unaffected.
- [x] Keep `ExamAttemptRuntimeFooter()` in `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-footer.tsx` as the always-rendered question-count source; do not add a second mobile-only counter.
- [x] Replace the base stacked action wrapper in `ExamAttemptRuntimeQuestion()` in `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-question.tsx` with a two-column compact grid or equivalent non-wrapping row that becomes content-sized at larger breakpoints.
- [x] Give both action buttons `min-w-0`, at least `44px` height, centered compact alignment, and label wrapping/truncation rules that do not create horizontal page overflow at `320px`.
- [x] Preserve existing flag styling, `crossOutEnabled` variant selection, icons, click handlers, and button semantics.
- [x] Extend `page.test.tsx` to assert the header count visibility class and the continued presence of the footer count.
- [x] Extend `exam-attempt-runtime-question.test.tsx` to verify horizontal compact layout, minimum target height, flag toggling, cross-out toggling, and active-state copy.

**Migration required:** No — this phase changes markup classes and existing client state only.

### Phase 2 Verification

- [x] Run the focused attempt-page, runtime-question, runtime-footer, and question-renderer Vitest files.
- [ ] At `320px`, `375px`, and `430px`, verify both actions remain in one row, neither button overlaps question content, and the page has no horizontal overflow.
- [ ] Confirm `Question X of Y` is absent from the phone header but remains visible in the footer and reappears in the header at `sm` and above.

## Phase 3: Make Question Navigation Explicitly Tap- and Swipe-Friendly

**Goal:** Ensure compact question navigation supports reliable direct selection and native left/right touch scrolling while preserving desktop rail scrolling.

- [x] Replace the implicit compact `ScrollArea` contract in `ExamAttemptMobileQuestionNavigation()` in `app/sentinel-web/src/features/exams/_components/engine/attempt/exam-attempt-mobile-question-navigation.tsx` with an explicit native horizontal scroll container using `overflow-x-auto`, `overflow-y-hidden`, `overscroll-x-contain`, hidden visual scrollbars, and `touch-pan-x`.
- [x] Give the compact navigator an accessible label such as `Question navigation` and preserve keyboard focus traversal through every question button.
- [x] Set the inner question row to `w-max min-w-full` so non-shrinking buttons create real horizontal overflow when the question count exceeds the viewport.
- [x] Retain the `button` elements, `type="button"`, click handlers, `aria-current`, accessible question labels, answered marker, and flagged marker in `ExamAttemptRuntimeNavigation()` in `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-navigation.tsx`.
- [x] Keep each compact question target at least `48px` square and ensure markers do not intercept pointer input.
- [x] Do not attach the desktop drag-scroll hook to the compact row; native touch scrolling must own the swipe gesture so a stationary tap still activates the underlying button.
- [x] Preserve `ExamAttemptDesktopQuestionNavigationRail()` and `useQuestionNavigationDragScroll()` behavior for vertical mouse/pointer dragging at `lg` and above.
- [x] Extend `exam-attempt-mobile-question-navigation.test.tsx` to assert horizontal overflow, touch-action, accessible region labeling, and inner-row sizing.
- [x] Extend `exam-attempt-runtime-navigation.test.tsx` to verify semantic button roles, active/answered/flagged state, target sizing, and exact question selection.

**Migration required:** No — navigation remains local client interaction.

### Phase 3 Verification

- [x] Run the focused compact-navigation, runtime-navigation, workspace, and attempt-page Vitest files.
- [ ] On touch emulation and at least one real touch device, swipe a navigator with more questions than fit on screen, then tap first, middle, and last visible buttons and confirm the correct question opens.
- [ ] At `lg` and above, mouse-wheel and pointer-drag the desktop rail and confirm question-button clicks are still suppressed only after an actual drag.

## Phase 4: Integrated Responsive Validation

**Goal:** Prove the complete attempt remains stable across supported breakpoints and interaction modes.

- [x] Run `pnpm --dir app/sentinel-web test --run` and record any unrelated pre-existing failures separately from this file set.
- [x] Run `pnpm --dir app/sentinel-web lint` and resolve only issues introduced by the implementation.
- [x] Run `pnpm --dir app/sentinel-web format:check` if the workspace exposes the command; otherwise run the repository-level `pnpm format:check`.
- [ ] Test a question with a passage and a question without a passage at `375–430px`, `768–1024px`, `1280–1440px`, and `1920px+`.
- [ ] Verify answering, flagging, enabling cross-out, crossing out an option, changing questions, opening/closing passage, using Previous/Next, and opening Turn In do not reset unrelated state.
- [ ] Verify keyboard-only navigation reaches the passage trigger, question-number buttons, review control, cross-out control, answer controls, and footer actions in a logical order.
- [x] Add or update `page.test.tsx` with one integrated regression case covering passage availability, question selection, flag/cross-out state, and footer count after navigation.

**Migration required:** No — final validation covers frontend behavior only.

### Phase 4 Verification

- [x] Confirm the focused tests, full web test suite, lint, and formatting checks pass or have explicitly documented unrelated failures.
- [ ] Capture updated phone and desktop screenshots showing the compact action row, footer-owned phone count, swipeable navigator, compact passage trigger, and large-screen inline passage.

## Done Criteria

- [ ] A question with non-empty passage content always exposes exactly one usable passage control for the active breakpoint.
- [ ] Below `xl`, passage content is hidden from the workspace and opens in the compact sheet.
- [ ] At `xl` and above, passage content uses the existing resizable inline panel and desktop toggle.
- [ ] “Mark for review” and “Enable cross-out” remain horizontally aligned at `320px` and above without page overflow.
- [ ] The phone header does not render a visible `Question X of Y` badge, while the footer continues to show the count.
- [ ] Every question number remains a pressable semantic button with correct active, answered, and flagged states.
- [ ] Compact navigation scrolls left and right with touch and trackpad input, and a stationary tap selects the intended question.
- [ ] Desktop rail scrolling and drag suppression continue to work.
- [ ] Passage, answer, flag, cross-out, timer, submission, and monitoring state are preserved during navigation.
- [ ] Each implementation phase has passing focused tests and an explicit no-migration decision.

## Additional Considerations

- **Breaking API changes:** None.
- **New environment variables:** None.
- **Database migration:** None; no rollback migration is needed.
- **Dependencies:** Do not add a gesture, carousel, breakpoint, or scrolling dependency.
- **Accessibility:** Preserve semantic buttons, visible focus states, `aria-current`, accessible labels, and minimum touch-target sizing.
- **Security and monitoring:** Do not change MediaPipe, audio monitoring, telemetry, fullscreen enforcement, or turn-in behavior.
- **Instructor preview:** Shared shell/navigation improvements will apply automatically where reused. Preview-specific passage controls remain out of scope and should be handled in a separate parity task if required.
- **Rollback:** Revert the responsive class and compact navigation container changes; no persisted data or schema rollback is involved.
