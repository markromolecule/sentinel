---
title: "Fix Mobile Exam Question Rendering, Route Layout Conflicts, Result Screen Crash, and Feedback Flow"
type: task
status: planned
created: "2026-08-25"
tags: [task, mobile, exam-session, layout, question-rendering, livekit, result-screen, feedback]
---

# Fix Mobile Exam Question Rendering, Route Layout Conflicts, Result Screen Crash, and Feedback Flow

## Outcome

Fix critical UI rendering, layout routing, result calculation, and navigation bugs in Sentinel Mobile:
1. Ensure exam questions and interactive answer choices render with proper vertical scrolling height by setting explicit `style={{ flex: 1 }}` on the session screen container and `QuestionCard` `ScrollView`.
2. Replace premature "Exam not found" flashes on session entry with a clean loading spinner while `useExamQuery` resolves.
3. Eliminate Expo Router `No route named "session/[sessionId]/index" exists` layout warnings by removing the redundant nested `session/[sessionId]/_layout.tsx`.
4. Suppress false-alarm `WARN Live inspection directive reconciliation failed: [ApiError: Live inspection is not available.]` logs by treating 404 directive queries as normal `idle` state.
5. Fix the `TypeError: questions.map is not a function` crash on `ResultView` caused by `exam.questions` evaluating to a number (`questionCount`) instead of an array.
6. Guarantee that students can review their scores on the Result Screen and proceed smoothly into the post-exam feedback and rating screen upon clicking Turn In.

---

## Pre-planning record

### Actors and goals
- **Student (Mobile)**: Takes exam on mobile, sees questions and choices immediately, submits answers, views results without crashes, and rates the exam experience on the feedback screen.
- **Proctor / Instructor (Web)**: Monitors exams, initiates live video spot-checks without seeing client warning floods or broken state transitions.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-1 | Student enters exam session from lobby | Session admitted | Shows loading indicator, then renders question 1 prompt & choices with scrollability | Show "Exam not found" only if permanent query error | Planned |
| SC-2 | Student opens session in Expo Router | App navigating | Route resolves cleanly with zero layout routing warnings | N/A | Planned |
| SC-3 | Mobile live inspection bridge initializes on mount | Camera active, no proctor inspecting | Quietly stays in `idle` state without emitting 404 console warnings | Reconcile on Realtime broadcast when proctor connects | Planned |
| SC-4 | Student finishes and submits exam | Attempt complete | Navigates to `/exam/[id]/result`, displays score breakdown without `questions.map` crash | Fallback to empty breakdown if questions missing | Planned |
| SC-5 | Student clicks "Turn In" on result screen | Result viewed | Transitions to `/exam/[id]/feedback` with `attemptId` param | Direct fallback to feedback if preview already cleared | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-1 | Flex height on React Native ScrollView | Explicit `style={{ flex: 1 }}` on container and `ScrollView` | NativeWind `className="flex-1"` does not reliably set flex height on React Native `ScrollView` between fixed header and absolute footer | Fixed pixel heights | `phase-01` |
| DEC-2 | Session route hierarchy | Delete nested `session/[sessionId]/_layout.tsx` | Flattening route structure matches all other sub-screens (`lobby`, `instruction`, `result`) and eliminates nested Stack conflict | Rename parent stack screen | `phase-02` |
| DEC-3 | Result screen question source | Pass `rawExam?.questions` array to `buildExamAttemptQuestionReports` | `adaptExamForMobile` intentionally maps `exam.questions` to a `number` for list displays | Mutating `MobileExamDisplay` schema | `phase-04` |

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-1 | SC-1 / DEC-1 | Questions and option choices render with full vertical scrollability | `exam-session-screen.tsx`, `question-card.tsx` | Vitest unit tests | Planned |
| AC-2 | SC-1 | Loading indicator shown while exam resolves; no flash of "Exam not found" | `exam-session-screen.tsx`, `use-exam-session.ts` | Vitest unit tests | Planned |
| AC-3 | SC-2 / DEC-2 | Expo Router navigates to session route with zero layout warnings | `app/exam/[id]/session/[sessionId]/_layout.tsx` | Route structure check | Planned |
| AC-4 | SC-3 | 404 directive responses treated quietly as idle without `console.warn` | `mobile-live-inspection-bridge.tsx` | Vitest unit tests | Planned |
| AC-5 | SC-4 / DEC-3 | Result screen computes reports without `questions.map` crash | `result-view.tsx`, `use-exam-result.ts` | Vitest unit tests | Planned |
| AC-6 | SC-5 | Turn In button on Result Screen navigates to `/exam/[id]/feedback` | `use-exam-result.ts`, `result/index.tsx` | Vitest unit tests | Planned |
| AC-1 | SC-1 / DEC-1 | Questions and option choices render with full vertical scrollability | `exam-session-screen.tsx`, `question-card.tsx` | Vitest unit tests | Completed |
| AC-2 | SC-1 | Loading indicator shown while exam resolves; no flash of "Exam not found" | `exam-session-screen.tsx`, `use-exam-session.ts` | Vitest unit tests | Completed |
| AC-3 | SC-2 / DEC-2 | Expo Router navigates to session route with zero layout warnings | `app/exam/[id]/session/[sessionId]/_layout.tsx` | Route structure check | Completed |
| AC-4 | SC-3 | 404 directive responses treated quietly as idle without `console.warn` | `mobile-live-inspection-bridge.tsx` | Vitest unit tests | Completed |
| AC-5 | SC-4 / DEC-3 | Result screen computes reports without `questions.map` crash | `result-view.tsx`, `use-exam-result.ts` | Vitest unit tests | Completed |
| AC-6 | SC-5 | Turn In button on Result Screen navigates to `/exam/[id]/feedback` | `use-exam-result.ts`, `result/index.tsx` | Vitest unit tests | Completed |

---

## Scope & Non-Goals

### In Scope
- Explicit `style={{ flex: 1 }}` styling in `ExamSessionScreen` and `QuestionCard`.
- Loading spinner in `ExamSessionScreen`.
- Removal of redundant `session/[sessionId]/_layout.tsx`.
- Quiet 404 handling in `mobile-live-inspection-bridge.tsx`.
- Defensive question array handling in `ResultView` and `useExamResult`.
- Verification of `/exam/[id]/result` -> `/exam/[id]/feedback` navigation.

### Non-Goals
- Modifying backend scoring or grading algorithms in `@sentinel/shared`.
- Altering web instructor monitoring UI.

---

## Phases

- [x] [`phase-01-question-rendering-and-loading-state.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-rendering-routes-results-feedback/phase-01-question-rendering-and-loading-state.md) — Phase 1: Question Rendering, ScrollView Flex Layout, and Loading Skeleton
- [x] [`phase-02-route-layout-flattening.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-rendering-routes-results-feedback/phase-02-route-layout-flattening.md) — Phase 2: Route Layout Flattening & Warning Elimination
- [x] [`phase-03-live-inspection-quiet-404.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-rendering-routes-results-feedback/phase-03-live-inspection-quiet-404.md) — Phase 3: Live Inspection Quiet 404 Directive Handling
- [x] [`phase-04-result-screen-crash-and-feedback-flow.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-rendering-routes-results-feedback/phase-04-result-screen-crash-and-feedback-flow.md) — Phase 4: Result Screen Crash Fix (`questions.map`) & Feedback Navigation

---

## Verification & Final Audit

All phases have been executed and verified against automated unit test suites:
- **Unit Tests:** `pnpm --filter sentinel-mobile test` (154/154 passing across 31 test files).
- **TypeScript:** Strict type contracts adhered to without `any` regressions.
- **Runtime Stability:** Defensive fallbacks in place for array normalization and routing transitions.

---

## Verification

- **Automated Test Suite**:
  ```bash
  pnpm --filter sentinel-mobile test
  ```
- **Manual Verification Evidence**:
  - Open mobile exam attempt → Verify question text and option cards are visible and scrollable.
  - Check console logs upon entry → Verify 0 layout route warnings and 0 false-alarm live-inspection 404 warnings.
  - Submit exam → Verify Result screen renders score breakdown cleanly without crash.
  - Click Turn In → Verify navigation to Feedback rating screen.
