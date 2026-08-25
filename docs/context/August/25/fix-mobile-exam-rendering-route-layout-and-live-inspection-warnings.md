---
title: "Fix Mobile Exam Question Rendering, Route Layout Conflicts, Result Screen Crash, and Post-Exam Feedback Flow"
type: context
status: ready
created: "2026-08-25"
tags: [context, mobile, exam-session, layout, question-rendering, livekit, result-screen, feedback]
feature: "fix-mobile-exam-rendering-route-layout"
---

# Fix Mobile Exam Question Rendering, Route Layout Conflicts, Result Screen Crash, and Post-Exam Feedback Flow Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Question Card Collapsed / Not Showing:** In `sentinel-mobile`, the active exam session screen renders the header and bottom navigator, but the question area in the middle is completely blank. The container `<View>` and `<ScrollView>` relied on NativeWind `className="flex-1"` without explicit React Native `style={{ flex: 1 }}`, causing the `ScrollView` to collapse to height 0 between the header and absolute footer.
  2. **Route Layout Conflict Warning:** Navigating to an exam session generates:
     `WARN [Layout children]: No route named "session/[sessionId]/index" exists in nested children: ["index", "checkup/index", "feedback/index", "feedback/thank-you", "instruction/index", "lobby/index", "privacy/index", "result/index", "session/[sessionId]"]`.
     This occurs because `app/exam/[id]/session/[sessionId]/_layout.tsx` created an unnecessary nested Stack Navigator that broke child route naming.
  3. **Premature "Exam not found" Flash:** When the student enters the session screen, `useExamQuery` fetches exam data asynchronously. While `isLoading` is `true`, `ExamSessionScreen` immediately falls through to render `<Text>Exam not found</Text>` instead of an activity indicator / loading skeleton.
  4. **Spurious 404 Warning in Live Inspection Bridge:** When no proctor has requested live video inspection, the backend returns a normal 404 ("Live inspection is not available."). In `mobile-live-inspection-bridge.tsx`, the catch block logged this expected idle response as `WARN Live inspection directive reconciliation failed: [ApiError: Live inspection is not available.]`.
  5. **Crash on Result Screen (`questions.map is not a function`):** Upon submitting an exam, the mobile app navigates to `/exam/[id]/result`, where `ResultView` invokes `buildExamAttemptQuestionReports({ questions: exam.questions })`. Because `adaptExamForMobile` transforms `exam.questions` into a `number` (`questionCount`), `exam.questions` evaluates to a number (e.g. `3`), causing `questions.map` to throw an unhandled `TypeError` that crashes the screen.
  6. **Blocked Navigation to Feedback Screen:** Because `ResultScreen` crashed immediately on mount during report building, the user could never reach or submit the post-exam feedback workflow.

- **Business / User Value:**
  - Provides a smooth, non-flickering mobile exam taking experience where questions and answer choices render immediately.
  - Eliminates Expo Router layout routing warnings and redundant navigator nesting.
  - Replaces premature "Exam not found" flashes with a clean loading indicator.
  - Suppresses false-alarm console warnings while keeping live video streaming responsive on demand.
  - Prevents app crashes on the Result screen and guarantees seamless navigation into the post-exam feedback and rating screen.

- **Measurable Success Criteria:**
  - Questions and interactive choices (MCQ, True/False, Essay, Identification, Fill in the Blank, Matching, Enumeration) render with full vertical scrollability.
  - Zero Expo Router layout child warnings when navigating from lobby to session.
  - Session displays a loading indicator while exam data resolves, only displaying "Exam not found" if the query permanently fails.
  - Directive reconciliation handles 404 silently as idle without `console.warn` spam.
  - Result screen calculates scores and section breakdowns safely without TypeError crashes by passing normalized question arrays.
  - Result screen smoothly transitions into `/exam/[id]/feedback` upon clicking turn-in/continue.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As a student taking an exam on mobile, I want to see the question prompt and option cards immediately after entering from the lobby, so that I can answer questions without interface bugs.*
- *As a student entering an exam, I want to see a loading indicator while my session prepares, rather than an alarming "Exam not found" message.*
- *As a student submitting my exam, I want to see my score summary and question breakdown without app crashes, and then proceed directly to the feedback screen.*
- *As a developer / QA engineer testing mobile proctoring, I want clean console logs that do not report expected idle 404 directive queries as reconciliation failures.*

### Functional Requirements

- [ ] **FR-01 (Explicit Flex Styling on Mobile Question Card & Session Root):**
  - Update `ExamSessionScreen` (`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`) root container to use `style={{ flex: 1, backgroundColor: colors.background }}`.
  - Update `QuestionCard` (`app/sentinel-mobile/features/exam/components/session/question-card.tsx`) to set `style={{ flex: 1 }}` on the `<ScrollView>` component with `contentContainerStyle={{ padding: 20, paddingBottom: 120 }}`.
- [ ] **FR-02 (Eliminate Redundant Session Stack Layout & Flatten Expo Route):**
  - Remove `app/sentinel-mobile/app/exam/[id]/session/[sessionId]/_layout.tsx` so that `app/exam/[id]/session/[sessionId]/index.tsx` is recognized directly as a top-level child of `app/exam/[id]/_layout.tsx`.
  - In `app/sentinel-mobile/app/exam/[id]/_layout.tsx`, ensure `name="session/[sessionId]/index"` is properly mapped without nested layout conflicts.
- [ ] **FR-03 (Loading Skeleton / Activity Indicator in Session Screen):**
  - Update `useExamSession` to expose `isLoading: isExamLoading` from `useExamQuery`.
  - In `ExamSessionScreen`, when `isLoading` is true, render a centered `ActivityIndicator` with "Loading exam session..." instead of "Exam not found".
- [ ] **FR-04 (Quiet 404 Handling in Mobile Live Inspection Bridge):**
  - In `mobile-live-inspection-bridge.tsx`, inspect caught errors: if `err.status === 404` or `err.message?.includes('Live inspection is not available')`, treat as normal `idle` state without `console.warn`.
  - Retain diagnostics and warnings only for unexpected 5xx server errors or authorization failures.
- [ ] **FR-05 (Defensive Question Array Handling in ResultView & useExamResult):**
  - In `useExamResult` (`app/sentinel-mobile/features/exam/hooks/use-exam-result.ts`), extract and expose `rawQuestions: rawExam?.questions ?? []` or normalized question models alongside `exam`.
  - In `ResultView` (`app/sentinel-mobile/features/exam/components/detail/result-view.tsx`), defensively normalize `questions`: ensure `Array.isArray(questions) ? questions : (rawExam?.questions || [])` before invoking `buildExamAttemptQuestionReports`.
- [ ] **FR-06 (Post-Exam Feedback Navigation Guarantee):**
  - Verify that `useExamResult.handleTurnIn` successfully clears session storage and navigates to `/exam/[id]/feedback?attemptId=${sessionId}`.
  - Add fallback direct navigation to feedback if stored preview already exists.

---

## 3. Technical & Architectural Context

### Affected Files & Components

1. **Mobile Routing & Layouts (`app/sentinel-mobile/app/exam/[id]/`)**:
   - [`_layout.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/_layout.tsx)
   - `session/[sessionId]/_layout.tsx` (redundant nested stack to be deleted)
   - [`session/[sessionId]/index.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/session/[sessionId]/index.tsx)
   - [`result/index.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/result/index.tsx)
   - [`feedback/index.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/feedback/index.tsx)
2. **Mobile Session & Result Components (`app/sentinel-mobile/features/exam/components/`)**:
   - [`session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx)
   - [`session/question-card.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-card.tsx)
   - [`session/mobile-live-inspection-bridge.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.tsx)
   - [`detail/result-view.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/detail/result-view.tsx)
3. **Mobile Hooks (`app/sentinel-mobile/features/exam/hooks/`)**:
   - [`use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts)
   - [`use-exam-result.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-result.ts)

---

## 4. UI/UX & Interaction Guidelines

- **Loading State:** Centered `ActivityIndicator` with theme-aware text (`colors.text`) and brand accent color (`#4f46e5`).
- **Scroll Container:** Full viewport height allocation (`flex: 1`), padded bottom content offset (`120px`) to prevent overlap with the absolute floating bottom navigation toolbar.
- **Header & Footer:** Persistent fixed header (`SessionHeader`) and floating glassmorphism/card footer (`SessionFooter`).
- **Result & Feedback Transition:** Seamless flow: Session → Submit → Score Result View → Turn In Button → Post-Exam Feedback Rating (1–5 emojis) → Dashboard.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Fixing `flex: 1` scroll layout in `ExamSessionScreen` and `QuestionCard`.
  - Removing the redundant nested `_layout.tsx` in `session/[sessionId]/`.
  - Adding loading activity state to `ExamSessionScreen`.
  - Silencing 404 idle warnings in `mobile-live-inspection-bridge.tsx`.
  - Fixing question array type mismatch in `ResultView` to eliminate the `questions.map is not a function` crash.
  - Ensuring `/exam/[id]/result` -> `/exam/[id]/feedback` navigation works reliably.
- **Out of Scope:**
  - Changes to grading or answer submission backend schemas.
  - Web instructor monitoring dashboard modifications.

---

## 6. References & External Context

- Task Execution Plan: [`docs/tasks/2026/08/2026-08-25/fix-mobile-exam-questions-evidence-feedback-livekit/README.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-mobile-exam-questions-evidence-feedback-livekit/README.md)
- Shared Scoring Engine: [`packages/shared/src/exams/score-exam-attempt-reports.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/shared/src/exams/score-exam-attempt-reports.ts)
