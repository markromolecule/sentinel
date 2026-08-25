---
title: "Fix Mobile Question Rendering, Parity for Essay Grading Lifecycle, and Question Navigator Sheet UX"
type: context
status: ready
created: "2026-08-26"
tags: [context, mobile, question-rendering, essay-grading, question-drawer, sheet-ux, result-parity]
feature: "fix-mobile-questions-rendering-essay-grading-and-navigation-sheet"
---

# Fix Mobile Question Rendering, Parity for Essay Grading Lifecycle, and Question Navigator Sheet UX Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Question Card Blank / Rendering Failures:** On mobile, if questions have unexpected prompt formatting, missing options, or if question lists are resolving asynchronously, the question viewport above the footer renders as empty whitespace without fallback UI or empty state indicators.
  2. **Essay Grading Lifecycle Parity Gap:** On `sentinel-web`, exams containing `ESSAY` questions are marked as `requiresManualReview` (`scoreState: DRAFT`), displaying a provisional "Pending Review" banner on the student result screen and routing the attempt to the instructor grading module (`/exams/grading/[examId]/[attemptId]`) for rubric-based evaluation (`calculateEssayWeightedScore`). On `sentinel-mobile`, the result screen naively checks `(summary.percentage ?? 0) >= passingPercentage`, displaying an erroneous "DID NOT PASS" failure banner for unfinalized essay attempts and redundantly re-invoking `completeExamSession` upon clicking the turn-in button.
  3. **Unresponsive Question Navigator Sheet (Broken UX):** On the mobile exam attempt page, opening the bottom question navigator sheet traps the user because:
     - The question number buttons (`1, 2, 3...`) inside the drawer are unclickable due to responder theft (`onStartShouldSetResponder={() => true}`) on the inner `ScrollView` and a wrapping `TouchableWithoutFeedback`.
     - The bottom footer button only triggers `setIsDrawerOpen(true)` instead of toggling open/close state.
     - The drawer backdrop lacks proper touch dismissal and fails to close unless the user manages to select a question.

- **Business / User Value:**
  - Ensures students taking exams on mobile always see their questions and clear feedback even in edge cases.
  - Prevents erroneous "DID NOT PASS" results for exams with essay questions by aligning mobile result states with web grading workflows.
  - Fixes mobile navigation sheet interactions so students can effortlessly inspect question status, jump between questions, and toggle or dismiss the navigator at any time.

- **Measurable Success Criteria:**
  - All question types (Multiple Choice, Multiple Response, True/False, Identification, Essay, Fill in the Blank, Matching, Enumeration) render reliably with prompt text, choice badges/inputs, and empty-state fallbacks.
  - Exam attempts containing `ESSAY` questions show "Pending Review" on mobile result views until graded by instructors via the grading module, preventing false-fail scores.
  - Question navigator sheet numbers are 100% responsive on tap, footer button toggles the sheet open and closed, close button dismisses cleanly, and backdrop tapping closes the sheet.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As a student taking an exam on mobile, I want to clearly see question prompts, answer choices, and reading passages so that I can answer questions without UI glitches.*
- *As a student completing an exam with essay questions, I want my score to indicate "Pending Review" until my instructor grades my essay using the rubric, so that I am not falsely shown a failing grade.*
- *As a student navigating an exam on mobile, I want to tap the question grid button in the footer to toggle the question sheet open or closed, tap any number to jump to that question, and tap outside to close the sheet.*
- *As an instructor using Sentinel Web, I want student essay submissions from both mobile and web to be submitted cleanly into the grading queue with complete essay answers.*

### Functional Requirements

- [ ] **FR-01 (Robust Question Rendering & Empty State Fallbacks on Mobile):**
  - In `QuestionCard` (`app/sentinel-mobile/features/exam/components/session/question-card.tsx`), handle `!question` gracefully by rendering an explicit "Question unavailable" fallback container rather than returning `null`.
  - In `ExamSessionScreen` (`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`), if `questions.length === 0` after loading completes, render a helpful empty state card with a refresh action instead of blank screen space.
  - In `mobile-exam-adapter.ts`, support normalized question prompt retrieval across all property naming variations (`content.prompt`, `content.question`, `content.text`, `content.title`, etc.).
- [ ] **FR-02 (Essay Grading Parity & Result Screen Pending Review State):**
  - In `ResultView` (`app/sentinel-mobile/features/exam/components/detail/result-view.tsx`), check `summary.requiresManualReview` and `summary.manualReviewQuestionCount > 0`.
  - When manual review is required or score is null:
    - Display status as **"PENDING REVIEW"** with a neutral/amber badge instead of calculating `isPassed` as false ("DID NOT PASS").
    - Display Score as `"Pending Review"` and Percentage as `"--"` or `"Provisional"`.
    - Add an informational callout banner: *"Your exam includes essay questions that require instructor grading. Your final grade will be updated once your instructor finishes reviewing."*
  - In `use-exam-result.ts` (`app/sentinel-mobile/features/exam/hooks/use-exam-result.ts`):
    - Prevent duplicate `completeExamSession` API calls when the attempt has already been completed during session finish; navigate directly to post-exam feedback.
- [ ] **FR-03 (Fix Question Navigator Sheet Touch Events & Toggle Controls):**
  - In `QuestionDrawer` (`app/sentinel-mobile/features/exam/components/session/question-drawer.tsx`):
    - Remove `onStartShouldSetResponder={() => true}` from the horizontal `ScrollView` to allow touch events to propagate cleanly to `TouchableOpacity` question badges.
    - Remove the outer `TouchableWithoutFeedback onPress={() => {}}` wrapper that intercepts child clicks.
    - Ensure question badges call `onSelectQuestion(index)` and `onClose()` on tap.
    - Ensure close icon button on drawer header calls `onClose()`.
  - In `SessionFooter` (`app/sentinel-mobile/features/exam/components/session/session-footer.tsx`):
    - Wire drawer toggle button to invoke `onToggleDrawer`.
  - In `ExamSessionScreen` (`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`):
    - Change `onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}` to support toggling closed.
    - Replace the backdrop with an explicit full-screen dismiss overlay:

      ```tsx
      {isDrawerOpen && (
          <TouchableOpacity
              activeOpacity={1}
              onPress={() => setIsDrawerOpen(false)}
              style={StyleSheet.absoluteFillObject}
          />
      )}
      ```

### Edge Cases & Failure Modes

- **Zero Assigned Questions:** When an exam has no questions in the backend, the mobile session screen displays a friendly empty state instead of collapsing to an invisible blank view.
- **Mixed Objective & Essay Questions:** When an exam has 10 Multiple Choice questions (all answered) and 2 Essay questions, the result view displays the auto-graded portion alongside a clear indicator that 2 items are pending manual review.
- **Rapid Sheet Toggling:** Fast taps on the footer grid button or backdrop smoothly animate the sheet open and closed without freezing or locking up the UI thread.
- **Double Turn-in Prevention:** If a student is already on the result preview screen, clicking "Complete & Give Feedback" transitions smoothly to `/exam/[id]/feedback` without duplicate network mutations.

---

## 3. Technical & Architectural Context

### Affected Files & Components

1. **Mobile Exam Session Components (`app/sentinel-mobile/features/exam/components/session/`)**:
   - [`exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx)
   - [`question-card.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-card.tsx)
   - [`question-drawer.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-drawer.tsx)
   - [`session-footer.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/session-footer.tsx)
2. **Mobile Result & Detail Components (`app/sentinel-mobile/features/exam/components/detail/`)**:
   - [`result-view.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/detail/result-view.tsx)
3. **Mobile Hooks & Adapters (`app/sentinel-mobile/features/exam/`)**:
   - [`hooks/use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts)
   - [`hooks/use-exam-result.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-result.ts)
   - [`lib/mobile-exam-adapter.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts)
4. **Reference Implementation on Sentinel Web**:
   - [`app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx)
   - [`app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/page.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/page.tsx)

### Data Model & Scoring Integration

- **Essay Scoring Model**: `scoreExamAttempt` in `@sentinel/shared` flags `requiresManualReview: true` for attempts with essay questions.
- **Rubric Weighted Score**: Instructor grading updates the attempt via `calculateEssayWeightedScore(scores, points, rubric.definition)`.
- **Answer Storage**: Essay responses from mobile are saved verbatim as string values in `answerPayload` to match the web scoring and grading format.

---

## 4. UI/UX & Interaction Guidelines

- **Question Sheet / Drawer**:
  - Position: Floating bottom sheet pinned above the safe bottom inset and footer.
  - Interactive badges: 50x50 touch targets with active border (primary color), answered state (emerald indicator), flagged state (amber flag icon).
  - Dismissible by: Tapping any question number, tapping close button, tapping the footer toggle button, or tapping the semi-transparent backdrop.
- **Result Screen Pending Status**:
  - Badge: Amber background (`rgba(245, 158, 11, 0.1)`), amber border, icon `time-outline` / `hourglass-outline`, text: "PENDING REVIEW".
  - Score display: "Pending Review" / "--" with subtext explaining essay manual review.
  - CTA Button: "Continue to Feedback" directing to `/exam/[id]/feedback`.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Fixing question rendering and fallback empty states in `sentinel-mobile`.
  - Updating `result-view.tsx` and `use-exam-result.ts` to support the essay grading lifecycle and provisional result states matching `sentinel-web`.
  - Fixing `QuestionDrawer` responder blocking, sheet backdrop, and toggle controls in `sentinel-mobile`.
  - Adding unit tests for `QuestionDrawer`, `QuestionCard`, and `ResultView`.
- **Out of Scope:**
  - Creating a mobile instructor grading interface (instructor grading remains on `sentinel-web`).
  - Modifying backend PostgreSQL Prisma schema or scoring database tables.

---

## 6. References & External Context

- Web Student Result Reference: [`app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx)
- Web Instructor Grading Reference: [`app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/page.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/page.tsx)
- Shared Scoring Engine: [`packages/shared/src/exams/score-exam-attempt-core.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/shared/src/exams/score-exam-attempt-core.ts)
- Essay Rubric Engine: [`packages/shared/src/exams/essay-rubric.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/shared/src/exams/essay-rubric.ts)
