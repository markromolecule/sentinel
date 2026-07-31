# Monitoring Hook Refactoring Implementation Plan

## Task Summary

Refactor the `useMonitoring` hook in `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts` by splitting its distinct states, event logs, and API action domains into modular, testable, and maintainable sub-hooks within a dedicated hook directory.

## Pre-Planning

- [x] **Read and summarize the task input in one sentence:** Refactor the instructor-monitoring `useMonitoring` hook to be modular, readable, and maintainable by breaking it into sub-hooks inside a dedicated directory.
- [x] **Scan relevant source files to understand existing patterns:**
    - Checked [use-monitoring.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts>)
    - Checked [use-monitoring.test.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx>)
    - Reference hook structure: [use-exam-monitoring](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring>)
- [x] **Identify all files, services, and DB tables the task will touch:**
    - Modified/Moved hook: `use-monitoring.ts` -> `use-monitoring/index.ts`
    - New hooks: `use-monitoring/use-filters.ts`, `use-monitoring/use-incident-toast.ts`, `use-monitoring/use-runtime-access.ts`, `use-monitoring/use-lifecycle.ts`
    - New types: `use-monitoring/_types.ts`
    - Modified tests: `use-monitoring.test.tsx` (updated imports)
    - DB tables: None.
- [x] **Determine if a Prisma migration is needed:** No.

---

## 1-3-1 Options

### Option 1: Extract into structured folder directory `use-monitoring/` (Recommended)

Move `use-monitoring.ts` to `use-monitoring/index.ts` and split its responsibilities into separate files inside `use-monitoring/`:

- `_types.ts` for internal structures (like `IncidentSnapshot`).
- `use-filters.ts` for search and filtering of the student list.
- `use-incident-toast.ts` for incident notifications.
- `use-runtime-access.ts` for overriding/editing exam-level runtime status.
- `use-lifecycle.ts` for student attempt lifecycle actions.
  **Tradeoff:** Excellent alignment with workspace patterns, keeps files below the 120-line hook limit, improves testability and maintains 100% API compatibility.

### Option 2: Keep a single file but extract pure functions/helpers

Move non-react helper methods (like incident toast builders) to utility files, keeping all state hooks in the single `use-monitoring.ts` file.
**Tradeoff:** Fails to address the high state complexity and hook length in the single hook, keeping it over the 120-line limit.

### Option 3: Lift state to a page level context provider

Replace the hook with a context provider and child hooks.
**Tradeoff:** Overkill for this page's requirements, increasing boilerplate and complexity.

### Best Option

Choose **Option 1: Extract into structured folder directory `use-monitoring/`**. This directly aligns with existing patterns in the codebase (e.g. `use-exam-monitoring`) and keeps hooks focused on single concerns.

---

## Concrete Next Steps

1. Create types file `use-monitoring/_types.ts` and define `IncidentSnapshot`.
2. Create `use-monitoring/use-filters.ts` to manage search queries, filtering, and page states.
3. Create `use-monitoring/use-incident-toast.ts` to handle warning toasts on incident count changes.
4. Create `use-monitoring/use-runtime-access.ts` to manage exam lock, reset, close, and reopen windows.
5. Create `use-monitoring/use-lifecycle.ts` to coordinate student-attempt lifecycle status and reconnect overrides.
6. Create `use-monitoring/index.ts` to compose all sub-hooks and export the unified public interface.
7. Remove the old flat `use-monitoring.ts` file.
8. Update `use-monitoring.test.tsx` to target the new directory path.
9. Verify all unit tests pass.

---

## Phase 1: Create Types and Independent Sub-hooks (Filters & Incident Toasts)

**Goal:** Extract the self-contained types, filters, and notification state logic.

- [x] Create [use-monitoring/_types.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/_types.ts>)
- [x] Create [use-monitoring/use-filters.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-filters.ts>)
- [x] Create [use-monitoring/use-incident-toast.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-incident-toast.ts>)

**Migration required:** No.

---

## Phase 2: Create Action Sub-hooks (Runtime Access & Lifecycle) and Orchestrator

**Goal:** Extract API interactions and compose them in the main orchestrator hook.

- [x] Create [use-monitoring/use-runtime-access.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-runtime-access.ts>)
- [x] Create [use-monitoring/use-lifecycle.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-lifecycle.ts>)
- [x] Create [use-monitoring/index.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/index.ts>)
- [x] Remove old flat file [use-monitoring.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts>)
- [x] Update imports in [use-monitoring.test.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx>) and run tests.

**Migration required:** No.

---

## Done Criteria

- [x] Sub-hooks are organized inside `_hooks/use-monitoring/` folder.
- [x] The `useMonitoring` hook's public interface and contract is completely unchanged.
- [x] All unit tests pass successfully.
