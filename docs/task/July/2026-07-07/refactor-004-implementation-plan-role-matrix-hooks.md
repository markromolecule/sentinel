# Role Matrix Hooks Refactoring Implementation Plan

## Task Summary

Refactor the `useRoleMatrix` hook in `app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts` by splitting its distinct state domains into modular, testable, and maintainable sub-hooks.

## Pre-Planning

- [x] **Read and summarize the task input in one sentence:** Refactor the role matrix hook into separate modular hooks to improve maintainability and readability.
- [x] **Scan relevant source files to understand existing patterns:**
    - [use-role-matrix.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts>)
    - [use-role-matrix.test.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.test.ts>)
- [x] **Identify all files, services, and DB tables the task will touch:**
    - Modified hook: `use-role-matrix.ts`
    - New hooks: `use-role-matrix-search.ts`, `use-role-matrix-collapsing.ts`, `use-role-matrix-name-edit.ts`, `use-role-matrix-permissions.ts`
    - Test files: `use-role-matrix.test.ts`
    - DB tables: None.
- [x] **Determine if a Prisma migration is needed:** No.

---

## 1-3-1 Options

### Option 1: Inline Split into Independent Hooks Co-located in `_hooks/` (Recommended)

Split the single `useRoleMatrix` hook into 4 separate custom hooks: `useRoleMatrixSearch`, `useRoleMatrixCollapsing`, `useRoleMatrixNameEdit`, and `useRoleMatrixPermissions`. These will be co-located in the `_hooks/` directory, and `use-role-matrix.ts` will compose them.
**Tradeoff:** Achieves excellent separation of concerns, simplifies testing, and keeps the code highly readable without changing the public hook API or breaking the view.

### Option 2: Extract Non-State Helpers to a Presenter or Utility File

Extract helper functions and types (e.g., draft comparison, builders) but keep all state hooks inside the single `use-role-matrix.ts` file.
**Tradeoff:** Less new files to manage, but fails to modularize the hook states themselves, keeping the main hook large and difficult to read.

### Option 3: Local Zustand State Store

Migrate the state of the role matrix to a dedicated Zustand store.
**Tradeoff:** Highly structured state management, but introduces unnecessary boilerplate and store lifetime management for a single page view.

### Best Option

Choose **Option 1: Inline Split into Independent Hooks Co-located in `_hooks/`**. This directly meets the user's request for modularity across separate files while preserving full compatibility with the existing page components and test suite.

---

## Concrete Next Steps

1. Create [use-role-matrix-search.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-search.ts>) to manage search terms and roles/permissions queries.
2. Create [use-role-matrix-collapsing.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-collapsing.ts>) to manage category and module expanded/collapsed states.
3. Create [use-role-matrix-name-edit.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-name-edit.ts>) to handle custom role renaming mutation and UI state.
4. Create [use-role-matrix-permissions.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-permissions.ts>) to manage draft permissions, autosave effects, and replace/reset mutations.
5. Update `use-role-matrix.ts` to compose the sub-hooks and export the exact same return contract.
6. Verify that all existing unit tests pass.

---

## Phase 1: Create Search, Collapsing, and Name Editing Hooks

**Goal:** Extract the self-contained state concerns (search/queries, collapsing state, and role name editing) into separate sub-hook files.

- [x] Create [use-role-matrix-search.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-search.ts>) and implement query hooks + sorting logic.
- [x] Create [use-role-matrix-collapsing.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-collapsing.ts>) and implement collapse toggle state and automatic initialization when grouped permissions update.
- [x] Create [use-role-matrix-name-edit.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-name-edit.ts>) and implement state handlers for custom role renaming.
- [x] Write inline JSDoc for all new custom hooks.

**Migration required:** No.

---

## Phase 2: Create Permissions Hook and Compose useRoleMatrix

**Goal:** Extract draft/autosave logic and rebuild the orchestrating hook to compose all 4 sub-hooks.

- [x] Create [use-role-matrix-permissions.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix-permissions.ts>) and move `draftPermissionIdsByRoleId` management, in-flight mutation states, and autosave sync effects here.
- [x] Update [use-role-matrix.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts>) to call all 4 sub-hooks, merge their states (including combining `savingRoleIds` lists), and export the unified public interface.
- [x] Run `pnpm --dir app/sentinel-support exec vitest run "src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.test.ts"` to verify integration correctness.

**Migration required:** No.

---

## Done Criteria

- [x] The `useRoleMatrix` hook's public API is unchanged.
- [x] Separate files exist in the `_hooks/` folder for search, collapsing, renaming, and permission draft/saving.
- [x] All existing and new tests pass with no failures.
