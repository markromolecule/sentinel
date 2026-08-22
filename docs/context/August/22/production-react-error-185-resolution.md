---
title: "Production React Error #185 & Assignment Page Filter TypeError Resolution"
type: context
status: ready
created: "2026-08-22"
tags: [context, bugfix, react, exam-builder, question-bank-modal, infinite-loop, assignments, hooks]
feature: "production-react-errors-fix"
---

# Production React Error #185 & Assignment Page Filter TypeError Resolution Context Specification

## 1. Overview & Objective

- **Problem Statement:** 
  Two critical runtime exceptions are occurring in production builds of `sentinel-web`:
  1. **React Error #185 ("Maximum update depth exceeded"):**
     `aec17df2528ce722.js:1 Uncaught Error: Minified React error #185; visit https://react.dev/errors/185`
     Occurs when mounting the Exam Builder workspace or opening the Question Bank Import modal due to circular state and effect updates in `use-question-bank-import-modal.ts` and `use-question-bank-import-selection.ts`.
  2. **Assignment Page TypeError (`S.filter is not a function`):**
     `6c6d0b4349bf5ab4.js:9 Uncaught TypeError: S.filter is not a function at useMemo`
     Occurs on the exam assignment page (`/exams/assign` / `NewAssignmentsBuilder`) when attempting to filter room records (`(rooms as Room[]).filter(...)`).

- **Root Cause Analysis:**
  1. **Circular Hook Dependency in Question Bank Modal Bridge Hook (`use-question-bank-import-modal.ts`):**
     ```typescript
     const selection = useQuestionBankImportSelection(allowedQuestionType);
     ...
     useEffect(() => {
         selection.setAlreadyAddedIds(alreadyAddedIds);
     }, [alreadyAddedIds, selection]);
     ```
     `selection` is a non-memoized object returned by `useQuestionBankImportSelection` that is recreated on every render. Because `selection` is listed in the `useEffect` dependency array, calling `selection.setAlreadyAddedIds` causes a state update, triggering a re-render that returns a brand new `selection` reference, which immediately re-triggers the `useEffect`. This produces an unconditional infinite state loop.
  2. **Self-Triggering Effect Dependency in Selection Hook (`use-question-bank-import-selection.ts`):**
     ```typescript
     useEffect(() => {
         if (allowedQuestionType) {
             setSelectedQuestionType(allowedQuestionType);
             setSelectedQuestionsById((currentQuestions) => { ... });
             setSelectedIds((currentIds) =>
                 currentIds.filter(
                     (id) => selectedQuestionsById[id]?.question.type === allowedQuestionType,
                 ),
             );
         }
     }, [allowedQuestionType, selectedQuestionsById]);
     ```
     Because `selectedQuestionsById` is in the dependency array and `setSelectedQuestionsById` updates `selectedQuestionsById` with a new object literal on each invocation, whenever `allowedQuestionType` is defined (e.g. `'MULTIPLE_CHOICE'`), the effect runs, updates `selectedQuestionsById`, triggers a re-render, changes `selectedQuestionsById` reference, and runs the effect again indefinitely.
  3. **Non-Array Paginated Response in `NewAssignmentsBuilder` (`new-assignments-builder.tsx`):**
     In `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`:
     ```typescript
     const { data: rooms = [] } = useRoomsQuery({ limit: 25, page: 1 });
     ...
     const activeRooms = React.useMemo(() => {
         return (rooms as Room[]).filter((room: Room) => room.status !== 'MAINTENANCE');
     }, [rooms]);
     ```
     When `useRoomsQuery` receives `{ limit: 25, page: 1 }`, the backend API returns a paginated object payload: `{ data: Room[], meta: { total, page, limit, totalPages } }`. The hook resolves `data` as this object, NOT a flat array. Calling `(rooms as Room[]).filter(...)` throws `TypeError: S.filter is not a function` inside `useMemo`.

- **Business / User Value:** 
  - Instructors can access and work inside both the Exam Builder workspace and the Exam Assignment page without encountering white-screen crashes or fatal runtime errors.
  - Question bank modal selection, question filtering, and room assignments function reliably across all modern browsers.

- **Success Criteria:** 
  - Zero React Error #185 or `TypeError: .filter is not a function` errors in development and production builds.
  - `use-question-bank-import-selection.test.ts`, `use-question-bank-import-modal.test.ts`, and `new-assignments-builder.test.tsx` pass cleanly in Vitest.
  - Full Next.js production builds and test suites pass across `sentinel-web` and `sentinel-core`.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor editing an exam in the Exam Builder workspace, I want the builder interface to load smoothly without encountering fatal React maximum update depth crashes.*
- *As an Instructor creating classroom section assignments for an exam, I want the assignment builder to load and filter available rooms without throwing `TypeError: .filter is not a function`.*
- *As a QA / Release Engineer, I want all hook and component tests to execute synchronously and cleanly in CI.*

### Functional Requirements

- [ ] **FR-01 (Fix `useQuestionBankImportModal` Dependency Loop):**
  - In `app/sentinel-web/.../use-question-bank-import-modal.ts` and `app/sentinel-core/...`:
  - Pass `alreadyAddedIds` to `useQuestionBankImportSelection(allowedQuestionType, alreadyAddedIds)`.
  - Use stable setter dispatcher `selection.setAlreadyAddedIds` in `useEffect` dependencies `[alreadyAddedIds, selection.setAlreadyAddedIds]` (instead of depending on the entire `selection` object).
- [ ] **FR-02 (Fix `useQuestionBankImportSelection` Self-Triggering Effect):**
  - In `app/sentinel-web/.../use-question-bank-import-selection.ts` and `app/sentinel-core/...`:
  - Remove `selectedQuestionsById` from `useEffect` dependencies.
  - Maintain a ref `selectedQuestionsByIdRef.current = selectedQuestionsById` to safely filter IDs without stale closures.
  - Prune incompatible entries only when needed, avoiding object reference churn if all items already match `allowedQuestionType`.
- [ ] **FR-03 (Fix `NewAssignmentsBuilder` Room Query Array Handling):**
  - In `app/sentinel-web/.../new-assignments-builder.tsx` (and `sentinel-core` counterpart):
  - Switch to unpaginated `useRoomsQuery()` or defensively normalize the response via `Array.isArray(rooms) ? rooms : (rooms?.data ?? [])`.
  - Defensively guard `classrooms` and `users` data arrays in `useMemo` filters against non-array payloads.
- [ ] **FR-04 (Monorepo Parity & Test Suite):**
  - Verify all unit and component tests in `sentinel-web` and `sentinel-core` pass cleanly.

### Edge Cases & Failure Modes

- **Edge Case 1: `useRoomsQuery` returns loading state (`undefined`), paginated `{ data: [] }`, or flat `[]`:**
  - *Behavior:* Safe array extractor guarantees `roomsList` is always an Array (`[]`), preventing `.filter` crashes.
- **Edge Case 2: `allowedQuestionType` dynamically toggled:**
  - *Behavior:* Hook cleans incompatible question types once without triggering infinite effect loops.

---

## 3. Technical & Architectural Context

- **Affected Domains / Layers:**
  - Web App (`app/sentinel-web`): `src/features/exams/builder/...`, `src/app/(protected)/(instructor)/exams/assign/...`
  - Core App (`app/sentinel-core`): `src/features/exams/builder/...`, `src/app/(protected)/exams/assign/...`
- **Existing Files & Reference Symbols:**
  - `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-selection.ts`
  - `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-modal.ts`
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-room-combobox.tsx`
  - `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-selection.ts`
  - `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-modal.ts`
  - `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx`
- **Data Model & Schema Changes:**
  - None.

---

## 4. Scope & Boundaries

- **In Scope:**
  - Eliminating circular hook dependencies and unstable effect dependencies in `useQuestionBankImportSelection` and `useQuestionBankImportModal`.
  - Normalizing `useRoomsQuery` payload and guarding `.filter` calls in `NewAssignmentsBuilder`.
  - Running monorepo test suites and Next.js production builds.

- **Out of Scope:**
  - Redesigning assignment builder UI or question bank modal.
  - Modifying backend database schemas.

---

## 5. Verification Strategy & Risks

- **Verification Steps:**
  1. `pnpm --filter sentinel-web test use-question-bank-import-selection.test.ts`
  2. `pnpm --filter sentinel-web test use-question-bank-import-modal.test.ts`
  3. `pnpm --filter sentinel-web test new-assignments-builder.test.tsx`
  4. `pnpm --filter sentinel-core test use-question-bank-import-selection.test.ts`
  5. `pnpm --filter sentinel-core test new-assignments-builder.test.tsx`
  6. `pnpm --filter sentinel-web build`
