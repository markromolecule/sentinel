# Task 2 - Phase 1: Question & Passage Rendering Fixes & Attempt Screen UI 1:1 Parity

**Goal:** Fix question loading and rendering issues on `sentinel-mobile`, implement reading passage display, and support all question types (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `ESSAY`, `FILL_BLANK`, `ENUMERATION`, `MATCHING`).

---

## 1. Context & Architecture Strategy

In `sentinel-web`, the exam attempt view (`attempt-view.tsx` & `question-renderer.tsx`) dynamically parses question content, supports reading passages (`passageTitle`, `passageContent`), renders specific UI controls per question type (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, text input for `IDENTIFICATION` / `ESSAY`), and supports split-screen passage viewing.

In `sentinel-mobile`:

1. `adaptExamQuestionsForMobile` (`features/exam/lib/mobile-exam-adapter.ts`) assumed every question has a simple `options` array or is `TRUE_FALSE`. Multi-select, short answer, and essay questions failed to render options or input controls, causing questions not to display properly.
2. Question card (`features/exam/components/session/question-card.tsx`) only rendered single-select radio buttons.
3. Reading passages associated with questions (`question.content.passage` or `passageContent`) were not rendered anywhere on mobile.
4. Drawer and footer navigation don't indicate question status for complex answer formats.

---

## 2. Tasks & Implementation Steps

### Question Parsing & Data Adapter Refactoring

- [x] **Update** `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts`
    - Refactored `adaptExamQuestionsForMobile` to extract `type`, `prompt`, `options`, `passage`, `passageTitle`, and `correctAnswer` (if preview).
    - Handles all 8 question types: `MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `ESSAY`, `FILL_BLANK`, `ENUMERATION`, `MATCHING`.
    - Extracts `passageContent` from both the question record (`question.passageContent`) and embedded `content.passage`.
    - Handles missing question fields gracefully so no question fails to render.
    - Updated `buildSessionAnswerPayload` to support `string | string[]` answers (multi-select serialised as JSON array of option texts).
    - Updated `MobileSessionQuestion` type with `passage`, `passageTitle`, `placeholder`, `maxLength` fields.
- [x] **Update unit tests** at `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.test.ts`
    - Tests question adaptation for all question types and questions with reading passages.
    - Tests `buildSessionAnswerPayload` for single-select, multi-select, TRUE_FALSE, and text-based answers.

### Reading Passage Component

- [x] **Create** `app/sentinel-mobile/features/exam/components/session/passage-card.tsx`
    - Renders expandable/collapsible passage container with title, scrollable body text.
    - Exposes `PassageCard` component for use in the session view.
- [x] **Write unit tests** at `app/sentinel-mobile/features/exam/components/session/passage-card.test.tsx`
    - Tests passage collapse/expand state and text rendering.
    - Tests default and custom title rendering.
    - Tests `accessibilityRole="article"` on outer container.

### Question Card Component Refactoring

- [x] **Update** `app/sentinel-mobile/features/exam/components/session/question-card.tsx`
    - Supports `MULTIPLE_CHOICE`: radio-style `TouchableOpacity` rows with `accessibilityRole="radio"`.
    - Supports `MULTIPLE_RESPONSE`: checkbox-style rows with `accessibilityRole="checkbox"` and array state tracking.
    - Supports `TRUE_FALSE`: True/False toggle button pair.
    - Supports `IDENTIFICATION`, `ESSAY`, `FILL_BLANK`, `ENUMERATION`: `TextInput` with `multiline` (essay) or single-line, character counter.
    - Supports `MATCHING`: read-only notice text.
    - Renders `PassageCard` above question text when `passage` is present.
    - Removed local `useState` for text value — uses uncontrolled `TextInput` (defaultValue) to stay testable as a plain function.
- [x] **Write component tests** at `app/sentinel-mobile/features/exam/components/session/question-card.test.tsx`
    - Tests rendering and option selection for all 5 question types.
    - Tests PassageCard is shown/hidden based on `passage` presence.
    - Tests `onSelectOption` and `onToggleFlag` callbacks.

---

## 3. Technical Verification & Constraints

- **Migration required:** No.
- **Breaking changes:** No.
- **Verification Commands:**
    - `pnpm --dir app/sentinel-mobile test`
- **Test results:** ✅ 124 tests passed across 25 test files (2026-08-10).
