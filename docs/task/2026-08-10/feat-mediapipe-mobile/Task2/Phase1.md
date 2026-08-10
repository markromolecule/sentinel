# Task 2 - Phase 1: Question & Passage Rendering Fixes & Attempt Screen UI 1:1 Parity

**Goal:** Fix question loading and rendering issues on `sentinel-mobile`, implement reading passage display, and support all question types (`MULTIPLE_CHOICE`, `MULTIPLE_SELECT`, `TRUE_FALSE`, `SHORT_ANSWER`, `ESSAY`).

---

## 1. Context & Architecture Strategy

In `sentinel-web`, the exam attempt view (`attempt-view.tsx` & `question-renderer.tsx`) dynamically parses question content, supports reading passages (`passageTitle`, `passageContent`), renders specific UI controls per question type (`MULTIPLE_CHOICE`, `MULTIPLE_SELECT`, `TRUE_FALSE`, text input for `SHORT_ANSWER` / `ESSAY`), and supports split-screen passage viewing.

In `sentinel-mobile`:

1. `adaptExamQuestionsForMobile` (`features/exam/lib/mobile-exam-adapter.ts`) assumes every question has a simple `options` array or is `TRUE_FALSE`. Multi-select, short answer, and essay questions fail to render options or input controls, causing questions not to display properly.
2. Question card (`features/exam/components/session/question-card.tsx`) only renders single-select radio buttons.
3. Reading passages associated with questions (`question.content.passage` or `passageContent`) are not rendered anywhere on mobile.
4. Drawer and footer navigation don't indicate question status for complex answer formats.

---

## 2. Tasks & Implementation Steps

### Question Parsing & Data Adapter Refactoring

- [ ] **Update** `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts`
    - Refactor `adaptExamQuestionsForMobile` to extract `type`, `prompt`, `options`, `passage`, `passageTitle`, and `correctAnswer` (if preview).
    - Handle `MULTIPLE_SELECT` option arrays.
    - Handle `SHORT_ANSWER` and `ESSAY` placeholder text and length rules.
    - Ensure missing question fields default gracefully so no question fails to render.
- [ ] **Update unit tests** at `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.test.ts`
    - Test question adaptation for all 5 question types and questions with reading passages.

### Reading Passage Component

- [ ] **Create** `app/sentinel-mobile/features/exam/components/session/passage-card.tsx`
    - Render expandable / tabbed passage container with title, collapsible body text, and scroll synchronization.
    - Expose `PassageCard` component for mobile session view.
- [ ] **Write unit tests** at `app/sentinel-mobile/features/exam/components/session/passage-card.test.tsx`
    - Test passage collapse/expand state and text rendering.

### Question Card Component Refactoring

- [ ] **Update** `app/sentinel-mobile/features/exam/components/session/question-card.tsx`
    - Support `MULTIPLE_CHOICE`: radio options.
    - Support `MULTIPLE_SELECT`: checkbox options with array state array in `answers`.
    - Support `TRUE_FALSE`: True / False toggle buttons.
    - Support `SHORT_ANSWER` / `ESSAY`: TextInput area with character count and auto-save state.
    - Render `PassageCard` above question text when passage is present.
- [ ] **Write component tests** at `app/sentinel-mobile/features/exam/components/session/question-card.test.tsx`
    - Test rendering and option selection for all 5 question types.

---

## 3. Technical Verification & Constraints

- **Migration required:** No.
- **Breaking changes:** No.
- **Verification Commands:**
    - `pnpm --dir app/sentinel-mobile test`
