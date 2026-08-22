---
title: "Fix Production React Error #185 and Assignment Page Filter TypeError"
type: task
status: planned
created: "2026-08-22"
tags: [task, bugfix, react, exam-builder, question-bank-modal, assignments, hooks]
---

# Fix Production React Error #185 and Assignment Page Filter TypeError

## Outcome

Eliminate the runtime React Error #185 ("Maximum update depth exceeded") in the Exam Builder/Question Bank modal and the `TypeError: S.filter is not a function` on the Assignment page across `sentinel-web` and `sentinel-core`.

## Pre-planning record

- **Context Specification:** [`docs/context/August/22/production-react-error-185-resolution.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/22/production-react-error-185-resolution.md)

### Actors and goals

- **Instructor:** Wants to build exams in the Exam Builder and assign rooms/instructors in the Assignment Builder without encountering unhandled runtime exceptions.
- **QA / Developer:** Wants automated tests in Vitest and production Next.js builds to execute cleanly without timeouts or type errors.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor opens Exam Builder | Exam with questions exists | Page renders smoothly; QuestionBankImportModal initializes without infinite loop | Error boundary catches cleanly | Planned |
| SC-02 | Hook filters by `allowedQuestionType` | Incompatible questions selected | State filters incompatible selections once without re-triggering effect | Fallback keeps existing selection | Planned |
| SC-03 | Instructor opens Assignment Page | Exam and subject selected | Page loads rooms and sections; `activeRooms` filters without `.filter` TypeError | Empty room array fallback | Planned |
| SC-04 | Vitest test suites run | Tests executed | All hook and component tests pass in <1s | Test timeout / failure | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How to sync `alreadyAddedIds` without circular re-renders? | Pass initial `alreadyAddedIds` to `useQuestionBankImportSelection` and depend only on stable `setAlreadyAddedIds` | Re-created `selection` object reference in effect dependencies caused unconditional infinite re-renders | Memoizing whole `selection` object | `use-question-bank-import-modal.ts` |
| DEC-02 | How to filter by `allowedQuestionType` safely? | Remove `selectedQuestionsById` from effect deps and use ref/updater | `setSelectedQuestionsById` was returning a new object reference, causing continuous re-execution | Disabling linter rule | `use-question-bank-import-selection.ts` |
| DEC-03 | How to resolve `S.filter is not a function` in `NewAssignmentsBuilder`? | Call unpaginated `useRoomsQuery()` and defensively extract array with `Array.isArray(...) ? ... : ...` | Paginated query args `{ limit: 25, page: 1 }` returned `{ data: Room[], meta }` object, crashing `(rooms as Room[]).filter(...)` | Forcing cast without array check | `new-assignments-builder.tsx` |

### Unknowns and blockers

- None.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01 | `useQuestionBankImportModal` does not trigger circular re-render loop on mount | Refactor effect dependencies in `use-question-bank-import-modal.ts` | Run `use-question-bank-import-modal.test.ts` | Completed |
| AC-02 | SC-02, DEC-02 | `useQuestionBankImportSelection` prunes incompatible questions without infinite loop | Refactor `allowedQuestionType` effect in `use-question-bank-import-selection.ts` | Run `use-question-bank-import-selection.test.ts` | Completed |
| AC-03 | SC-03, DEC-03 | `NewAssignmentsBuilder` correctly handles room data without `TypeError: .filter is not a function` | Normalize room query data in `new-assignments-builder.tsx` | Run `new-assignments-builder.test.tsx` | Completed |
| AC-04 | SC-04 | Vitest monorepo test suites pass cleanly | Run test suites | `pnpm --filter sentinel-web test` & `sentinel-core` | Completed |

## Scope

- Refactoring `use-question-bank-import-selection.ts` and `use-question-bank-import-modal.ts` in `app/sentinel-web` and `app/sentinel-core`.
- Fixing room query consumption and array normalization in `new-assignments-builder.tsx`.
- Updating hook and component unit tests.

## Non-goals

- Redesigning assignment builder UI or question bank modal.

## Phases

- [x] `phase-01-fix-question-bank-import-hooks.md` — Phase 1: Refactor Question Bank Selection & Modal Hooks in `sentinel-web` and `sentinel-core`
- [x] `phase-02-fix-assignment-builder-room-query.md` — Phase 2: Fix Assignment Builder Room Query & Filter Handling
- [x] `phase-03-monorepo-verification-and-test-suite.md` — Phase 3: Monorepo Vitest Suite and Next.js Build Verification

## Verification

- `pnpm --filter sentinel-web test use-question-bank-import-selection.test.ts` (PASS: 2/2 tests)
- `pnpm --filter sentinel-web test use-question-bank-import-modal.test.ts` (PASS: 1/1 test)
- `pnpm --filter sentinel-core test use-question-bank-import-selection.test.ts` (PASS: 2/2 tests)
- `pnpm --filter sentinel-core test use-question-bank-import-modal.test.ts` (PASS: 1/1 test)
- `pnpm --filter sentinel-web test new-assignments-builder.test.tsx row-room-combobox.test.tsx` (PASS: 9/9 tests)
- `pnpm --filter sentinel-core test new-assignments-builder.test.tsx row-classroom-combobox.test.tsx` (PASS: 6/6 tests)
- `pnpm --filter sentinel-web test src/features/exams/config/_hooks/use-exam-edit-form.test.ts` (PASS: 3/3 tests)
- `pnpm --filter sentinel-web test use-exam-session.test.tsx` (PASS: 9/9 tests)
- `pnpm --filter sentinel-web build` (PASS: 58/58 static pages generated in 10.9s Turbopack build)

## Deviations

- None.

## Result

- Planned.
